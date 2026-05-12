const axios = require('axios');

// ✅ URL HuggingFace depuis variable d'environnement
const ML_API_URL = process.env.ML_SERVICE_URL || process.env.ML_API_URL;

exports.analyzeSecurityWithAI = async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        success: false,
        message: 'Code et langage requis'
      });
    }

    // ✅ Si pas d'URL configurée, retour gracieux
    if (!ML_API_URL) {
      console.warn('⚠️ ML_SERVICE_URL non configurée');
      return res.json({
        success: true,
        vulnerable: false,
        vulnerabilities: [],
        securityScore: null,
        summary: 'Service ML non configuré',
      });
    }

    const response = await axios.post(
      `${ML_API_URL}/analyze`,
      { code, language },
      { timeout: 30000 }
    );

    const result = response.data;

    // ✅ Retourne directement le résultat HF sans wrapper
    res.json({
      success: true,
      vulnerable:            result.vulnerable            || false,
      vulnerabilities:       result.vulnerabilities       || [],
      total_vulnerabilities: result.total_vulnerabilities || 0,
      message:               result.message               || '',
      language:              result.language              || language,
    });

  } catch (error) {
    console.error('❌ Erreur analyse sécurité:', error.message);

    // ✅ Retour gracieux au lieu d'erreur 500
    res.json({
      success:         true,
      vulnerable:      false,
      vulnerabilities: [],
      securityScore:   null,
      summary:         'Service de sécurité indisponible',
      error:           error.message,
    });
  }
};

exports.checkMLServiceHealth = async (req, res) => {
  try {
    if (!ML_API_URL) {
      return res.status(503).json({
        success: false,
        message: 'ML_SERVICE_URL non configurée'
      });
    }

    const response = await axios.get(
      `${ML_API_URL}/health`,
      { timeout: 5000 }
    );

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