// backend/controllers/chatController.js

const axios = require('axios');
const FormData = require('form-data');

const CHAT_SERVICE_URL = process.env.RUNPOD_URL || 'http://localhost:5003';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

// ─────────────────────────────────────────────────────────
//  Vérifie si RunPod est disponible
// ─────────────────────────────────────────────────────────
async function isRunpodAvailable() {
    try {
        await axios.get(`${CHAT_SERVICE_URL}/health`, { timeout: 3000 });
        return true;
    } catch {
        return false;
    }
}

// ─────────────────────────────────────────────────────────
//  Fallback DeepSeek — répond à une question sur du code
// ─────────────────────────────────────────────────────────
async function askDeepSeek(question, codeContext = '') {
    const systemPrompt = codeContext
        ? `Tu es un assistant expert en code. Voici le code sur lequel l'utilisateur pose des questions :\n\n${codeContext}`
        : `Tu es un assistant expert en analyse de code Python.`;

    const response = await axios.post(
        DEEPSEEK_URL,
        {
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: question }
            ],
            max_tokens: 1024
        },
        {
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type':  'application/json'
            },
            timeout: 30000
        }
    );

    return response.data.choices[0].message.content;
}

// ─────────────────────────────────────────────────────────
//  Stockage temporaire des sessions en fallback DeepSeek
//  (en mémoire — remplace par Redis/DB si besoin)
// ─────────────────────────────────────────────────────────
const fallbackSessions = new Map(); // session_id -> { code, filename }

// ─────────────────────────────────────────────────────────
//  POST /api/chat/index
//  Upload + indexation du fichier .py ou .zip
// ─────────────────────────────────────────────────────────
exports.indexFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Aucun fichier fourni'
            });
        }

        const runpodUp = await isRunpodAvailable();

        if (runpodUp) {
            console.log('✅ RunPod disponible — indexation via RunPod');
            const formData = new FormData();
            formData.append('file', req.file.buffer, req.file.originalname);

            const response = await axios.post(
                `${CHAT_SERVICE_URL}/index`,
                formData,
                { headers: formData.getHeaders(), timeout: 60000 }
            );

            return res.json({
                success:      true,
                session_id:   response.data.session_id,
                chunks_count: response.data.chunks_count,
                functions:    response.data.functions,
                classes:      response.data.classes,
                message:      response.data.message,
                source:       'runpod'
            });
        }

        console.log('⚠️  RunPod indisponible — fallback DeepSeek');

        const session_id = `deepseek_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const codeContent = req.file.buffer.toString('utf-8');

        function splitIntoChunks(code) {
            const lines = code.split('\n');
            const chunks = [];
            let current = [];

            for (const line of lines) {
                if (
                    (line.startsWith('def ') || 
                     line.startsWith('class ') || 
                     line.startsWith('async def ')) && 
                    current.length > 0
                ) {
                    chunks.push(current.join('\n'));
                    current = [];
                }
                current.push(line);
            }
            if (current.length > 0) chunks.push(current.join('\n'));
            return chunks.filter(c => c.trim().length > 0);
        }

        const chunks = splitIntoChunks(codeContent);

        fallbackSessions.set(session_id, {
            code:     codeContent,
            chunks:   chunks,
            filename: req.file.originalname
        });

        const analysisPrompt = `Analyse ce code Python et retourne UNIQUEMENT un JSON valide avec les clés "functions" (liste de noms de fonctions) et "classes" (liste de noms de classes). Code :\n\n${codeContent.slice(0, 4000)}`;
        let functions = [];
        let classes   = [];

        try {
            const analysis = await askDeepSeek(analysisPrompt);
            const cleaned  = analysis.replace(/```json|```/g, '').trim();
            const parsed   = JSON.parse(cleaned);
            functions = parsed.functions || [];
            classes   = parsed.classes   || [];
        } catch {
            // continue sans métadonnées
        }

        return res.json({
            success:      true,
            session_id,
            chunks_count: chunks.length,
            functions,
            classes,
            message:      `Fichier indexé via DeepSeek — ${chunks.length} chunks`,
            source:       'deepseek'
        });

    } catch (error) {
        console.error('❌ chatController.indexFile:', error.message);
        res.status(500).json({
            success: false,
            message: "Erreur lors de l'indexation du fichier",
            error:   error.message
        });
    }
};

// ─────────────────────────────────────────────────────────
//  POST /api/chat/ask
//  Poser une question sur le code indexé
// ─────────────────────────────────────────────────────────
exports.askQuestion = async (req, res) => {
    try {
        const { session_id, question } = req.body;

        if (!session_id || !question) {
            return res.status(400).json({
                success: false,
                message: 'session_id et question sont requis'
            });
        }

        // ── Si c'est une session DeepSeek (fallback) ──
        if (session_id.startsWith('deepseek_')) {
            const session = fallbackSessions.get(session_id);
            if (!session) {
                return res.status(404).json({
                    success: false,
                    message: "Session non trouvée. Indexez d'abord un fichier."
                });
            }

            console.log('⚠️  Réponse via DeepSeek (session fallback)');
            const answer = await askDeepSeek(question, session.code.slice(0, 6000));

            return res.json({
                success:     true,
                answer,
                chunks_used: 1,
                source:      'deepseek'
            });
        }

        // ── Session RunPod : essaye RunPod, sinon DeepSeek ──
        const runpodUp = await isRunpodAvailable();

        if (runpodUp) {
            console.log('✅ RunPod disponible — réponse via RunPod');
            const response = await axios.post(
                `${CHAT_SERVICE_URL}/chat`,
                { session_id, question },
                { timeout: 60000 }
            );

            return res.json({
                success:     true,
                answer:      response.data.answer,
                chunks_used: response.data.chunks_used,
                source:      response.data.source || 'runpod'
            });
        }

        // RunPod coupé après indexation — répond avec DeepSeek sans contexte
        console.log('⚠️  RunPod indisponible — fallback DeepSeek sans contexte');
        const answer = await askDeepSeek(question);

        return res.json({
            success:     true,
            answer,
            chunks_used: 0,
            source:      'deepseek_no_context'
        });

    } catch (error) {
        console.error('❌ chatController.askQuestion:', error.message);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la génération de la réponse",
            error:   error.message
        });
    }
};

// ─────────────────────────────────────────────────────────
//  DELETE /api/chat/session/:session_id
//  Supprimer une session
// ─────────────────────────────────────────────────────────
exports.deleteSession = async (req, res) => {
    try {
        const { session_id } = req.params;

        // Nettoie la session fallback si elle existe
        if (fallbackSessions.has(session_id)) {
            fallbackSessions.delete(session_id);
        }

        // Essaye aussi de supprimer côté RunPod
        try {
            await axios.delete(`${CHAT_SERVICE_URL}/session/${session_id}`, { timeout: 5000 });
        } catch {
            // RunPod éteint — pas grave
        }

        res.json({
            success: true,
            message: 'Session supprimée'
        });

    } catch (error) {
        console.error('❌ chatController.deleteSession:', error.message);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression de la session",
            error:   error.message
        });
    }
};
