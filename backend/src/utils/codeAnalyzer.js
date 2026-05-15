
const axios = require('axios');

// ─────────────────────────────────────────────────────────────
//  IMPORTS — modules ESLint et Pylint
// ─────────────────────────────────────────────────────────────
const { analyzeJavaScript } = require('./eslintAnalyzer');  // adapte le chemin si besoin
const { analyzePython }     = require('./pylintAnalyzer');  // adapte le chemin si besoin

// ─────────────────────────────────────────────────────────────
//  CONFIGURATION DEEPSEEK
// ─────────────────────────────────────────────────────────────
const DEEPSEEK_CONFIG = {
  apiUrl:      process.env.DEEPSEEK_API_URL  || 'https://api.deepseek.com/v1/chat/completions',
  apiKey:      process.env.DEEPSEEK_API_KEY  || '',
  model:       process.env.DEEPSEEK_MODEL    || 'deepseek-coder',
  ollamaUrl:   process.env.OLLAMA_URL        || 'http://localhost:11434/api/chat',
  ollamaModel: process.env.OLLAMA_MODEL      || 'deepseek-coder:6.7b',
  useOllama:   process.env.USE_OLLAMA        === 'true',
};

// ─────────────────────────────────────────────────────────────
//  PROMPT SYSTÈME — JSON strict
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es un expert senior en révision de code avec 15 ans d'expérience.
Analyse le code fourni et retourne UNIQUEMENT un objet JSON valide, sans markdown, sans texte avant ou après.

Structure JSON obligatoire :
{
  "qualityScore": <entier entre 0 et 100>,
  "summary": "<résumé en 1-2 phrases>",
  "errorCount": <entier>,
  "warningCount": <entier>,
  "conventionCount": <entier>,
  "refactorCount": <entier>,
  "errors": [
    { "line": <entier>, "message": "<description précise>", "severity": "error", "suggestion": "<comment corriger>" }
  ],
  "warnings": [
    { "line": <entier>, "message": "<description précise>", "severity": "warning", "suggestion": "<comment corriger>" }
  ],
  "improvements": [
    { "line": <entier>, "message": "<description>", "severity": "convention|warning|info", "suggestion": "<amélioration>" }
  ],
  "codeSmells": [
    { "line": <entier>, "message": "<description>", "severity": "error|warning|refactor", "variable": "<règle concernée>" }
  ],
  "vulnerabilities": [
    {
      "title": "<nom de la vulnérabilité>",
      "severity": "critical|high|medium|low",
      "description": "<explication claire>",
      "cwe": "<ex: CWE-89>",
      "lines": [{ "line": <entier>, "code": "<extrait>", "explanation": "<pourquoi c'est dangereux>" }],
      "fix": "<comment corriger concrètement>"
    }
  ],
  "metrics": {
    "totalLines": <entier>,
    "functions": <entier>,
    "classes": <entier>,
    "complexity": "<low|medium|high>",
    "commentRatio": <entier 0-100>,
    "docstrings": <entier>
  }
}

Cherche activement des vulnérabilités de sécurité : injections SQL, XSS, données sensibles en clair, mauvaise gestion des erreurs exposant des infos, etc. Si aucune vulnérabilité n'est détectée, retourne un tableau vide [].

RÈGLES STRICTES pour qualityScore :
- Code avec erreurs de syntaxe graves → 0 à 15
- Code non fonctionnel mais partiellement valide → 15 à 35
- Code fonctionnel avec beaucoup de problèmes → 35 à 55
- Code correct avec améliorations notables → 55 à 75
- Bon code avec améliorations mineures → 75 à 89
- Code quasi parfait → 90 à 97

Sois précis, donne les numéros de ligne exacts, explique en français.
Ne retourne QUE le JSON.`;

// ─────────────────────────────────────────────────────────────
//  COUCHE 1 — VALIDATION SYNTAXIQUE
//  → ESLint  pour JS/TS
//  → Pylint  pour Python
//  → Fallback statique si l'outil est indisponible
// ─────────────────────────────────────────────────────────────

/**
 * Valide la syntaxe du code AVANT d'appeler l'IA.
 * Utilise ESLint (JS/TS) ou Pylint (Python) en priorité.
 * Fallback sur la validation statique embarquée si l'outil plante.
 *
 * @returns {{ syntaxScore: number, criticalErrors: Array, isBroken: boolean }}
 */
async function validateSyntax(code, lang) {
  const criticalErrors = [];
  let syntaxScore = 100;
  let isBroken    = false;

  try {
    if (lang === 'python') {
      // ── Pylint ───────────────────────────────────────────────
      const pylintRes = await analyzePython(code);

      if (pylintRes.success) {
        const pylintErrors = pylintRes.errors || [];

        pylintErrors.forEach(e => {
          criticalErrors.push({
            line:       e.line,
            message:    e.message,
            severity:   'error',
            suggestion: e.symbol || '',
          });
        });

        // Convertir le score Pylint /10 → syntaxScore /100
        syntaxScore = Math.round((pylintRes.score || 0) * 10);

        // isBroken si beaucoup d'erreurs critiques ou score très bas
        isBroken = pylintErrors.length >= 3 || syntaxScore < 30;

        console.log(
          `🐍 Pylint Couche 1: score=${syntaxScore} | erreurs=${pylintErrors.length} | isBroken=${isBroken}`
        );

      } else {
        // Pylint indisponible → fallback statique Python
        console.warn('⚠️  Pylint indisponible → fallback validation statique Python');
        const lines   = code.split('\n');
        const penalty = validatePythonSyntax(code, lines, criticalErrors);
        syntaxScore   = Math.max(0, 100 - penalty);
        isBroken      = penalty >= 50;
      }

    } else if (['javascript', 'typescript'].includes(lang)) {
      // ── ESLint ───────────────────────────────────────────────
      const eslintRes = await analyzeJavaScript(code);

      if (eslintRes.success) {
        const eslintErrors = eslintRes.errors || [];

        eslintErrors.forEach(e => {
          criticalErrors.push({
            line:       e.line,
            message:    e.message,
            severity:   'error',
            suggestion: e.ruleId || '',
          });
        });

        // Calculer syntaxScore à partir du nombre d'erreurs ESLint
        // 0 erreur → 100, chaque erreur coûte 10 pts, min 0
        const penalty = Math.min(100, eslintErrors.length * 10);
        syntaxScore   = Math.max(0, 100 - penalty);
        isBroken      = eslintErrors.length >= 5 || syntaxScore < 30;

        console.log(
          `🟨 ESLint Couche 1: score=${syntaxScore} | erreurs=${eslintErrors.length} | isBroken=${isBroken}`
        );

      } else {
        // ESLint indisponible → fallback statique JS
        console.warn('⚠️  ESLint indisponible → fallback validation statique JS');
        const lines   = code.split('\n');
        const penalty = validateJSSyntax(code, lines, criticalErrors);
        syntaxScore   = Math.max(0, 100 - penalty);
        isBroken      = penalty >= 50;
      }
    }

  } catch (err) {
    // ESLint ou Pylint a complètement crashé → fallback statique
    console.error('❌ validateSyntax crash:', err.message, '→ fallback statique');
    const lines = code.split('\n');
    let penalty = 0;

    if (lang === 'python') {
      penalty = validatePythonSyntax(code, lines, criticalErrors);
    } else {
      penalty = validateJSSyntax(code, lines, criticalErrors);
    }

    syntaxScore = Math.max(0, 100 - penalty);
    isBroken    = penalty >= 50;
  }

  // Garde-fou : code trop court ou quasi-vide
  if (code.split('\n').filter(l => l.trim()).length < 3) {
    criticalErrors.push({ line: 1, message: 'Code trop court ou vide', severity: 'error' });
    syntaxScore = 0;
    isBroken    = true;
  }

  console.log(`🔍 Syntaxe [${lang}]: score=${syntaxScore} | isBroken=${isBroken} | erreurs=${criticalErrors.length}`);
  return { syntaxScore, criticalErrors, isBroken };
}

// ─────────────────────────────────────────────────────────────
//  FALLBACKS STATIQUES (utilisés si ESLint/Pylint indisponibles)
// ─────────────────────────────────────────────────────────────

// ─── Validation Python statique ──────────────────────────────
function validatePythonSyntax(code, lines, criticalErrors) {
  let penalty = 0;

  const PYTHON_KEYWORDS = [
    'if','else','elif','while','for','def','class','return',
    'import','from','lambda','try','except','finally','with','pass','break',
    'continue','and','or','not','in','is','True','False','None','yield','raise',
    'global','nonlocal','assert','del','as','async','await',
  ];

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Mot-clé utilisé comme variable : keyword = valeur
    for (const kw of PYTHON_KEYWORDS) {
      if (new RegExp(`^${kw}\\s*=(?!=)`).test(trimmed)) {
        criticalErrors.push({
          line: i + 1,
          message: `"${kw}" est un mot-clé Python réservé, impossible de l'utiliser comme variable`,
          severity: 'error',
          suggestion: `Renommez cette variable (ex: my_${kw})`,
        });
        penalty += 20;
      }
    }

    // print sans parenthèses (Python 2 dans Python 3)
    if (/^print\s+["']/.test(trimmed)) {
      criticalErrors.push({
        line: i + 1,
        message: 'Syntaxe Python 2 : print nécessite des parenthèses en Python 3',
        severity: 'error',
        suggestion: 'Utilisez print("...") avec parenthèses',
      });
      penalty += 15;
    }

    // while/if/for sans deux-points à la fin
    if (/^(while|if|elif|for)\s+.+[^:]\s*$/.test(trimmed) && !trimmed.endsWith(':')) {
      criticalErrors.push({
        line: i + 1,
        message: `Instruction "${trimmed.split(' ')[0]}" sans ":" à la fin`,
        severity: 'error',
        suggestion: `Ajoutez ":" → ${trimmed}:`,
      });
      penalty += 15;
    }

    // Condition incomplète : if x > :
    if (/^(if|elif|while)\s+.*[><=!]\s*:/.test(trimmed)) {
      criticalErrors.push({
        line: i + 1,
        message: 'Condition incomplète : opérateur sans valeur de comparaison',
        severity: 'error',
        suggestion: 'Complétez la condition, ex: if x > 0:',
      });
      penalty += 20;
    }

    // return else (syntaxe invalide)
    if (/^return\s+else/.test(trimmed)) {
      criticalErrors.push({
        line: i + 1,
        message: '"return else" est une syntaxe invalide en Python',
        severity: 'error',
        suggestion: 'Séparez return et else en blocs distincts',
      });
      penalty += 20;
    }

    // import from math (ordre inversé)
    if (/^import\s+from\s+/.test(trimmed)) {
      criticalErrors.push({
        line: i + 1,
        message: 'Syntaxe d\'import incorrecte : "import from" n\'existe pas',
        severity: 'error',
        suggestion: 'Utilisez : from math import sqrt',
      });
      penalty += 15;
    }

    // def avec mot-clé réservé comme nom de fonction
    if (/^def\s+(if|else|elif|while|for|class|return|import|lambda)\s*/.test(trimmed)) {
      criticalErrors.push({
        line: i + 1,
        message: 'Impossible de nommer une fonction avec un mot-clé réservé',
        severity: 'error',
        suggestion: 'Choisissez un nom valide pour la fonction',
      });
      penalty += 25;
    }

    // Assignation invalide = =
    if (/=\s*=\s*[^=]/.test(trimmed) && !/[=!<>]=/.test(trimmed)) {
      criticalErrors.push({
        line: i + 1,
        message: 'Assignation invalide : "= =" n\'est pas une syntaxe Python valide',
        severity: 'error',
        suggestion: 'Utilisez un seul "=" pour assigner une valeur',
      });
      penalty += 25;
    }

    // def sans nom de fonction
    if (/^def\s*\(/.test(trimmed)) {
      criticalErrors.push({
        line: i + 1,
        message: '"def" sans nom de fonction',
        severity: 'error',
        suggestion: 'Syntaxe correcte : def nom_fonction(param):',
      });
      penalty += 30;
    }

    // Mots-clés français
    const frenchKeywords = ['si ', 'retourne ', 'afficher ', 'pour ', 'fin ', 'alors ', 'importer '];
    for (const kw of frenchKeywords) {
      if (trimmed.toLowerCase().startsWith(kw) || trimmed.toLowerCase() === kw.trim()) {
        criticalErrors.push({
          line: i + 1,
          message: `"${kw.trim()}" n'est pas un mot-clé Python valide (mot français)`,
          severity: 'error',
          suggestion: `Python utilise l'anglais : "if", "return", "print", "for"...`,
        });
        penalty += 20;
        break;
      }
    }

    // Opérateurs consécutifs invalides
    if (/[+\-*]{3,}/.test(trimmed)) {
      criticalErrors.push({
        line: i + 1,
        message: 'Opérateurs consécutifs invalides',
        severity: 'error',
        suggestion: 'Un seul opérateur à la fois : +, -, *',
      });
      penalty += 20;
    }

    // Texte brut sans syntaxe Python
    if (
      trimmed.length > 3 &&
      !/[=:()\[\]{}#@]/.test(trimmed) &&
      !/^(def|class|import|from|if|else|elif|for|while|return|try|except|with|pass|break|continue|raise|yield|print|and|or|not|in|is|True|False|None)\b/.test(trimmed) &&
      /^[a-zA-ZÀ-ÿ\s]+$/.test(trimmed)
    ) {
      criticalErrors.push({
        line: i + 1,
        message: `Texte brut détecté : "${trimmed}" — ce n'est pas du code Python`,
        severity: 'error',
        suggestion: 'Ce contenu ne ressemble pas à du code Python valide',
      });
      penalty += 25;
    }
  });

  return Math.min(penalty, 100);
}

// ─── Validation JavaScript / TypeScript statique ──────────────
function validateJSSyntax(code, lines, criticalErrors) {
  let penalty = 0;

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Condition incomplète : if (x >)
    if (/\bif\s*\([^)]*[><=!]\s*\)/.test(trimmed)) {
      criticalErrors.push({
        line: i + 1,
        message: 'Condition incomplète dans le if',
        severity: 'error',
        suggestion: 'Complétez la condition, ex: if (x > 0)',
      });
      penalty += 15;
    }
  });

  // Parenthèses déséquilibrées
  const openP  = (code.match(/\(/g) || []).length;
  const closeP = (code.match(/\)/g) || []).length;
  if (Math.abs(openP - closeP) > 2) {
    criticalErrors.push({
      line: 1,
      message: `Parenthèses déséquilibrées : ${openP} ouvrantes / ${closeP} fermantes`,
      severity: 'error',
      suggestion: 'Vérifiez que chaque ( a son ) correspondant',
    });
    penalty += 25;
  }

  // Accolades déséquilibrées
  const openB  = (code.match(/\{/g) || []).length;
  const closeB = (code.match(/\}/g) || []).length;
  if (Math.abs(openB - closeB) > 2) {
    criticalErrors.push({
      line: 1,
      message: `Accolades déséquilibrées : ${openB} ouvrantes / ${closeB} fermantes`,
      severity: 'error',
      suggestion: 'Vérifiez que chaque { a son } correspondant',
    });
    penalty += 20;
  }

  return Math.min(penalty, 100);
}

// ─────────────────────────────────────────────────────────────
//  ENTRÉE PRINCIPALE
// ─────────────────────────────────────────────────────────────
async function analyzeCode(code, language) {
  console.log(`🤖 Analyse hybride (ESLint/Pylint + DeepSeek) — langage: ${language}`);

  try {
    const lang = normalizeLanguage(language);

    // ══════════════════════════════════════════════════════════
    //  COUCHE 1 : Validation syntaxique — ESLint / Pylint
    // ══════════════════════════════════════════════════════════
    const syntaxCheck = await validateSyntax(code, lang);

    // Code fondamentalement cassé → retour immédiat, pas d'appel IA
    if (syntaxCheck.isBroken) {
      console.log(`🚨 Code cassé détecté — score plafonné à 30 max (IA non consultée)`);
      const metrics   = calculateMetrics(code);
      const staticRes = runStaticAnalysis(code, lang);

      const allSmells = [
        ...syntaxCheck.criticalErrors,
        ...(staticRes.codeSmells || []),
      ];

      return {
        success:         true,
        qualityScore:    0,
        summary:         `⚠️ Code invalide : ${syntaxCheck.criticalErrors.length} erreur(s) syntaxique(s) critique(s) détectée(s). Ce code ne peut pas s'exécuter.`,
        improvements:    staticRes.improvements || [],
        codeSmells:      allSmells,
        errorCount:      allSmells.filter(e => e.severity === 'error').length,
        warningCount:    allSmells.filter(e => e.severity === 'warning').length,
        conventionCount: 0,
        refactorCount:   0,
        metrics,
        language:        lang,
        analyzedBy:      'eslint-pylint-validator',
        timestamp:       new Date().toISOString(),
      };
    }

    // ══════════════════════════════════════════════════════════
    //  COUCHE 2 : DeepSeek IA — analyse sémantique
    // ══════════════════════════════════════════════════════════
    let aiResults = null;
    try {
      aiResults = await analyzeWithDeepSeek(code, lang);
      console.log(`✅ DeepSeek OK — score IA brut: ${aiResults.qualityScore}`);
    } catch (aiError) {
      console.warn(`⚠️  DeepSeek indisponible: ${aiError.message} → fallback statique`);
    }

    const staticResults = runStaticAnalysis(code, lang);

    // ══════════════════════════════════════════════════════════
    //  COUCHE 3 : Score final hybride
    // ══════════════════════════════════════════════════════════
    let merged;
    let qualityScore;

    if (aiResults && aiResults.success) {
      merged       = mergeResults(aiResults, staticResults);
      qualityScore = calculateHybridScore(aiResults.qualityScore, syntaxCheck.syntaxScore, merged);
    } else {
      // Fallback si IA indisponible
      console.log('🔄 Fallback → analyse statique uniquement');
      merged = {
        ...staticResults,
        success: true,
        fallback: true,
        summary: `Analyse statique (IA indisponible). ${syntaxCheck.criticalErrors.length} erreur(s) syntaxique(s) détectée(s).`,
        codeSmells: [...(staticResults.codeSmells || []), ...syntaxCheck.criticalErrors],
      };
      qualityScore = calculateFallbackScore(merged, calculateMetrics(code), lang, syntaxCheck.syntaxScore);
    }

    const metrics = merged.metrics || calculateMetrics(code);
    console.log(`🎯 Score final hybride: ${qualityScore}/100`);

    return {
      ...merged,
      qualityScore,
      metrics,
      language:   lang,
      analyzedBy: (aiResults && aiResults.success) ? 'deepseek-ai+eslint-pylint' : 'static+eslint-pylint',
      timestamp:  new Date().toISOString(),
    };

  } catch (error) {
    console.error('❌ analyzeCode:', error);
    return {
      success: false, error: error.message,
      qualityScore: 0,
      errors: [], warnings: [], improvements: [], codeSmells: [],
      errorCount: 0, warningCount: 0,
    };
  }
}

// ─────────────────────────────────────────────────────────────
//  COUCHE 3 — CALCUL DU SCORE HYBRIDE
// ─────────────────────────────────────────────────────────────
/**
 * Formule :
 *   hybrid = (score_IA × 0.60) + (score_syntaxe × 0.40)
 *
 * Pénalités dures (plafonds non négociables) :
 *   erreurs ≥ 1  → max 70
 *   erreurs ≥ 3  → max 50
 *   erreurs ≥ 6  → max 30
 *   erreurs ≥ 10 → max 15
 *   syntaxScore < 30 → max 20
 *   syntaxScore < 50 → max 40
 *   syntaxScore < 70 → max 60
 */
function calculateHybridScore(aiScore, syntaxScore, results) {
  const hybrid = Math.round((aiScore * 0.60) + (syntaxScore * 0.40));

  const errorsInSmells = (results.codeSmells || []).filter(s => s.severity === 'error').length;
  const totalErrors    = Math.max(results.errorCount || 0, errorsInSmells);

  let maxAllowed = 97;

  if      (totalErrors >= 10) maxAllowed = Math.min(maxAllowed, 15);
  else if (totalErrors >= 6)  maxAllowed = Math.min(maxAllowed, 30);
  else if (totalErrors >= 3)  maxAllowed = Math.min(maxAllowed, 50);
  else if (totalErrors >= 1)  maxAllowed = Math.min(maxAllowed, 70);

  if      (syntaxScore < 30) maxAllowed = Math.min(maxAllowed, 20);
  else if (syntaxScore < 50) maxAllowed = Math.min(maxAllowed, 40);
  else if (syntaxScore < 70) maxAllowed = Math.min(maxAllowed, 60);

  const totalProblems = (results.codeSmells || []).length + (results.improvements || []).length;
  if (totalProblems === 0) maxAllowed = Math.min(maxAllowed, 97);
  else                     maxAllowed = Math.min(maxAllowed, 95);

  const minScore   = totalErrors >= 8 ? 0 : 5;
  const finalScore = Math.max(minScore, Math.min(maxAllowed, hybrid));

  console.log(
    `🏆 Hybride: IA=${aiScore} | syntaxe=${syntaxScore} | brut=${hybrid} | `
    + `erreurs=${totalErrors} | maxAllowed=${maxAllowed} → FINAL=${finalScore}`
  );

  return finalScore;
}

// ─────────────────────────────────────────────────────────────
//  APPEL DEEPSEEK IA
// ─────────────────────────────────────────────────────────────
async function analyzeWithDeepSeek(code, language) {
  const userMessage = `Langage de programmation : ${language}

Code à analyser :
\`\`\`${language}
${code}
\`\`\`

Analyse ce code et retourne uniquement le JSON demandé.`;

  let responseText;

  if (DEEPSEEK_CONFIG.useOllama) {
    console.log(`🦙 Ollama (${DEEPSEEK_CONFIG.ollamaModel})...`);
    const response = await axios.post(
      DEEPSEEK_CONFIG.ollamaUrl,
      {
        model:    DEEPSEEK_CONFIG.ollamaModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userMessage },
        ],
        stream:  false,
        options: { temperature: 0.1 },
      },
      { timeout: 120000 }
    );
    responseText = response.data?.message?.content || response.data?.response || '';

  } else {
    if (!DEEPSEEK_CONFIG.apiKey) throw new Error('DEEPSEEK_API_KEY manquante dans .env');

    console.log(`🌐 DeepSeek API (${DEEPSEEK_CONFIG.model})...`);
    const response = await axios.post(
      DEEPSEEK_CONFIG.apiUrl,
      {
        model:       DEEPSEEK_CONFIG.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userMessage },
        ],
        temperature: 0.1,
        max_tokens:  3000,
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_CONFIG.apiKey}`,
          'Content-Type':  'application/json',
        },
        timeout: 120000,
      }
    );
    responseText = response.data?.choices?.[0]?.message?.content || '';
  }

  return parseAIResponse(responseText);
}

// ─────────────────────────────────────────────────────────────
//  PARSING DE LA RÉPONSE IA
// ─────────────────────────────────────────────────────────────
function parseAIResponse(responseText) {
  if (!responseText || responseText.trim() === '') throw new Error('Réponse IA vide');

  const cleaned = responseText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Aucun JSON valide dans la réponse IA');

  let parsed;
  try { parsed = JSON.parse(jsonMatch[0]); }
  catch (e) { throw new Error(`JSON invalide: ${e.message}`); }

  const errors          = Array.isArray(parsed.errors)          ? parsed.errors          : [];
  const warnings        = Array.isArray(parsed.warnings)        ? parsed.warnings        : [];
  const improvements    = Array.isArray(parsed.improvements)    ? parsed.improvements    : [];
  const codeSmells      = Array.isArray(parsed.codeSmells)      ? parsed.codeSmells      : [];
  const vulnerabilities = Array.isArray(parsed.vulnerabilities) ? parsed.vulnerabilities : [];

  const allCodeSmells = [
    ...codeSmells,
    ...errors.map(e => ({
      line: e.line || 1, message: e.message || '',
      severity: 'error', variable: e.suggestion || 'error',
    })),
  ];

  const allImprovements = [
    ...improvements,
    ...warnings.map(w => ({
      line: w.line || 1, message: w.message || '',
      severity: 'warning', suggestion: w.suggestion || '',
    })),
  ];

  return {
    success:         true,
    qualityScore:    Math.max(0, Math.min(100, parseInt(parsed.qualityScore) || 50)),
    summary:         parsed.summary        || '',
    errors,
    warnings,
    improvements:    allImprovements,
    codeSmells:      allCodeSmells,
    vulnerabilities,
    errorCount:      parseInt(parsed.errorCount)      || errors.length,
    warningCount:    parseInt(parsed.warningCount)    || warnings.length,
    conventionCount: parseInt(parsed.conventionCount) || 0,
    refactorCount:   parseInt(parsed.refactorCount)   || 0,
    metrics: {
      totalLines:   parseInt(parsed.metrics?.totalLines)   || 0,
      functions:    parseInt(parsed.metrics?.functions)    || 0,
      classes:      parseInt(parsed.metrics?.classes)      || 0,
      complexity:   parsed.metrics?.complexity             || 'medium',
      commentRatio: parseInt(parsed.metrics?.commentRatio) || 0,
      docstrings:   parseInt(parsed.metrics?.docstrings)   || 0,
    },
  };
}

// ─────────────────────────────────────────────────────────────
//  ANALYSE STATIQUE COMPLÉMENTAIRE
// ─────────────────────────────────────────────────────────────
function runStaticAnalysis(code, lang) {
  if (lang === 'python') return staticAnalyzePython(code);
  if (['javascript', 'typescript'].includes(lang)) return staticAnalyzeJS(code);
  return { improvements: [], codeSmells: [], errorCount: 0, warningCount: 0, conventionCount: 0, refactorCount: 0 };
}

function staticAnalyzePython(code) {
  const lines = code.split('\n');
  const improvements = [], codeSmells = [];
  const seen = new Set();
  const imp   = (line, msg, suggestion, sev = 'convention') => dedup(seen, improvements, { type: sev, severity: sev, line, message: msg, suggestion });
  const smell = (line, msg, variable, sev = 'warning')      => dedup(seen, codeSmells,   { type: sev, severity: sev, line, message: msg, variable });

  lines.forEach((line, i) => {
    const depth = Math.floor((line.match(/^(\s*)/)[1].length) / 4);
    if (depth >= 4) smell(i + 1, `Imbrication trop profonde (niveau ${depth}, max 3)`, 'too-many-nested-blocks', 'refactor');
  });
  for (const m of code.matchAll(/^def ([A-Z][a-zA-Z0-9]*|[a-z]+[A-Z][a-zA-Z0-9]*)\s*\(/gm))
    imp(lineOf(code, m.index), `Fonction "${m[1]}" devrait être en snake_case`, `Renommez en: "${toSnakeCase(m[1])}"`);
  for (const m of code.matchAll(/^class ([a-z][a-zA-Z0-9]*)\s*[:(]/gm))
    imp(lineOf(code, m.index), `Classe "${m[1]}" devrait être en PascalCase`, `Renommez en: "${toPascalCase(m[1])}"`);
  for (const m of code.matchAll(/^def (\w+)\(([^)]+)\)/gm)) {
    const params = m[2].split(',').filter(p => p.trim() && !['self','**kwargs','*args'].includes(p.trim()));
    if (params.length > 7) smell(lineOf(code, m.index), `Fonction "${m[1]}" a trop de paramètres (${params.length} > 7)`, 'too-many-arguments', 'refactor');
  }
  lines.forEach((line, i) => { if (line.length > 100) imp(i + 1, `Ligne trop longue (${line.length} > 100 chars)`, 'Découpez cette ligne selon PEP8'); });
  for (const m of code.matchAll(/^(def \w+\([^)]*\):)\s*\n(\s*)(?!""")/gm))
    imp(lineOf(code, m.index), 'Fonction sans docstring', 'Ajoutez une docstring: """Description."""');
  for (const m of code.matchAll(/^import (\w+)$/gm)) {
    if (!code.slice(m.index + m[0].length).match(new RegExp(`\\b${m[1]}\\s*\\.`)))
      smell(lineOf(code, m.index), `Import possiblement inutilisé: "${m[1]}"`, 'unused-import', 'warning');
  }
  for (const m of code.matchAll(/^    (\w+)\s*=\s*[^=]/gm)) {
    const vn = m[1];
    if (vn === '_' || vn.startsWith('__')) continue;
    if (!code.slice(m.index + m[0].length).match(new RegExp(`\\b${vn}\\b`)))
      imp(lineOf(code, m.index), `Variable "${vn}" assignée mais jamais utilisée`, 'Supprimez-la ou utilisez-la', 'warning');
  }
  return {
    success: true, improvements, codeSmells, isStatic: true,
    conventionCount: improvements.filter(i => i.severity === 'convention').length,
    warningCount:    [...improvements, ...codeSmells].filter(i => i.severity === 'warning').length,
    refactorCount:   codeSmells.filter(i => i.severity === 'refactor').length,
    errorCount:      codeSmells.filter(i => i.severity === 'error').length,
  };
}

function staticAnalyzeJS(code) {
  const lines = code.split('\n');
  const improvements = [], codeSmells = [];
  const seen = new Set();
  const imp   = (line, msg, suggestion, sev = 'warning') => dedup(seen, improvements, { type: sev, severity: sev, line, message: msg, suggestion });
  const smell = (line, msg, variable, sev = 'error')     => dedup(seen, codeSmells,   { type: sev, severity: sev, line, message: msg, variable });

  lines.forEach((line, i) => {
    const depth = Math.floor(line.match(/^(\s*)/)[0].length / 2);
    if (depth > 6) smell(i + 1, `Imbrication trop profonde (niveau ${Math.floor(depth / 2)})`, 'max-depth', 'warning');
    if (line.length > 100) imp(i + 1, `Ligne trop longue (${line.length} > 100 chars)`, 'Découpez cette ligne');
    if (!line.trim().startsWith('//') && /"[^"]*"/.test(line) && !line.includes('`'))
      imp(i + 1, 'Préférez les guillemets simples aux doubles', "Remplacez \" par '");
  });
  for (const m of code.matchAll(/function\s+(\w+)\s*\(([^)]+)\)/g)) {
    const params = m[2].split(',').filter(p => p.trim());
    if (params.length > 7) smell(lineOf(code, m.index), `Fonction "${m[1]}" a trop de paramètres (${params.length} > 7)`, 'max-params', 'warning');
  }
  return {
    success: true, improvements, codeSmells, isStatic: true,
    conventionCount: 0,
    errorCount:   codeSmells.filter(i => i.severity === 'error').length,
    warningCount: [...improvements, ...codeSmells].filter(i => i.severity === 'warning').length,
    refactorCount: 0,
  };
}

// ─────────────────────────────────────────────────────────────
//  FUSION IA + STATIQUE (sans doublons)
// ─────────────────────────────────────────────────────────────
function mergeResults(aiRes, staticRes) {
  const dk = i => `${i.line}-${(i.message || '').substring(0, 35)}`;
  const aiImpKeys   = new Set((aiRes.improvements || []).map(dk));
  const aiSmellKeys = new Set((aiRes.codeSmells   || []).map(dk));
  return {
    ...aiRes,
    success:         true,
    improvements:    [...(aiRes.improvements || []), ...(staticRes.improvements || []).filter(i => !aiImpKeys.has(dk(i)))],
    codeSmells:      [...(aiRes.codeSmells   || []), ...(staticRes.codeSmells   || []).filter(i => !aiSmellKeys.has(dk(i)))],
    errorCount:      (aiRes.errorCount      || 0) + (staticRes.errorCount      || 0),
    warningCount:    (aiRes.warningCount     || 0) + (staticRes.warningCount    || 0),
    conventionCount: (aiRes.conventionCount  || 0) + (staticRes.conventionCount || 0),
    refactorCount:   (aiRes.refactorCount    || 0) + (staticRes.refactorCount   || 0),
  };
}

// ─────────────────────────────────────────────────────────────
//  SCORE FALLBACK (si IA indisponible)
// ─────────────────────────────────────────────────────────────
function calculateFallbackScore(results, metrics, lang, syntaxScore = 100) {
  if (!results.success) return 0;
  const codeSmells   = results.codeSmells   || [];
  const improvements = results.improvements || [];
  const LOC = Math.max(metrics?.codeLines || metrics?.totalLines || 1, 1);

  const pen = { error: 0, refactor: 0, warning: 0, convention: 0, info: 0 };
  const cap = { error: 40, refactor: 20, warning: 15, convention: 10, info: 3 };

  codeSmells.forEach(s => {
    if      (s.severity === 'error')    pen.error    = Math.min(cap.error,    pen.error    + 10);
    else if (s.severity === 'refactor') pen.refactor = Math.min(cap.refactor, pen.refactor + 5);
    else                                pen.warning  = Math.min(cap.warning,  pen.warning  + 3);
  });
  improvements.forEach(i => {
    if      (i.severity === 'warning')    pen.warning    = Math.min(cap.warning,    pen.warning    + 3);
    else if (i.severity === 'convention') pen.convention = Math.min(cap.convention, pen.convention + 1.5);
    else                                  pen.info       = Math.min(cap.info,       pen.info       + 0.5);
  });

  const penaltyByItems = pen.error + pen.refactor + pen.warning + pen.convention + pen.info;
  const totalProblems  = codeSmells.length + improvements.length;
  const penaltyDensity = Math.min(25, (totalProblems / LOC) * 20);

  const baseScore = 100 - penaltyByItems - penaltyDensity;
  const combined  = Math.round((baseScore * 0.60) + (syntaxScore * 0.40));

  const minScore = (results.errorCount || 0) >= 8 ? 0 : 5;
  const maxScore = totalProblems === 0 ? 97 : 95;
  return Math.max(minScore, Math.min(maxScore, combined));
}

// ─────────────────────────────────────────────────────────────
//  MÉTRIQUES
// ─────────────────────────────────────────────────────────────
function calculateMetrics(code) {
  const lines = code.split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  const commentLines = lines.filter(l => {
    const t = l.trim();
    return t.startsWith('//') || t.startsWith('#') || t.startsWith('*') || t.startsWith('/*');
  });
  const docstrings   = (code.match(/"""[\s\S]*?"""|'''[\s\S]*?'''/g) || []).length;
  const commentRatio = nonEmpty.length > 0
    ? Math.round(((commentLines.length + docstrings) / nonEmpty.length) * 100)
    : 0;
  return {
    totalLines:    lines.length,
    codeLines:     nonEmpty.length,
    commentLines:  commentLines.length,
    emptyLines:    lines.length - nonEmpty.length,
    characters:    code.length,
    avgLineLength: Math.round(code.length / Math.max(lines.length, 1)),
    commentRatio,
    docstrings,
    functions: (code.match(/(?:def |function |\w+\s*=\s*(?:async\s+)?\()/g) || []).length,
    classes:   (code.match(/(?:^class |^class\t)/gm) || []).length,
  };
}

// ─────────────────────────────────────────────────────────────
//  UTILITAIRES
// ─────────────────────────────────────────────────────────────
function dedup(seen, arr, item) {
  const key = `${item.line}-${(item.message || '').substring(0, 40)}`;
  if (!seen.has(key)) { seen.add(key); arr.push(item); }
}

function lineOf(code, index) {
  return code.substring(0, index).split('\n').length;
}

function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function toPascalCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function normalizeLanguage(language) {
  const map = {
    javascript: 'javascript', js: 'javascript',
    typescript: 'typescript', ts: 'typescript',
    python: 'python',         py: 'python',
    java: 'java',             cpp: 'cpp', 'c++': 'cpp',
    csharp: 'csharp',         'c#': 'csharp',
    go: 'go',                 golang: 'go',
    rust: 'rust',             php: 'php', ruby: 'ruby',
  };
  return map[(language || '').toLowerCase()] || (language || '').toLowerCase();
}

// ─────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────
module.exports = {
  analyzeCode,
  analyzeWithDeepSeek,
  validateSyntax,
  calculateMetrics,
  normalizeLanguage,
};