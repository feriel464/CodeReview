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
    console.log('📥 Données reçues:', { codeLength: code?.length, language, fileName });
    
    console.log('🔍 DEBUG req.user:', req.user);
    console.log('🔍 DEBUG Authorization header:', req.headers.authorization);
    
    const userId = req.user?.id || null;
    const isGuest = !userId;
    const ipAddress = req.ip || req.connection.remoteAddress;

    console.log('👤 Mode:', isGuest ? 'INVITÉ ❌' : 'CONNECTÉ ✅', '| UserID:', userId);

    if (!code || !language) {
      return res.status(400).json({ success: false, message: 'Le code et le langage sont requis' });
    }

    // ── Détection du langage ──────────────────────────────
    const languageValidation = validateLanguage(code, language);
    console.log('🔬 Résultat détection:', {
      match: languageValidation.match,
      detected: languageValidation.detected,
      selected: language,
      confidence: languageValidation.confidence
    });

    if (!languageValidation.match && !languageValidation.uncertain) {
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
        detectedLanguageName,
        selectedLanguage: language,
        selectedLanguageName,
        confidence: Math.round(languageValidation.confidence * 100),
        indicators: languageValidation.indicators
      });
    }

    const langCheck = await pool.query(
      'SELECT id FROM programming_languages WHERE code = $1 AND is_active = true',
      [language]
    );

    if (langCheck.rows.length === 0) {
      return res.status(400).json({ success: false, message: `Langage de programmation non supporté: ${language}` });
    }

    await client.query('BEGIN');

    // ── Limite invité ─────────────────────────────────────
    if (isGuest) {
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
      if (analysisCount > GUEST_ANALYSIS_LIMIT) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          message: `Limite d'analyses atteinte (${GUEST_ANALYSIS_LIMIT}). Veuillez vous connecter pour continuer.`,
          requiresAuth: true,
          currentCount: analysisCount,
          limit: GUEST_ANALYSIS_LIMIT
        });
      }
    }

    // ── Créer le projet ───────────────────────────────────
    const projectResult = await client.query(
      `INSERT INTO projects (user_id, name, is_guest, guest_ip)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, fileName || `Analyse ${language}`, isGuest, isGuest ? ipAddress : null]
    );
    const projectId = projectResult.rows[0].id;

    // ── Stocker le code ───────────────────────────────────
    const codeVersionResult = await client.query(
      `INSERT INTO code_versions (project_id, code, programming_language, file_name, version_number)
       VALUES ($1, $2, $3, $4, 1) RETURNING id`,
      [projectId, code, language, fileName]
    );
    const codeVersionId = codeVersionResult.rows[0].id;

    // ── Analyser ──────────────────────────────────────────
    const analysisResult = await performCodeAnalysis(code, language);
    console.log('✅ Analyse terminée, score:', analysisResult.qualityScore);

    // ── Stocker les résultats ─────────────────────────────
    const resultInsert = await client.query(
      `INSERT INTO analysis_results (code_version_id, quality_score, improvements, code_smells, documentation, metrics)
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

    // ── Analyses restantes invité ─────────────────────────
    let remainingAnalyses = null;
    if (isGuest) {
      const usageCheck = await pool.query(
        'SELECT analysis_count FROM guest_usage WHERE ip_address = $1',
        [ipAddress]
      );
      const currentCount = usageCheck.rows[0].analysis_count;
      remainingAnalyses = Math.max(0, GUEST_ANALYSIS_LIMIT - currentCount);
    }

    res.json({
      success: true,
      message: 'Analyse terminée avec succès',
      data: {
        projectId,
        codeVersionId,
        analysisId:   resultInsert.rows[0].id,
        qualityScore: resultInsert.rows[0].quality_score,
        improvements: resultInsert.rows[0].improvements,
        codeSmells:   resultInsert.rows[0].code_smells,
        documentation:resultInsert.rows[0].documentation,
        metrics:      resultInsert.rows[0].metrics,
        analyzedAt:   resultInsert.rows[0].analyzed_at
      },
      isGuest,
      remainingAnalyses,
      languageDetection: languageValidation.uncertain
        ? { uncertain: true, message: languageValidation.message }
        : null
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur analyzeCode:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'analyse du code', error: error.message });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────
//  Analyse interne
// ─────────────────────────────────────────────────────────────
async function performCodeAnalysis(code, language) {
  try {
    const rawAnalysis = await analyzeCode(code, language);
    if (!rawAnalysis.success) {
      return {
        qualityScore: 0, improvements: [], codeSmells: [], errors: [],
        documentation: { coverage: 0, missingDocs: [] },
        metrics: calculateBasicMetrics(code)
      };
    }
    return {
      qualityScore:  rawAnalysis.qualityScore,
      improvements:  rawAnalysis.improvements  || [],
      codeSmells:    rawAnalysis.codeSmells    || [],
      errors:        rawAnalysis.errors        || [],
      documentation: generateDocumentation(code, language, rawAnalysis),
      metrics:       rawAnalysis.metrics       || calculateBasicMetrics(code),
      ...(rawAnalysis.score     !== undefined && { pylintScore: rawAnalysis.score }),
      ...(rawAnalysis.simulated && { simulated: true })
    };
  } catch (error) {
    return {
      qualityScore: 0,
      improvements: [{ type:'error', severity:'error', line:1, message:'Erreur lors de l\'analyse du code', suggestion: error.message }],
      codeSmells: [], errors: [],
      documentation: { coverage: 0, missingDocs: [] },
      metrics: calculateBasicMetrics(code)
    };
  }
}

function calculateBasicMetrics(code) {
  const lines = code.split('\n');
  return {
    lines:      lines.length,
    characters: code.length,
    codeLines:  lines.filter(l => l.trim().length > 0).length,
    emptyLines: lines.filter(l => l.trim().length === 0).length,
    functions:  (code.match(/function\s+\w+|def\s+\w+/g) || []).length,
    classes:    (code.match(/class\s+\w+/g) || []).length
  };
}

function generateDocumentation(code, language, analysis) {
  if (analysis.conventions) {
    const missingDocs = analysis.conventions
      .filter(c => c.symbol && c.symbol.includes('docstring'))
      .map(c => ({ type: 'function', name: c.obj || 'unknown', line: c.line, suggestion: c.message }));
    return { coverage: Math.max(0, 100 - missingDocs.length * 20), missingDocs };
  }
  const functionCount = (code.match(/function\s+\w+/g) || []).length;
  const commentCount  = (code.match(/\/\*\*[\s\S]*?\*\/|\/\/.*/g) || []).length;
  const coverage = functionCount > 0 ? Math.min(100, Math.round((commentCount / functionCount) * 100)) : 100;
  return {
    coverage,
    missingDocs: coverage < 100 ? [{ type:'function', name:'multiple', line:1, suggestion:'Ajoutez des commentaires pour documenter votre code' }] : []
  };
}

// ─────────────────────────────────────────────────────────────
//  Historique
// ─────────────────────────────────────────────────────────────

/**
 * Récupérer l'historique
 * GET /api/analyze/history
 */
exports.getAnalysisHistory = async (req, res) => {
  try {
    const userId    = req.user?.id;
    const ipAddress = req.ip || req.connection.remoteAddress;

    let query, params;

    if (userId) {
      query = `
        SELECT p.id as project_id, p.name as project_name, p.created_at,
               cv.programming_language, cv.file_name,
               ar.quality_score, ar.analyzed_at
        FROM projects p
        JOIN code_versions cv ON p.id = cv.project_id
        LEFT JOIN analysis_results ar ON cv.id = ar.code_version_id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
        LIMIT 50`;
      params = [userId];
    } else {
      query = `
        SELECT p.id as project_id, p.name as project_name, p.created_at,
               cv.programming_language, cv.file_name,
               ar.quality_score, ar.analyzed_at
        FROM projects p
        JOIN code_versions cv ON p.id = cv.project_id
        LEFT JOIN analysis_results ar ON cv.id = ar.code_version_id
        WHERE p.is_guest = true AND p.guest_ip = $1
        ORDER BY p.created_at DESC
        LIMIT 10`;
      params = [ipAddress];
    }

    const result = await pool.query(query, params);
    res.json({ success: true, history: result.rows });

  } catch (error) {
    console.error('❌ Erreur getAnalysisHistory:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'historique', error: error.message });
  }
};

/**
 * Supprimer UNE analyse (par project_id)
 * DELETE /api/analyze/history/:projectId
 */
exports.deleteHistoryItem = async (req, res) => {
  const client = await pool.connect();
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    // Vérifier que le projet appartient à cet utilisateur
    const ownerCheck = await client.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Projet non trouvé ou accès refusé' });
    }

    await client.query('BEGIN');

    // Ordre important : respecter les clés étrangères
    await client.query(
      `DELETE FROM analysis_results
       WHERE code_version_id IN (SELECT id FROM code_versions WHERE project_id = $1)`,
      [projectId]
    );
    await client.query('DELETE FROM code_versions WHERE project_id = $1', [projectId]);
    await client.query('DELETE FROM projects WHERE id = $1', [projectId]);

    await client.query('COMMIT');

    console.log(`🗑️ Projet ${projectId} supprimé pour user ${userId}`);
    res.json({ success: true, message: 'Analyse supprimée avec succès' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur deleteHistoryItem:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression', error: error.message });
  } finally {
    client.release();
  }
};

/**
 * Supprimer TOUT l'historique de l'utilisateur
 * DELETE /api/analyze/history
 */
exports.deleteAllHistory = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentification requise' });
    }

    await client.query('BEGIN');

    await client.query(
      `DELETE FROM analysis_results
       WHERE code_version_id IN (
         SELECT cv.id FROM code_versions cv
         JOIN projects p ON cv.project_id = p.id
         WHERE p.user_id = $1
       )`,
      [userId]
    );

    await client.query(
      `DELETE FROM code_versions
       WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)`,
      [userId]
    );

    const deleted = await client.query(
      'DELETE FROM projects WHERE user_id = $1 RETURNING id',
      [userId]
    );

    await client.query('COMMIT');

    console.log(`🗑️ ${deleted.rowCount} projet(s) supprimé(s) pour user ${userId}`);
    res.json({
      success: true,
      message: `Historique vidé — ${deleted.rowCount} analyse(s) supprimée(s)`,
      deletedCount: deleted.rowCount
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur deleteAllHistory:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression', error: error.message });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────
//  Autres exports
// ─────────────────────────────────────────────────────────────

/**
 * Détails d'une analyse
 * GET /api/analyze/:id
 */
exports.getAnalysisDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId    = req.user?.id;
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
      return res.status(404).json({ success: false, message: 'Analyse non trouvée ou accès refusé' });
    }

    const result = await pool.query(
      `SELECT ar.*, cv.code, cv.programming_language, cv.file_name, p.name as project_name
       FROM analysis_results ar
       JOIN code_versions cv ON ar.code_version_id = cv.id
       JOIN projects p ON cv.project_id = p.id
       WHERE ar.id = $1`,
      [id]
    );

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('❌ Erreur getAnalysisDetails:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des détails', error: error.message });
  }
};

/**
 * Statut invité
 * GET /api/analyze/guest-status
 */
exports.getGuestStatus = async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await pool.query(
      'SELECT analysis_count FROM guest_usage WHERE ip_address = $1',
      [ipAddress]
    );
    const currentCount = result.rows.length > 0 ? result.rows[0].analysis_count : 0;
    const remaining    = Math.max(0, GUEST_ANALYSIS_LIMIT - currentCount);
    res.json({ success: true, currentCount, limit: GUEST_ANALYSIS_LIMIT, remaining, hasReachedLimit: remaining === 0 });

  } catch (error) {
    console.error('❌ Erreur getGuestStatus:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la vérification du statut', error: error.message });
  }
};

/**
 * Langages de programmation
 * GET /api/analyze/programming-languages
 */
exports.getProgrammingLanguages = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT code, name, icon FROM programming_languages WHERE is_active = true ORDER BY name'
    );
    res.json({ success: true, languages: result.rows });

  } catch (error) {
    console.error('❌ Erreur getProgrammingLanguages:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des langages', error: error.message });
  }
};