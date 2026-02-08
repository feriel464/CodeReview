const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const { optionalAuth } = require('../Middleware/Authmiddleware');

// Récupérer les langages de programmation supportés
router.get('/programming-languages', analysisController.getProgrammingLanguages);

// Vérifier le statut invité
router.get('/guest-status', analysisController.getGuestStatus);

// Récupérer l'historique des analyses
router.get('/history', optionalAuth, analysisController.getAnalysisHistory);

// Récupérer les détails d'une analyse
router.get('/:id', optionalAuth, analysisController.getAnalysisDetails);

// Analyser du code (utilisateur connecté ou invité)
router.post('/', optionalAuth, analysisController.analyzeCode);

module.exports = router;