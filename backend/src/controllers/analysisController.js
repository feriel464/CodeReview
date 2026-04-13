const pool = require('../config/db');
const { validateLanguage, getLanguageName } = require('../utils/languageDetector');
const { analyzeCode, calculateMetrics } = require('../utils/codeAnalyzer');
const axios = require('axios');

const GUEST_ANALYSIS_LIMIT = 3;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// ─────────────────────────────────────────────────────────────
//  POST /api/analyze
// ─────────────────────────────────────────────────────────────
exports.analyzeCode = async (req, res) => {
  const client = await pool.connect();

  try {
    const { code, language, fileName } = req.body;
    console.log('📥 Données reçues:', { codeLength: code?.length, language, fileName });
    console.log('🔍 DEBUG req.user:', req.user);
    console.log('🔍 DEBUG Authorization header:', req.headers.authorization);

    const userId    = req.user?.id || null;
    const isGuest   = !userId;
    const ipAddress = req.ip || req.connection.remoteAddress;

    console.log('👤 Mode:', isGuest ? 'INVITÉ ❌' : 'CONNECTÉ ✅', '| UserID:', userId);

    if (!code || !language) {
      return res.status(400).json({ success: false, message: 'Le code et le langage sont requis' });
    }

    // ── Détection du langage ──────────────────────────────────
    const languageValidation = validateLanguage(code, language);
    console.log('🔬 Résultat détection:', {
      match:      languageValidation.match,
      detected:   languageValidation.detected,
      selected:   language,
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
        success:              false,
        languageMismatch:     true,
        message:              `Le code semble être du ${detectedLanguageName}, mais vous avez sélectionné ${selectedLanguageName}.`,
        detectedLanguage:     languageValidation.detected,
        detectedLanguageName,
        selectedLanguage:     language,
        selectedLanguageName,
        confidence:           Math.round(languageValidation.confidence * 100),
        indicators:           languageValidation.indicators
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

    // ── Limite invité ─────────────────────────────────────────
    if (isGuest) {
      const usageResult = await client.query(
        `INSERT INTO guest_usage (ip_address, analysis_count, last_analysis_at)
         VALUES ($1, 1, CURRENT_TIMESTAMP)
         ON CONFLICT (ip_address)
         DO UPDATE SET
           analysis_count    = guest_usage.analysis_count + 1,
           last_analysis_at  = CURRENT_TIMESTAMP
         RETURNING analysis_count`,
        [ipAddress]
      );

      const analysisCount = usageResult.rows[0].analysis_count;
      if (analysisCount > GUEST_ANALYSIS_LIMIT) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success:        false,
          message:        `Limite d'analyses atteinte (${GUEST_ANALYSIS_LIMIT}). Veuillez vous connecter pour continuer.`,
          requiresAuth:   true,
          currentCount:   analysisCount,
          limit:          GUEST_ANALYSIS_LIMIT
        });
      }
    }

    // ── Créer le projet ───────────────────────────────────────
    const projectResult = await client.query(
      `INSERT INTO projects (user_id, name, is_guest, guest_ip)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, fileName || `Analyse ${language}`, isGuest, isGuest ? ipAddress : null]
    );
    const projectId = projectResult.rows[0].id;

    // ── Stocker le code ───────────────────────────────────────
    const codeVersionResult = await client.query(
      `INSERT INTO code_versions (project_id, code, programming_language, file_name, version_number)
       VALUES ($1, $2, $3, $4, 1) RETURNING id`,
      [projectId, code, language, fileName]
    );
    const codeVersionId = codeVersionResult.rows[0].id;

    // ── Analyser ──────────────────────────────────────────────
    const analysisResult = await performCodeAnalysis(code, language);
    console.log('✅ Analyse terminée, score:', analysisResult.qualityScore);

    // ── Stocker les résultats ─────────────────────────────────
    const resultInsert = await client.query(
  `INSERT INTO analysis_results 
    (code_version_id, quality_score, improvements, code_smells, documentation, metrics, vulnerabilities)
   VALUES ($1, $2, $3, $4, $5, $6, $7)
   RETURNING id, quality_score, improvements, code_smells, documentation, metrics, vulnerabilities, analyzed_at`,
  [
    codeVersionId,
    analysisResult.qualityScore,
    JSON.stringify(analysisResult.improvements),
    JSON.stringify(analysisResult.codeSmells),
    JSON.stringify(analysisResult.documentation),
    JSON.stringify(analysisResult.metrics),
    JSON.stringify(analysisResult.vulnerabilities || []),
  ]
);

    await client.query('COMMIT');

    // ── Analyses restantes invité ─────────────────────────────
    let remainingAnalyses = null;
    if (isGuest) {
      const usageCheck = await pool.query(
        'SELECT analysis_count FROM guest_usage WHERE ip_address = $1',
        [ipAddress]
      );
      const currentCount    = usageCheck.rows[0].analysis_count;
      remainingAnalyses = Math.max(0, GUEST_ANALYSIS_LIMIT - currentCount);
    }

    res.json({
      success: true,
      message: 'Analyse terminée avec succès',
      data: {
        projectId,
        codeVersionId,
        analysisId:    resultInsert.rows[0].id,
        qualityScore:  resultInsert.rows[0].quality_score,
        improvements:  resultInsert.rows[0].improvements,
        codeSmells:    resultInsert.rows[0].code_smells,
        documentation: resultInsert.rows[0].documentation,
        metrics:       resultInsert.rows[0].metrics,
        analyzedAt:    resultInsert.rows[0].analyzed_at
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
    res.status(500).json({ success: false, message: "Erreur lors de l'analyse du code", error: error.message });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/analyze/apply-corrections  ← NOUVEAU
// ─────────────────────────────────────────────────────────────
exports.applyCorrections = async (req, res) => {
  try {
    const { code, language, improvements, codeSmells, vulnerabilities } = req.body;

    if (!code || !language) {
      return res.status(400).json({ success: false, message: 'Code et langage requis' });
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(500).json({ success: false, message: 'DEEPSEEK_API_KEY manquante dans .env' });
    }

    const codeLines = code.split('\n');
    const problemLines = [];

    // ── Improvements ─────────────────────────────────────────
    if (Array.isArray(improvements) && improvements.length > 0) {
      improvements.forEach(i => {
        const lineContent = i.line ? codeLines[i.line - 1]?.trim() : null;
        problemLines.push(
          `- [${i.severity || 'warning'}] Ligne ${i.line || '?'}: ${i.message}` +
          (lineContent ? `\n  CODE EXACT: \`${lineContent}\`` : '') +
          (i.suggestion ? `\n  CORRECTION ATTENDUE: ${i.suggestion}` : '')
        );
      });
    }

    // ── Code smells ───────────────────────────────────────────
    if (Array.isArray(codeSmells) && codeSmells.length > 0) {
      codeSmells.forEach(s => {
        const lineContent = s.line ? codeLines[s.line - 1]?.trim() : null;
        problemLines.push(
          `- [smell/${s.severity || 'warning'}] Ligne ${s.line || '?'}: ${s.message}` +
          (lineContent ? `\n  CODE EXACT: \`${lineContent}\`` : '') +
          (s.variable ? `\n  RÈGLE VIOLÉE: ${s.variable}` : '')
        );
      });
    }

    // ── Vulnérabilités ────────────────────────────────────────
    if (Array.isArray(vulnerabilities) && vulnerabilities.length > 0) {
      vulnerabilities.forEach(v => {
        const vulnLines = (v.lines || [])
          .map(l => `  → Ligne ${l.line}: \`${l.code}\`${l.explanation ? ` (${l.explanation})` : ''}`)
          .join('\n');
        problemLines.push(
          `- [SÉCURITÉ-${v.severity || 'high'}] ${v.title}${v.cwe ? ` (${v.cwe})` : ''}:\n` +
          `  PROBLÈME: ${v.description}\n` +
          (vulnLines ? `${vulnLines}\n` : '') +
          `  CORRECTION OBLIGATOIRE: ${v.fix || v.description}`
        );
      });
    }

    const problemsList = problemLines.length > 0
      ? problemLines.join('\n\n')
      : 'Applique les meilleures pratiques générales pour ce langage.';

    // ── Standards parfaits selon le langage ──────────────────
    const languageStandards = {
      python: `
STANDARDS PYTHON PARFAITS (PEP8 + pylint score 10/10) :
- Toutes les fonctions ET classes ont une docstring complète (""" """)
- Tous les paramètres et retours ont des type hints (def foo(x: int) -> str:)
- Nommage : snake_case pour variables/fonctions, PascalCase pour classes, UPPER_CASE pour constantes
- Imports groupés : stdlib → third-party → local, chacun sur sa propre ligne
- Pas de variable inutilisée, pas de import inutilisé
- Longueur de ligne max 79 caractères
- Deux lignes vides entre les fonctions/classes de top-level
- Pas de bare except, toujours spécifier l'exception (except ValueError:)
- Pas de mutable default arguments (def f(x=[]) → def f(x=None): x = x or [])
- Utilise f-strings plutôt que .format() ou %`,

      javascript: `
STANDARDS JAVASCRIPT PARFAITS (ESLint + bonnes pratiques) :
- Utilise const par défaut, let si réassignation nécessaire, jamais var
- Toutes les fonctions ont un JSDoc complet /** @param @returns */
- Gestion d'erreurs : try/catch sur tous les await, jamais de promise non gérée
- Pas de console.log en production (utilise un logger ou supprime)
- Utilise === au lieu de ==, !== au lieu de !=
- Destructuring pour les objets et arrays quand possible
- Arrow functions pour les callbacks courts
- Pas de code mort (variables déclarées mais non utilisées)
- Async/await plutôt que .then().catch() pour la lisibilité`,

      typescript: `
STANDARDS TYPESCRIPT PARFAITS :
- Typage explicite pour tous les paramètres et retours de fonction
- Interfaces pour tous les objets complexes
- Pas de any, utilise unknown si le type est indéterminé
- Utilise const assertions, readonly quand applicable
- Enums pour les valeurs constantes multiples
- Gestion d'erreurs typée avec des types union (string | Error)`,

      java: `
STANDARDS JAVA PARFAITS :
- Javadoc complet sur toutes les méthodes publiques (@param, @return, @throws)
- Toutes les variables locales sont final quand possible
- Utilise Optional<T> plutôt que null pour les retours optionnels
- Pas de magic numbers, utilise des constantes nommées
- Gestion d'exceptions spécifiques, pas de catch(Exception e)
- Nommage camelCase pour méthodes/variables, PascalCase pour classes`,

      php: `
STANDARDS PHP PARFAITS (PSR-12) :
- PHPDoc sur toutes les fonctions et méthodes
- Type hints sur tous les paramètres et retours
- Utilise des requêtes préparées PDO pour toutes les requêtes SQL
- Pas de variables globales
- Utilise les exceptions plutôt que die() ou exit()`,

      cpp: `
STANDARDS C++ PARFAITS :
- Commentaires Doxygen sur toutes les fonctions
- Utilise smart pointers (unique_ptr, shared_ptr) plutôt que raw pointers
- const correctness : tout ce qui ne doit pas changer est const
- Pas de magic numbers
- RAII pour la gestion des ressources`,
    };

    const langStandards = languageStandards[language.toLowerCase()] || `
STANDARDS GÉNÉRAUX PARFAITS :
- Docstrings/commentaires sur toutes les fonctions et classes
- Typage explicite si le langage le supporte
- Nommage clair et cohérent selon les conventions du langage ${language}
- Gestion d'erreurs complète
- Pas de code mort ni de variables inutilisées
- Pas de magic numbers, utilise des constantes nommées`;

    const prompt = `Tu es un expert senior en qualité de code. Ta mission est de produire un code ${language} PARFAIT qui obtiendrait un score de 100/100 à n'importe quel analyseur statique (pylint, ESLint, SonarQube, etc.).

═══════════════════════════════════════
PROBLÈMES DÉTECTÉS À CORRIGER (${problemLines.length}) :
═══════════════════════════════════════
${problemsList}

═══════════════════════════════════════
CODE ORIGINAL (${codeLines.length} lignes) :
═══════════════════════════════════════
\`\`\`${language}
${code}
\`\`\`

═══════════════════════════════════════
${langStandards}
═══════════════════════════════════════

MISSION : Produis un code qui passerait une revue de code stricte sans AUCUNE remarque :
1. Corrige TOUS les problèmes listés ci-dessus
2. Applique TOUS les standards du langage listés ci-dessus sur L'ENSEMBLE du code
3. Ajoute les docstrings/JSDoc manquants sur TOUTES les fonctions et classes
4. Corrige TOUS les nommages qui ne respectent pas les conventions
5. Supprime TOUT le code mort, les variables inutilisées, les imports inutilisés
6. Ajoute la gestion d'erreurs là où elle manque
7. Remplace les magic numbers par des constantes nommées
8. Le code corrigé doit être fonctionnellement identique à l'original
9. NE supprime aucune fonctionnalité existante

OBJECTIF FINAL : Un analyseur statique passant sur le code corrigé ne doit trouver ZÉRO avertissement, ZÉRO erreur, ZÉRO code smell, ZÉRO vulnérabilité.

Retourne UNIQUEMENT un objet JSON valide, sans markdown, sans backticks, sans texte avant ou après :
{
  "correctedCode": "<le code corrigé complet et parfait>",
  "appliedFixes": [
    {
      "line": <numéro de ligne dans le code original>,
      "original": "<extrait de code original (max 100 chars)>",
      "fixed": "<extrait corrigé (max 100 chars)>",
      "reason": "<explication courte en français>"
    }
  ],
  "summary": "<résumé en 2-3 phrases de toutes les corrections appliquées>"
}`;

    console.log(`🤖 DeepSeek applyCorrections — ${problemLines.length} problèmes + standards complets (${language})`);

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model:       'deepseek-coder',
        messages:    [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens:  4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type':  'application/json',
        },
        timeout: 60000,
      }
    );

    const content = response.data.choices[0].message.content;
    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Réponse DeepSeek invalide — aucun JSON trouvé');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.correctedCode) {
      throw new Error('DeepSeek n\'a pas retourné de code corrigé');
    }

    if (parsed.correctedCode.trim() === code.trim()) {
      console.warn('⚠️  DeepSeek a retourné le code identique à l\'original');
    }

    console.log(`✅ Corrections appliquées — ${parsed.appliedFixes?.length || 0} fixes`);

    res.json({
      success:       true,
      correctedCode: parsed.correctedCode,
      appliedFixes:  Array.isArray(parsed.appliedFixes) ? parsed.appliedFixes : [],
      summary:       parsed.summary || 'Corrections appliquées avec succès.',
    });

  } catch (error) {
    console.error('❌ applyCorrections:', error.message);

    if (error.response?.status === 401) {
      return res.status(500).json({ success: false, message: 'Clé API DeepSeek invalide' });
    }
    if (error.response?.status === 429) {
      return res.status(429).json({ success: false, message: 'Limite de requêtes DeepSeek atteinte, réessayez dans un moment' });
    }

    res.status(500).json({
      success:  false,
      message:  "Erreur lors de l'application des corrections",
      error:    error.message,
    });
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
        qualityScore:    0,
        improvements:    [],
        codeSmells:      [],
        vulnerabilities: [],
        documentation:   { coverage: 0, functions: [], missingDocs: [] },
        metrics:         calculateBasicMetrics(code),
      };
    }

    // ── Documentation détaillée via DeepSeek ──────────────────
    let documentation = { coverage: 0, functions: [], missingDocs: [] };
    try {
      const docResponse = await axios.post(
        DEEPSEEK_API_URL,
        {
          model:       'deepseek-coder',
          messages:    [{
            role: 'user',
            content: `Tu es un expert en documentation de code. Analyse ce code ${language} et génère une documentation structurée en JSON.

Pour CHAQUE fonction/méthode/classe trouvée, retourne un objet avec ces champs :
- "name": nom de la fonction
- "type": "function" | "async function" | "class" | "method"
- "line": numéro de ligne approximatif
- "description": explication claire en 2-4 phrases
- "params": tableau d'objets { name, type, description }
- "returns": string — ce que la fonction retourne
- "example": string — exemple d'appel concret (1-2 lignes max)

Retourne UNIQUEMENT un JSON valide, sans markdown, sans backticks :
{ "functions": [ {...} ], "coverage": <0-100> }

Code :
\`\`\`${language}
${code}
\`\`\``
          }],
          temperature: 0.2,
          max_tokens:  3000,
        },
        {
          headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
          timeout: 45000,
        }
      );

      const content  = docResponse.data.choices[0].message.content;
      const cleaned  = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const match    = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        documentation = {
          coverage:    parseInt(parsed.coverage) || 0,
          functions:   Array.isArray(parsed.functions) ? parsed.functions : [],
          missingDocs: (Array.isArray(parsed.functions) ? parsed.functions : [])
            .filter(f => !f.description || f.description.length < 10)
            .map(f => ({ type: f.type || 'function', name: f.name, line: f.line, suggestion: 'Ajoutez une description complète' })),
        };
      }
    } catch (docError) {
      console.warn('⚠️ Documentation DeepSeek échouée:', docError.message);
      documentation = generateDocumentation(code, language, rawAnalysis);
    }

    return {
      qualityScore:    rawAnalysis.qualityScore,
      improvements:    rawAnalysis.improvements    || [],
      codeSmells:      rawAnalysis.codeSmells      || [],
      vulnerabilities: rawAnalysis.vulnerabilities || [], // ← récupéré de l'IA
      documentation,
      metrics:         rawAnalysis.metrics         || calculateBasicMetrics(code),
    };
  } catch (error) {
    return {
      qualityScore:    0,
      improvements:    [{ type: 'error', severity: 'error', line: 1, message: "Erreur lors de l'analyse", suggestion: error.message }],
      codeSmells:      [],
      vulnerabilities: [],
      documentation:   { coverage: 0, functions: [], missingDocs: [] },
      metrics:         calculateBasicMetrics(code),
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
    missingDocs: coverage < 100
      ? [{ type: 'function', name: 'multiple', line: 1, suggestion: 'Ajoutez des commentaires pour documenter votre code' }]
      : []
  };
}

// ─────────────────────────────────────────────────────────────
//  GET /api/analyze/history
// ─────────────────────────────────────────────────────────────
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
    res.status(500).json({ success: false, message: "Erreur lors de la récupération de l'historique", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
//  DELETE /api/analyze/history/:projectId
// ─────────────────────────────────────────────────────────────
exports.deleteHistoryItem = async (req, res) => {
  const client = await pool.connect();
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    const ownerCheck = await client.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Projet non trouvé ou accès refusé' });
    }

    await client.query('BEGIN');
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

// ─────────────────────────────────────────────────────────────
//  DELETE /api/analyze/history
// ─────────────────────────────────────────────────────────────
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
      success:      true,
      message:      `Historique vidé — ${deleted.rowCount} analyse(s) supprimée(s)`,
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
//  GET /api/analyze/:id
// ─────────────────────────────────────────────────────────────
exports.getAnalysisDetails = async (req, res) => {
  try {
    const { id }     = req.params;
    const userId     = req.user?.id;
    const ipAddress  = req.ip || req.connection.remoteAddress;

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

// ─────────────────────────────────────────────────────────────
//  GET /api/analyze/guest-status
// ─────────────────────────────────────────────────────────────
exports.getGuestStatus = async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const result    = await pool.query(
      'SELECT analysis_count FROM guest_usage WHERE ip_address = $1',
      [ipAddress]
    );
    const currentCount    = result.rows.length > 0 ? result.rows[0].analysis_count : 0;
    const remaining   = Math.max(0, GUEST_ANALYSIS_LIMIT - currentCount);
    res.json({ success: true, currentCount, limit: GUEST_ANALYSIS_LIMIT, remaining, hasReachedLimit: remaining === 0 });

  } catch (error) {
    console.error('❌ Erreur getGuestStatus:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la vérification du statut', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/analyze/programming-languages
// ─────────────────────────────────────────────────────────────
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

// POST /api/analyze/document
exports.documentCode = async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code || !language) {
      return res.status(400).json({ success: false, message: 'Code et langage requis' });
    }

    const prompt = `Tu es un expert en documentation de code. Analyse ce code ${language} et génère une documentation structurée en JSON.

Pour CHAQUE fonction/méthode/classe trouvée, retourne un objet avec ces champs :
- "name": nom de la fonction
- "type": "function" | "async function" | "class" | "method"
- "line": numéro de ligne approximatif
- "description": explication claire en 2-4 phrases — ce que fait la fonction, pourquoi elle existe, dans quel contexte l'utiliser. Parle comme à un développeur junior.
- "params": tableau d'objets { name, type, description } — un par paramètre
- "returns": string — ce que la fonction retourne, avec le type si possible
- "example": string — un exemple d'appel concret (1-2 lignes max)

Retourne UNIQUEMENT un JSON valide, sans markdown, sans backticks :
{ "functions": [ {...}, {...} ] }

Code à documenter :
\`\`\`${language}
${code}
\`\`\``;

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-coder',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 3000,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      }
    );

    const content = response.data.choices[0].message.content;
    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Réponse invalide');

    const parsed = JSON.parse(jsonMatch[0]);

    res.json({
      success: true,
      functions: Array.isArray(parsed.functions) ? parsed.functions : [],
    });

  } catch (error) {
    console.error('❌ documentCode:', error.message);
    res.status(500).json({ success: false, message: 'Erreur lors de la documentation', error: error.message });
  }
};