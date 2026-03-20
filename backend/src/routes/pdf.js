// routes/pdf.js
const express = require('express');
const router = express.Router();
const pdfUpload = require('../Middleware/pdfUpload');
const { analyzePDF } = require('../controllers/pdfController');
const { optionalAuth } = require('../middleware/Authmiddleware'); // ton middleware existant

router.post('/analyze-pdf', optionalAuth, pdfUpload.single('pdf'), analyzePDF);

module.exports = router;