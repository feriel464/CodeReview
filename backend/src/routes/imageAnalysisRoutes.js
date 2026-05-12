const express = require('express');
const router = express.Router();
const imageAnalysisController = require('../controllers/imageAnalysisController');
const { authMiddleware } = require('../Middleware/Authmiddleware'); 
console.log('authMiddleware =', authMiddleware);
router.post(
  '/analyze-image',
   authMiddleware, 
  imageAnalysisController.uploadImage,
  imageAnalysisController.analyzeFromImage
);
router.post('/fix-code',authMiddleware, imageAnalysisController.fixCode);
module.exports = router;
