// backend/controllers/chatController.js

const axios = require('axios');

const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;
const RUNPOD_API_KEY     = process.env.RUNPOD_API_KEY;
const DEEPSEEK_API_KEY   = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL       = 'https://api.deepseek.com/v1/chat/completions';

// ─────────────────────────────────────────────────────────
//  Vérifie si RunPod est disponible
// ─────────────────────────────────────────────────────────
async function isRunpodAvailable() {
    return !!(RUNPOD_ENDPOINT_ID && RUNPOD_API_KEY);
}

// ─────────────────────────────────────────────────────────
//  Fallback DeepSeek
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
//  Sessions fallback DeepSeek (en mémoire)
// ─────────────────────────────────────────────────────────
const fallbackSessions = new Map();

// ─────────────────────────────────────────────────────────
//  POST /api/chat/index
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
            console.log('✅ RunPod Serverless — indexation');
            const codeContent = req.file.buffer.toString('utf-8');

            const response = await axios.post(
                `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/runsync`,
                {
                    input: {
                        action:      'index',
                        source_code: codeContent,
                        filename:    req.file.originalname
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
                        'Content-Type':  'application/json'
                    },
                    timeout: 120000
                }
            );

const result = response.data.output || response.data;
console.log('RunPod response:', JSON.stringify(response.data));
return res.json({
    success:      true,
    session_id:   result.session_id,
    chunks_count: result.chunks_count   || 0,
    functions:    result.functions      || [],
    classes:      result.classes        || [],
    message:      `${result.chunks_count || 0} chunks indexés`,
    source:       'runpod'
});
        }

        // ── Fallback DeepSeek ──
        console.log('⚠️  RunPod indisponible — fallback DeepSeek');

        const session_id  = `deepseek_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const fallbackCode = req.file.buffer.toString('utf-8');

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

        const chunks = splitIntoChunks(fallbackCode);

        fallbackSessions.set(session_id, {
            code:     fallbackCode,
            chunks:   chunks,
            filename: req.file.originalname
        });

        const analysisPrompt = `Analyse ce code Python et retourne UNIQUEMENT un JSON valide avec les clés "functions" (liste de noms de fonctions) et "classes" (liste de noms de classes). Code :\n\n${fallbackCode.slice(0, 4000)}`;
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

        // ── Session DeepSeek fallback ──
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

        // ── Session RunPod ──
        const runpodUp = await isRunpodAvailable();

        if (runpodUp) {
            console.log('✅ RunPod Serverless — réponse');
            const response = await axios.post(
                `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/runsync`,
                {
                    input: {
                        action:     'chat',
                        session_id,
                        question,
                        max_tokens: 512
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
                        'Content-Type':  'application/json'
                    },
                    timeout: 120000
                }
            );

            const result = response.data.output || response.data;
            console.log('RunPod response:', JSON.stringify(response.data));
            return res.json({
                success:     true,
                answer:      result.answer,
                chunks_used: result.chunks_used,
                source:      result.source || 'fine-tuned'
            });
        }

        // ── Fallback DeepSeek sans contexte ──
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
// ─────────────────────────────────────────────────────────
exports.deleteSession = async (req, res) => {
    try {
        const { session_id } = req.params;

        if (fallbackSessions.has(session_id)) {
            fallbackSessions.delete(session_id);
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