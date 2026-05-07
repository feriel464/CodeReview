const axios = require('axios');

const ML_API_URL = 'http://ml-service:8000';

/**
 * Analyser le code pour détecter les vulnérabilités avec l'IA
 */
exports.analyzeSecurityWithAI = async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        success: false,
        message: 'Code et langage requis'
      });
    }

    // Appeler l'API Python
    const response = await axios.post(`${ML_API_URL}/analyze`, {
      code,
      language
    }, {
      timeout: 30000 // 30 secondes
    });

    const result = response.data;

    // Sauvegarder en base de données (optionnel)
    // await SecurityAnalysis.create({
    //   code,
    //   language,
    //   vulnerable: result.vulnerable,
    //   type: result.type,
    //   severity: result.severity,
    //   confidence: result.confidence
    // });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Erreur analyse sécurité :', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'analyse de sécurité',
      error: error.message
    });
  }
};

/**
 * Vérifier le statut de l'API ML
 */
exports.checkMLServiceHealth = async (req, res) => {
  try {
    const response = await axios.get(`${ML_API_URL}/health`, {
      timeout: 5000
    });

    res.json({
      success: true,
      ml_service: response.data
    });

  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service ML indisponible',
      error: error.message
    });
  }
};
