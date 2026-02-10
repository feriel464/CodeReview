const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const { authMiddleware, optionalAuth } = require('../Middleware/Authmiddleware');

// =========================================
// ROUTES PUBLIQUES (sans authentification)
// =========================================

// Récupérer les langages de programmation supportés
router.get('/programming-languages', analysisController.getProgrammingLanguages);

// Vérifier le statut invité
router.get('/guest-status', analysisController.getGuestStatus);

// =========================================
// ROUTES AVEC AUTHENTIFICATION OPTIONNELLE
// (accessible aux utilisateurs connectés ET invités)
// =========================================

// ✅ CORRECTION PRINCIPALE: Utiliser optionalAuth au lieu de authMiddleware
// Cela permet aux invités ET aux utilisateurs connectés d'analyser du code
router.post('/', optionalAuth, analysisController.analyzeCode);

// =========================================
// ROUTES PROTÉGÉES (authentification requise)
// =========================================

// Récupérer l'historique des analyses (seulement pour utilisateurs connectés)
router.get('/history', authMiddleware, analysisController.getAnalysisHistory);

// Récupérer les détails d'une analyse
router.get('/:id', authMiddleware, analysisController.getAnalysisDetails);

module.exports = router;