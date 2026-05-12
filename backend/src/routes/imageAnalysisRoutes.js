const express = require('express');
const router = express.Router();
const axios = require('axios');
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
// ── Health OCR ──────────────────────────────────────
router.get('/health', async (req, res) => {
    try {
        const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://ocr-service:8001';
        const response = await axios.get(`${OCR_SERVICE_URL}/health`, { timeout: 5000 });
        res.json({
            success: true,
            ocr_service: response.data
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'Service OCR indisponible',
            error: error.message
        });
    }
});
module.exports = router;
