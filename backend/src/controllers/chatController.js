// backend/controllers/chatController.js

const axios = require('axios');
const FormData = require('form-data');

const CHAT_SERVICE_URL = process.env.RUNPOD_URL || 'http://localhost:5003';

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

        const formData = new FormData();
        formData.append('file', req.file.buffer, req.file.originalname);

        const response = await axios.post(
            `${CHAT_SERVICE_URL}/index`,
            formData,
            { headers: formData.getHeaders() }
        );

        res.json({
            success:      true,
            session_id:   response.data.session_id,
            chunks_count: response.data.chunks_count,
            functions:    response.data.functions,
            classes:      response.data.classes,
            message:      response.data.message
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

        const response = await axios.post(`${CHAT_SERVICE_URL}/chat`, {
            session_id,
            question
        });

        res.json({
            success:     true,
            answer:      response.data.answer,
            chunks_used: response.data.chunks_used,
            source:      response.data.source
        });

    } catch (error) {
        console.error('❌ chatController.askQuestion:', error.message);

        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                message: "Session non trouvée. Indexez d'abord un fichier."
            });
        }

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

        await axios.delete(`${CHAT_SERVICE_URL}/session/${session_id}`);

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