const pool = require('../config/db');
const { validateLanguage, getLanguageName } = require('../utils/languageDetector');
const { analyzeCode, calculateMetrics } = require('../utils/codeAnalyzer');

// Limites pour les utilisateurs invités
const GUEST_ANALYSIS_LIMIT = 3;

/**
 * Analyser du code
 * POST /api/analyze
 */
exports.analyzeCode = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { code, language, fileName } = req.body;
    console.log('📥 Données reçues:', { 
      codeLength: code?.length, 
      language, 
      fileName 
    });
    
    // 🔧 DEBUG: Vérifier l'authentification
    console.log('🔍 DEBUG req.user:', req.user);
    console.log('🔍 DEBUG Authorization header:', req.headers.authorization);
    
    const userId = req.user?.id || null;
    const isGuest = !userId;
    const ipAddress = req.ip || req.connection.remoteAddress;

    console.log('👤 Mode:', isGuest ? 'INVITÉ ❌' : 'CONNECTÉ ✅', '| UserID:', userId);

    // Validation
    if (!code || !language) {
      console.log('❌ Validation échouée');
      return res.status(400).json({
        success: false,
        message: 'Le code et le langage sont requis'
      });
    }

    // =========================================
    // 🔍 DÉTECTION DU LANGAGE
    // =========================================
    console.log('🔍 Détection du langage du code...');
    const languageValidation = validateLanguage(code, language);
    
    console.log('🔬 Résultat détection:', {
      match: languageValidation.match,
      detected: languageValidation.detected,
      selected: language,
      confidence: languageValidation.confidence
    });

    // Si le langage ne correspond pas
    if (!languageValidation.match && !languageValidation.uncertain) {
      console.log('⚠️ Langage non correspondant détecté!');
      
      const detectedLangQuery = await pool.query(
        'SELECT code, name FROM programming_languages WHERE code = $1 AND is_active = true',
        [languageValidation.detected]
      );

      const selectedLangQuery = await pool.query(
        'SELECT code, name FROM programming_languages WHERE code = $1 AND is_active = true',
        [language]
      );

      const detectedLanguageName = detectedLangQuery.rows.length > 0 
        ? detectedLangQuery.rows[0].name 
        : getLanguageName(languageValidation.detected);

      const selectedLanguageName = selectedLangQuery.rows.length > 0
        ? selectedLangQuery.rows[0].name
        : getLanguageName(language);

      return res.status(400).json({
        success: false,
        languageMismatch: true,
        message: `Le code semble être du ${detectedLanguageName}, mais vous avez sélectionné ${selectedLanguageName}.`,
        detectedLanguage: languageValidation.detected,
        detectedLanguageName: detectedLanguageName,
        selectedLanguage: language,
        selectedLanguageName: selectedLanguageName,
        confidence: Math.round(languageValidation.confidence * 100),
        indicators: languageValidation.indicators
      });
    }

    // Vérifier si le langage de programmation est supporté
    console.log('🔍 Vérification du langage:', language);
    const langCheck = await pool.query(
      'SELECT id FROM programming_languages WHERE code = $1 AND is_active = true',
      [language]
    );

    if (langCheck.rows.length === 0) {
      console.log('❌ Langage non supporté:', language);
      return res.status(400).json({
        success: false,
        message: `Langage de programmation non supporté: ${language}`
      });
    }

    console.log('✅ Langage supporté');
    await client.query('BEGIN');
    console.log('✅ Transaction démarrée');

    // Si invité, vérifier la limite d'analyses
    if (isGuest) {
      console.log('👤 Mode invité détecté, IP:', ipAddress);
      const usageResult = await client.query(
        `INSERT INTO guest_usage (ip_address, analysis_count, last_analysis_at)
         VALUES ($1, 1, CURRENT_TIMESTAMP)
         ON CONFLICT (ip_address) 
         DO UPDATE SET 
           analysis_count = guest_usage.analysis_count + 1,
           last_analysis_at = CURRENT_TIMESTAMP
         RETURNING analysis_count`,
        [ipAddress]
      );

      const analysisCount = usageResult.rows[0].analysis_count;
      console.log('📊 Nombre d\'analyses:', analysisCount);

      if (analysisCount > GUEST_ANALYSIS_LIMIT) {
        await client.query('ROLLBACK');
        console.log('🚫 Limite atteinte');
        return res.status(403).json({
          success: false,
          message: `Limite d'analyses atteinte (${GUEST_ANALYSIS_LIMIT}). Veuillez vous connecter pour continuer.`,
          requiresAuth: true,
          currentCount: analysisCount,
          limit: GUEST_ANALYSIS_LIMIT
        });
      }
    } else {
      console.log('✅ Utilisateur connecté, pas de limite d\'analyses');
    }

    // Créer un projet
    console.log('📁 Création du projet...');
    const projectResult = await client.query(
      `INSERT INTO projects (user_id, name, is_guest, guest_ip)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        userId,
        fileName || `Analyse ${language}`,
        isGuest,
        isGuest ? ipAddress : null
      ]
    );

    const projectId = projectResult.rows[0].id;
    console.log('✅ Projet créé, ID:', projectId);

    // Stocker le code
    console.log('💾 Stockage du code...');
    const codeVersionResult = await client.query(
      `INSERT INTO code_versions (project_id, code, programming_language, file_name, version_number)
       VALUES ($1, $2, $3, $4, 1)
       RETURNING id`,
      [projectId, code, language, fileName]
    );

    const codeVersionId = codeVersionResult.rows[0].id;
    console.log('✅ Code stocké, ID:', codeVersionId);

    // ✅ FIX: Utiliser await pour récupérer le vrai résultat (était manquant avant)
    console.log('🔬 Analyse du code...');
    const analysisResult = await performCodeAnalysis(code, language);
    console.log('✅ Analyse terminée, score:', analysisResult.qualityScore);
    console.log('🎯 Résultat analyse:', JSON.stringify({
      qualityScore: analysisResult.qualityScore,
      improvementsCount: analysisResult.improvements?.length,
      codeSmellsCount: analysisResult.codeSmells?.length,
    }, null, 2));

    // Stocker les résultats d'analyse
    console.log('💾 Stockage des résultats...');
    const resultInsert = await client.query(
      `INSERT INTO analysis_results (
        code_version_id, 
        quality_score, 
        improvements, 
        code_smells, 
        documentation, 
        metrics
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, quality_score, improvements, code_smells, documentation, metrics, analyzed_at`,
      [
        codeVersionId,
        analysisResult.qualityScore,
        JSON.stringify(analysisResult.improvements),
        JSON.stringify(analysisResult.codeSmells),
        JSON.stringify(analysisResult.documentation),
        JSON.stringify(analysisResult.metrics)
      ]
    );

    await client.query('COMMIT');
    console.log('✅ Transaction confirmée');

    // Récupérer le nombre d'analyses restantes pour les invités
    let remainingAnalyses = null;
    if (isGuest) {
      const usageCheck = await pool.query(
        'SELECT analysis_count FROM guest_usage WHERE ip_address = $1',
        [ipAddress]
      );
      const currentCount = usageCheck.rows[0].analysis_count;
      remainingAnalyses = Math.max(0, GUEST_ANALYSIS_LIMIT - currentCount);
    }

    console.log('✅ Réponse envoyée au client');
    res.json({
      success: true,
      message: 'Analyse terminée avec succès',
      data: {
        projectId,
        codeVersionId,
        analysisId: resultInsert.rows[0].id,
        qualityScore: resultInsert.rows[0].quality_score,
        improvements: resultInsert.rows[0].improvements,
        codeSmells: resultInsert.rows[0].code_smells,
        documentation: resultInsert.rows[0].documentation,
        metrics: resultInsert.rows[0].metrics,
        analyzedAt: resultInsert.rows[0].analyzed_at
      },
      isGuest,
      remainingAnalyses,
      languageDetection: languageValidation.uncertain ? {
        uncertain: true,
        message: languageValidation.message
      } : null
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur analyzeCode:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'analyse du code',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * ✅ FIX: Déclaration avec "async function" (hoistée) au lieu de "const"
 * Analyse réelle du code avec ESLint/Pylint
 */
async function performCodeAnalysis(code, language) {
  try {
    console.log(`🔬 Analyse réelle du code ${language}...`);
    
    // Appeler le module d'analyse unifié
    const rawAnalysis = await analyzeCode(code, language);
    
    // Si l'analyse a échoué
    if (!rawAnalysis.success) {
      console.error('❌ Analyse échouée:', rawAnalysis.error);
      
      return {
        qualityScore: 0,
        improvements: [],
        codeSmells: [],
        errors: [],
        documentation: { coverage: 0, missingDocs: [] },
        metrics: calculateBasicMetrics(code)
      };
    }
    
    console.log(`✅ Analyse réussie! Score: ${rawAnalysis.qualityScore}/100`);
    
    // Formater les résultats pour le frontend
    return {
      qualityScore: rawAnalysis.qualityScore,
      improvements: rawAnalysis.improvements || [],
      codeSmells: rawAnalysis.codeSmells || [],
      errors: rawAnalysis.errors || [],
      documentation: generateDocumentation(code, language, rawAnalysis),
      metrics: rawAnalysis.metrics || calculateBasicMetrics(code),
      ...(rawAnalysis.score !== undefined && { pylintScore: rawAnalysis.score }),
      ...(rawAnalysis.simulated && { simulated: true })
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error);
    
    return {
      qualityScore: 0,
      improvements: [{
        type: 'error',
        severity: 'error',
        line: 1,
        message: 'Erreur lors de l\'analyse du code',
        suggestion: error.message
      }],
      codeSmells: [],
      errors: [],
      documentation: { coverage: 0, missingDocs: [] },
      metrics: calculateBasicMetrics(code)
    };
  }
}

/**
 * Calcule des métriques de base (fallback)
 */
function calculateBasicMetrics(code) {
  const lines = code.split('\n');
  
  return {
    lines: lines.length,
    characters: code.length,
    codeLines: lines.filter(l => l.trim().length > 0).length,
    emptyLines: lines.filter(l => l.trim().length === 0).length,
    functions: (code.match(/function\s+\w+|def\s+\w+/g) || []).length,
    classes: (code.match(/class\s+\w+/g) || []).length
  };
}

/**
 * Génère la documentation basée sur l'analyse
 */
function generateDocumentation(code, language, analysis) {
  // Si on a des infos de Pylint sur les docstrings
  if (analysis.conventions) {
    const missingDocs = analysis.conventions
      .filter(c => c.symbol && c.symbol.includes('docstring'))
      .map(c => ({
        type: 'function',
        name: c.obj || 'unknown',
        line: c.line,
        suggestion: c.message
      }));
    
    const coverage = Math.max(0, 100 - (missingDocs.length * 20));
    
    return {
      coverage,
      missingDocs
    };
  }
  
  // Estimation basique pour JavaScript
  const functionCount = (code.match(/function\s+\w+/g) || []).length;
  const commentCount = (code.match(/\/\*\*[\s\S]*?\*\/|\/\/.*/g) || []).length;
  
  const coverage = functionCount > 0 
    ? Math.min(100, Math.round((commentCount / functionCount) * 100))
    : 100;
  
  return {
    coverage,
    missingDocs: coverage < 100 ? [{
      type: 'function',
      name: 'multiple',
      line: 1,
      suggestion: 'Ajoutez des commentaires pour documenter votre code'
    }] : []
  };
}

/**
 * Récupérer l'historique des analyses
 */
exports.getAnalysisHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const ipAddress = req.ip || req.connection.remoteAddress;

    let query;
    let params;

    if (userId) {
      query = `
        SELECT 
          p.id as project_id,
          p.name as project_name,
          p.created_at,
          cv.programming_language,
          cv.file_name,
          ar.quality_score,
          ar.analyzed_at
        FROM projects p
        JOIN code_versions cv ON p.id = cv.project_id
        LEFT JOIN analysis_results ar ON cv.id = ar.code_version_id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
        LIMIT 50
      `;
      params = [userId];
    } else {
      query = `
        SELECT 
          p.id as project_id,
          p.name as project_name,
          p.created_at,
          cv.programming_language,
          cv.file_name,
          ar.quality_score,
          ar.analyzed_at
        FROM projects p
        JOIN code_versions cv ON p.id = cv.project_id
        LEFT JOIN analysis_results ar ON cv.id = ar.code_version_id
        WHERE p.is_guest = true AND p.guest_ip = $1
        ORDER BY p.created_at DESC
        LIMIT 10
      `;
      params = [ipAddress];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      history: result.rows
    });

  } catch (error) {
    console.error('❌ Erreur getAnalysisHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique',
      error: error.message
    });
  }
};

/**
 * Récupérer les détails d'une analyse
 */
exports.getAnalysisDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const ipAddress = req.ip || req.connection.remoteAddress;

    let authCheck;
    if (userId) {
      authCheck = await pool.query(
        `SELECT p.id FROM projects p
         JOIN code_versions cv ON p.id = cv.project_id
         JOIN analysis_results ar ON cv.id = ar.code_version_id
         WHERE ar.id = $1 AND p.user_id = $2`,
        [id, userId]
      );
    } else {
      authCheck = await pool.query(
        `SELECT p.id FROM projects p
         JOIN code_versions cv ON p.id = cv.project_id
         JOIN analysis_results ar ON cv.id = ar.code_version_id
         WHERE ar.id = $1 AND p.is_guest = true AND p.guest_ip = $2`,
        [id, ipAddress]
      );
    }

    if (authCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Analyse non trouvée ou accès refusé'
      });
    }

    const result = await pool.query(
      `SELECT 
        ar.*,
        cv.code,
        cv.programming_language,
        cv.file_name,
        p.name as project_name
       FROM analysis_results ar
       JOIN code_versions cv ON ar.code_version_id = cv.id
       JOIN projects p ON cv.project_id = p.id
       WHERE ar.id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Erreur getAnalysisDetails:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des détails',
      error: error.message
    });
  }
};

/**
 * Vérifier le statut invité
 */
exports.getGuestStatus = async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await pool.query(
      'SELECT analysis_count FROM guest_usage WHERE ip_address = $1',
      [ipAddress]
    );

    const currentCount = result.rows.length > 0 ? result.rows[0].analysis_count : 0;
    const remaining = Math.max(0, GUEST_ANALYSIS_LIMIT - currentCount);

    res.json({
      success: true,
      currentCount,
      limit: GUEST_ANALYSIS_LIMIT,
      remaining,
      hasReachedLimit: remaining === 0
    });

  } catch (error) {
    console.error('❌ Erreur getGuestStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du statut',
      error: error.message
    });
  }
};

/**
 * Récupérer les langages de programmation
 */
exports.getProgrammingLanguages = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT code, name, icon 
       FROM programming_languages 
       WHERE is_active = true 
       ORDER BY name`
    );

    res.json({
      success: true,
      languages: result.rows
    });

  } catch (error) {
    console.error('❌ Erreur getProgrammingLanguages:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des langages',
      error: error.message
    });
  }
};