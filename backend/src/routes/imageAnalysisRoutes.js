const express = require('express');
const router = express.Router();
const imageAnalysisController = require('../controllers/imageAnalysisController');
const { authenticate } = require('../middleware/Authmiddleware'); // Optionnel

router.post(
  '/analyze-image',
  imageAnalysisController.uploadImage,
  imageAnalysisController.analyzeFromImage
);

module.exports = router;