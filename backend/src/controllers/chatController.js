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
//  RunPod — lance un job et attend le résultat
//  Retourne null si erreur → fallback DeepSeek
// ─────────────────────────────────────────────────────────
async function runpodRequest(input) {
    try {
        const runRes = await axios.post(
            `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`,
            { input },
            {
                headers: {
                    'Authorization': `Bearer ${RUNPOD_API_KEY}`,
                    'Content-Type':  'application/json'
                },
                timeout: 30000
            }
        );

        const jobId = runRes.data.id;
        console.log('🔄 RunPod job lancé:', jobId);

        for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 5000));

            const statusRes = await axios.get(
                `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/status/${jobId}`,
                {
                    headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` },
                    timeout: 10000
                }
            );

            const status = statusRes.data.status;
            console.log(`⏳ Job ${jobId} status: ${status}`);

            if (status === 'COMPLETED') return statusRes.data.output;
            if (status === 'FAILED') {
                console.log('❌ RunPod job failed — fallback DeepSeek');
                return null;
            }
        }

        console.log('❌ RunPod timeout — fallback DeepSeek');
        return null;

    } catch (error) {
        console.log('❌ RunPod erreur — fallback DeepSeek:', error.message);
        return null;
    }
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
        console.log('📁 indexFile appelé — file:', req.file?.originalname);

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Aucun fichier fourni'
            });
        }

        const codeContent = req.file.buffer.toString('utf-8');
        const runpodUp    = await isRunpodAvailable();
        let result        = null;

        if (runpodUp) {
            console.log('✅ RunPod Serverless — indexation');
            result = await runpodRequest({
                action:      'index',
                source_code: codeContent,
                filename:    req.file.originalname
            });
        }

        // ── RunPod OK ──
        if (result) {
            console.log('RunPod result:', JSON.stringify(result));
            return res.json({
                success:      true,
                session_id:   result.session_id,
                chunks_count: result.chunks_count || 0,
                functions:    result.functions    || [],
                classes:      result.classes      || [],
                message:      `${result.chunks_count || 0} chunks indexés`,
                source:       'runpod'
            });
        }

        // ── Fallback DeepSeek ──
        console.log('⚠️ Fallback DeepSeek — indexation');

        const session_id = `deepseek_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

        let functions = [];
        let classes   = [];

        try {
            const analysisPrompt = `Analyse ce code Python et retourne UNIQUEMENT un JSON valide avec les clés "functions" et "classes". Code :\n\n${codeContent.slice(0, 4000)}`;
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
            console.log('⚠️ Réponse via DeepSeek (session fallback)');
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
        let result     = null;

        if (runpodUp) {
            console.log('✅ RunPod Serverless — réponse');
            result = await runpodRequest({
                action:     'chat',
                session_id,
                question,
                max_tokens: 512
            });
        }

        // ── RunPod OK ──
        if (result) {
            console.log('RunPod result:', JSON.stringify(result));
            return res.json({
                success:     true,
                answer:      result.answer,
                chunks_used: result.chunks_used || [],
                source:      result.source      || 'fine-tuned'
            });
        }

        // ── Fallback DeepSeek ──
        console.log('⚠️ Fallback DeepSeek — réponse sans contexte RunPod');
        const answer = await askDeepSeek(question);
        return res.json({
            success:     true,
            answer,
            chunks_used: 0,
            source:      'deepseek'
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
        res.json({ success: true, message: 'Session supprimée' });
    } catch (error) {
        console.error('❌ chatController.deleteSession:', error.message);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression de la session",
            error:   error.message
        });
    }
};