const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');

// Analyser le code
router.post('/analyze', securityController.analyzeSecurityWithAI);

// Vérifier le service ML
router.get('/health', securityController.checkMLServiceHealth);

module.exports = router;
