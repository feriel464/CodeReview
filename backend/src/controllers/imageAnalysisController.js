const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');
const FormData = require('form-data');
const streamifier = require('streamifier');

// Configuration Multer pour stockage en mémoire (pas de fichier local)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Seules les images sont acceptées'));
    }
    cb(null, true);
  }
});

// URLs des services
const OCR_SERVICE_URL = 'http://localhost:5002';
const ML_SERVICE_URL = 'http://localhost:5001';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * Upload image vers Cloudinary depuis le buffer en mémoire
 */
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'code-images',
        resource_type: 'image',
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Analyser le code depuis une image
 */
exports.analyzeFromImage = async (req, res) => {
  try {
    const { language } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucune image fournie'
      });
    }

    const imageBuffer = req.file.buffer;
    console.log('📸 Analyse d\'image démarrée...');
    console.log('📁 Taille:', (imageBuffer.length / 1024).toFixed(2), 'KB');

    // ════════════════════════════════════════════════════
    // 1. UPLOAD SUR CLOUDINARY (depuis buffer)
    // ════════════════════════════════════════════════════
    
    console.log('☁️  Upload sur Cloudinary...');
    
    const cloudinaryResult = await uploadToCloudinary(imageBuffer);
    const imageUrl = cloudinaryResult.secure_url;
    
    console.log(`✅ Image uploadée : ${imageUrl}`);

    // ════════════════════════════════════════════════════
    // 2. EXTRACTION OCR (envoyer le buffer au service Python)
    // ════════════════════════════════════════════════════
    
    console.log('🔍 Extraction du code avec OCR...');
    
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    formData.append('language', language || 'python');

    let ocrResponse;
    try {
      ocrResponse = await axios.post(
        `${OCR_SERVICE_URL}/extract-code`,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },
          timeout: 60000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        }
      );
    } catch (ocrError) {
      console.error('❌ Erreur OCR Service:', ocrError.message);
      
      if (ocrError.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          message: 'Service OCR indisponible. Assurez-vous que le service Python tourne sur le port 5002.',
          imageUrl
        });
      }
      
      throw ocrError;
    }

    const extractedCode = ocrResponse.data.code;
    const ocrConfidence = ocrResponse.data.confidence;

    console.log(`✅ Code extrait (${extractedCode.length} caractères)`);
    console.log(`📊 Confiance OCR : ${ocrConfidence}%`);

    if (!extractedCode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Aucun code détecté dans l\'image',
        imageUrl,
        ocrConfidence
      });
    }

    // ════════════════════════════════════════════════════
    // 3. ANALYSE AVEC DEEPSEEK (Qualité + Code Smells)
    // ════════════════════════════════════════════════════
    
    console.log('🤖 Analyse avec DeepSeek...');
    
    let deepseekAnalysis;
    
    try {
      const deepseekResponse = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `Tu es un expert en analyse de code. Analyse le code fourni et retourne UNIQUEMENT un JSON valide avec cette structure exacte :
{
  "score": <nombre entre 0 et 100>,
  "improvements": [
    {"line": <numéro>, "message": "...", "suggestion": "...", "severity": "error|warning|info"}
  ],
  "codeSmells": [
    {"line": <numéro>, "message": "...", "severity": "error|warning|refactor"}
  ],
  "correctedCode": "<code corrigé>",
  "summary": "Résumé des problèmes détectés"
}

Ne retourne RIEN d'autre que ce JSON. Pas de texte avant ou après.`
            },
            {
              role: 'user',
              content: `Analyse ce code ${language} extrait par OCR (peut contenir des erreurs de formatage) :\n\n${extractedCode}`
            }
          ],
          temperature: 0.3,
          max_tokens: 4000
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const content = deepseekResponse.data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      deepseekAnalysis = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      
      console.log(`✅ Analyse DeepSeek : Score ${deepseekAnalysis.score}/100`);
      
    } catch (deepseekError) {
      console.error('⚠️  Erreur DeepSeek (non-bloquant) :', deepseekError.message);
      
      deepseekAnalysis = {
        score: 50,
        improvements: [{
          line: 1,
          message: 'Service DeepSeek indisponible',
          suggestion: 'Réessayez plus tard',
          severity: 'warning'
        }],
        codeSmells: [],
        correctedCode: extractedCode,
        summary: 'Analyse DeepSeek temporairement indisponible'
      };
    }

    // ════════════════════════════════════════════════════
    // 4. ANALYSE DE SÉCURITÉ (Modèle IA)
    // ════════════════════════════════════════════════════
    
    console.log('🔒 Analyse de sécurité...');
    
    let securityAnalysis;
    try {
      const securityResponse = await axios.post(
        `${ML_SERVICE_URL}/analyze`,
        {
          code: deepseekAnalysis.correctedCode || extractedCode,
          language: language || 'python'
        },
        { timeout: 30000 }
      );
      
      securityAnalysis = securityResponse.data;
      console.log(`✅ Sécurité : ${securityAnalysis.vulnerable ? securityAnalysis.type : 'Aucune vulnérabilité'}`);
      
    } catch (securityError) {
      console.error('⚠️  Erreur API ML (non-bloquant) :', securityError.message);
      
      securityAnalysis = {
        success: false,
        vulnerable: false,
        type: 'safe',
        severity: 'none',
        confidence: 0,
        message: 'Service ML indisponible',
        vulnerable_lines: []
      };
    }

    // ════════════════════════════════════════════════════
    // 5. FUSION DES RÉSULTATS
    // ════════════════════════════════════════════════════
    
    const finalResult = {
      success: true,
      imageUrl,
      ocrConfidence,
      extractedCode,
      correctedCode: deepseekAnalysis.correctedCode || extractedCode,
      language: language || 'python',
      analysis: {
        score: deepseekAnalysis.score,
        improvements: deepseekAnalysis.improvements || [],
        codeSmells: deepseekAnalysis.codeSmells || [],
        summary: deepseekAnalysis.summary || '',
        security: securityAnalysis
      }
    };

    console.log('✅ Analyse terminée avec succès !');
    console.log('📊 Résumé: Score', deepseekAnalysis.score, '| OCR', ocrConfidence + '%', '| Sécurité', securityAnalysis.type);

    // Sauvegarder en base de données (optionnel)
    // if (req.user) {
    //   await Analysis.create({ userId: req.user.id, imageUrl, ... });
    // }

    res.json(finalResult);

  } catch (error) {
    console.error('❌ Erreur analyse image :', error.message);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'analyse de l\'image',
      error: error.message
    });
  }
  // Plus besoin de nettoyer les fichiers locaux !
};

// Exporter le middleware upload
exports.uploadImage = upload.single('image');