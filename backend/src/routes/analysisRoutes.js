const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const { authMiddleware, optionalAuth } = require('../Middleware/Authmiddleware');

// =========================================
// ROUTES PUBLIQUES (sans authentification)
// =========================================

router.get('/programming-languages', analysisController.getProgrammingLanguages);
router.get('/guest-status', analysisController.getGuestStatus);

// =========================================
// ROUTES AVEC AUTH OPTIONNELLE
// =========================================

router.post('/', optionalAuth, analysisController.analyzeCode);

// =========================================
// ROUTES PROTÉGÉES
// =========================================

// Historique : récupérer
router.get('/history', authMiddleware, analysisController.getAnalysisHistory);

// Historique : supprimer TOUT
router.delete('/history', authMiddleware, analysisController.deleteAllHistory);

// Historique : supprimer UN projet
router.delete('/history/:projectId', authMiddleware, analysisController.deleteHistoryItem);

// Détails d'une analyse
router.get('/:id', authMiddleware, analysisController.getAnalysisDetails);

module.exports = router;