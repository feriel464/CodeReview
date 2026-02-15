/**
 * Module central d'analyse de code — codeAnalyzer.js
 *
 * Score réaliste et graduel :
 *  - Ne tombe jamais à 0 sauf code totalement cassé
 *  - Ne monte jamais à 100 sauf code parfait (très rare)
 *  - Pondération par sévérité + densité (nb problèmes / LOC)
 *  - Bonus pour commentaires, structure, nom cohérent
 *  - Python : intègre le score Pylint /10 comme ancre principale
 */

const { analyzeJavaScript } = require('./eslintAnalyzer');
const { analyzePython      } = require('./pylintAnalyzer');

// ─────────────────────────────────────────────────────────────
//  ENTRÉE PRINCIPALE
// ─────────────────────────────────────────────────────────────
async function analyzeCode(code, language) {
  console.log(`🔬 Analyse du code — langage: ${language}`);

  try {
    const lang = normalizeLanguage(language);

    // ── 1. Analyse par l'outil dédié ──────────────────────────
    let rawResults;
    switch (lang) {
      case 'javascript':
      case 'typescript':
        console.log('📜 ESLint');
        rawResults = await analyzeJavaScript(code);
        break;
      case 'python':
        console.log('🐍 Pylint');
        rawResults = await analyzePython(code);
        break;
      default:
        console.log('⚠️  Langage non supporté → simulation');
        rawResults = simulateAnalysis(code, lang);
    }

    // ── 2. Analyse statique manuelle (toujours) ───────────────
    const staticResults = runStaticAnalysis(code, lang);

    // ── 3. Fusion sans doublons ───────────────────────────────
    const merged = mergeResults(rawResults, staticResults);

    // ── 4. Métriques finales ──────────────────────────────────
    const metrics = merged.metrics || calculateMetrics(code);

    // ── 5. Score graduel et réaliste ─────────────────────────
    const qualityScore = calculateQualityScore(merged, metrics, lang);

    console.log(`🎯 Score final: ${qualityScore}/100`);

    return {
      ...merged,
      qualityScore,
      metrics,
      language: lang,
      timestamp: new Date().toISOString(),
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
//  ANALYSE STATIQUE MANUELLE
// ─────────────────────────────────────────────────────────────
function runStaticAnalysis(code, lang) {
  if (lang === 'python')     return staticAnalyzePython(code);
  if (['javascript','typescript'].includes(lang)) return staticAnalyzeJS(code);
  return { improvements: [], codeSmells: [], errorCount: 0, warningCount: 0, conventionCount: 0, refactorCount: 0 };
}

// ─── Statique Python ─────────────────────────────────────────
function staticAnalyzePython(code) {
  const lines = code.split('\n');
  const improvements = [], codeSmells = [];
  const seen = new Set();

  const imp  = (line, msg, suggestion, sev = 'convention') => dedup(seen, improvements, { type: sev, severity: sev, line, message: msg, suggestion });
  const smell = (line, msg, variable, sev = 'warning')    => dedup(seen, codeSmells,   { type: sev, severity: sev, line, message: msg, variable });

  // Imbrication > 3 (aligné sur .pylintrc max-nested-blocks=3)
  lines.forEach((line, i) => {
    const depth = Math.floor((line.match(/^(\s*)/)[1].length) / 4);
    if (depth >= 4) smell(i + 1, `Imbrication trop profonde (niveau ${depth}, max 3)`, 'too-many-nested-blocks', 'refactor');
  });

  // Fonctions pas snake_case
  for (const m of code.matchAll(/^def ([A-Z][a-zA-Z0-9]*|[a-z]+[A-Z][a-zA-Z0-9]*)\s*\(/gm)) {
    imp(lineOf(code, m.index), `Fonction "${m[1]}" devrait être en snake_case`, `Renommez en: "${toSnakeCase(m[1])}"`);
  }

  // Classes pas PascalCase
  for (const m of code.matchAll(/^class ([a-z][a-zA-Z0-9]*)\s*[:(]/gm)) {
    imp(lineOf(code, m.index), `Classe "${m[1]}" devrait être en PascalCase`, `Renommez en: "${toPascalCase(m[1])}"`);
  }

  // Trop de paramètres (max 7 selon .pylintrc)
  for (const m of code.matchAll(/^def (\w+)\(([^)]+)\)/gm)) {
    const params = m[2].split(',').filter(p => p.trim() && p.trim() !== 'self' && p.trim() !== '**kwargs' && p.trim() !== '*args');
    if (params.length > 7) smell(lineOf(code, m.index), `Fonction "${m[1]}" a trop de paramètres (${params.length} > 7)`, 'too-many-arguments', 'refactor');
  }

  // Lignes > 100 (aligné sur votre FORMAT.max-line-length=100)
  lines.forEach((line, i) => {
    if (line.length > 100) imp(i + 1, `Ligne trop longue (${line.length} > 100 chars)`, 'Découpez cette ligne selon PEP8');
  });

  // Fonctions sans docstring
  for (const m of code.matchAll(/^(def \w+\([^)]*\):)\s*\n(\s*)(?!""")/gm)) {
    imp(lineOf(code, m.index), `Fonction sans docstring`, 'Ajoutez une docstring: """Description."""');
  }

  // Imports inutilisés (heuristique)
  for (const m of code.matchAll(/^import (\w+)$/gm)) {
    const mod = m[1];
    if (!code.slice(m.index + m[0].length).match(new RegExp(`\\b${mod}\\s*\\.`))) {
      smell(lineOf(code, m.index), `Import possiblement inutilisé: "${mod}"`, 'unused-import', 'warning');
    }
  }

  // Variables assignées jamais utilisées (heuristique légère)
  for (const m of code.matchAll(/^    (\w+)\s*=\s*[^=]/gm)) {
    const vn = m[1];
    if (vn === '_' || vn.startsWith('__')) continue;
    if (!code.slice(m.index + m[0].length).match(new RegExp(`\\b${vn}\\b`))) {
      imp(lineOf(code, m.index), `Variable "${vn}" assignée mais possiblement jamais utilisée`, 'Supprimez-la ou utilisez-la', 'warning');
    }
  }

  const conventionCount = improvements.filter(i => i.severity === 'convention').length;
  const warningCount    = [...improvements, ...codeSmells].filter(i => i.severity === 'warning').length;
  const refactorCount   = codeSmells.filter(i => i.severity === 'refactor').length;
  const errorCount      = codeSmells.filter(i => i.severity === 'error').length;

  return { success: true, improvements, codeSmells, conventionCount, warningCount, refactorCount, errorCount, isStatic: true };
}

// ─── Statique JS ─────────────────────────────────────────────
function staticAnalyzeJS(code) {
  const lines = code.split('\n');
  const improvements = [], codeSmells = [];
  const seen = new Set();

  const imp  = (line, msg, suggestion, sev = 'warning') => dedup(seen, improvements, { type: sev, severity: sev, line, message: msg, suggestion });
  const smell = (line, msg, variable, sev = 'error')   => dedup(seen, codeSmells,   { type: sev, severity: sev, line, message: msg, variable });

  // Imbrication > 3
  lines.forEach((line, i) => {
    const depth = Math.floor(line.match(/^(\s*)/)[0].length / 2);
    if (depth > 6) smell(i + 1, `Imbrication trop profonde (niveau ${Math.floor(depth/2)})`, 'max-depth', 'warning');
  });

  // Lignes > 100
  lines.forEach((line, i) => {
    if (line.length > 100) imp(i + 1, `Ligne trop longue (${line.length} > 100 chars)`, 'Découpez cette ligne');
  });

  // Trop de paramètres (max 7)
  for (const m of code.matchAll(/function\s+(\w+)\s*\(([^)]+)\)/g)) {
    const params = m[2].split(',').filter(p => p.trim());
    if (params.length > 7) smell(lineOf(code, m.index), `Fonction "${m[1]}" a trop de paramètres (${params.length} > 7)`, 'max-params', 'warning');
  }

  // Guillemets doubles (heuristique)
  lines.forEach((line, i) => {
    if (!line.trim().startsWith('//') && /"[^"]*"/.test(line) && !line.includes('`')) {
      imp(i + 1, 'Préférez les guillemets simples aux doubles', "Remplacez \" par '");
    }
  });

  const errorCount   = codeSmells.filter(i => i.severity === 'error').length;
  const warningCount = [...improvements, ...codeSmells].filter(i => i.severity === 'warning').length;

  return { success: true, improvements, codeSmells, conventionCount: 0, warningCount, refactorCount: 0, errorCount, isStatic: true };
}

// ─────────────────────────────────────────────────────────────
//  FUSION
// ─────────────────────────────────────────────────────────────
function mergeResults(raw, stat) {
  const dk = i => `${i.line}-${(i.message || '').substring(0, 35)}`;
  const rawImpKeys   = new Set((raw.improvements || []).map(dk));
  const rawSmellKeys = new Set((raw.codeSmells   || []).map(dk));

  return {
    ...raw,
    success:         true,
    improvements:    [...(raw.improvements || []), ...(stat.improvements || []).filter(i => !rawImpKeys.has(dk(i)))],
    codeSmells:      [...(raw.codeSmells   || []), ...(stat.codeSmells   || []).filter(i => !rawSmellKeys.has(dk(i)))],
    errorCount:      (raw.errorCount      || 0) + (stat.errorCount      || 0),
    warningCount:    (raw.warningCount     || 0) + (stat.warningCount    || 0),
    conventionCount: (raw.conventionCount  || 0) + (stat.conventionCount || 0),
    refactorCount:   (raw.refactorCount    || 0) + (stat.refactorCount   || 0),
    score:           raw.score,
  };
}

// ─────────────────────────────────────────────────────────────
//  CALCUL DU SCORE — graduel, réaliste, jamais 0 sauf erreur grave
// ─────────────────────────────────────────────────────────────
/**
 * Modèle de score :
 *
 * BASE = 100 − pénalités_pondérées
 *
 * Pénalités par ÉLÉMENT :
 *   error     → −10  (plafonné à −40 total pour cette catégorie)
 *   refactor  → −5   (plafonné à −20)
 *   warning   → −3   (plafonné à −15)
 *   convention→ −1.5 (plafonné à −10)
 *
 * Pénalité de DENSITÉ :
 *   (nbProblèmes / max(LOC, 1)) * 20  → problèmes tous les 5 lignes = −20
 *
 * BONUS :
 *   +5  commentRatio ≥ 10 %
 *   +3  docstrings ≥ 2 (Python)
 *   +3  commentRatio ≥ 20 %
 *
 * Pour Python : score Pylint /10 × 10 = score sur 100
 *   Score final = 60 % (pénalités) + 40 % (Pylint normalisé)
 *   → ancrage sur la vraie note Pylint
 *
 * Résultat clamped [5 .. 97] pour éviter les extrêmes artificiels
 * Sauf si errorCount ≥ 8 → min descend à 0 (code vraiment cassé)
 */
function calculateQualityScore(results, metrics, lang) {
  if (!results.success) return 0;

  const codeSmells   = results.codeSmells   || [];
  const improvements = results.improvements || [];
  const LOC = Math.max(metrics?.codeLines || metrics?.totalLines || 1, 1);

  // ── Pénalités par élément ────────────────────────────────
  const pen = { error: 0, refactor: 0, warning: 0, convention: 0, info: 0 };
  const cap = { error: 40, refactor: 20, warning: 15, convention: 10, info: 3 };

  codeSmells.forEach(s => {
    if      (s.severity === 'error')   pen.error    = Math.min(cap.error,    pen.error    + 10);
    else if (s.severity === 'refactor')pen.refactor = Math.min(cap.refactor, pen.refactor + 5);
    else                               pen.warning  = Math.min(cap.warning,  pen.warning  + 3);
  });
  improvements.forEach(i => {
    if      (i.severity === 'warning')   pen.warning    = Math.min(cap.warning,    pen.warning    + 3);
    else if (i.severity === 'convention')pen.convention = Math.min(cap.convention, pen.convention + 1.5);
    else                                 pen.info       = Math.min(cap.info,       pen.info       + 0.5);
  });

  const penaltyByItems = pen.error + pen.refactor + pen.warning + pen.convention + pen.info;

  // ── Pénalité de densité ──────────────────────────────────
  const totalProblems = codeSmells.length + improvements.length;
  const density = totalProblems / LOC;  // ex: 0.2 = 1 pb toutes 5 lignes
  const penaltyDensity = Math.min(25, density * 20);

  // ── Score de base ────────────────────────────────────────
  let baseScore = 100 - penaltyByItems - penaltyDensity;

  // ── Bonus qualité ────────────────────────────────────────
  const commentRatio = metrics?.commentRatio || 0;
  const docstrings   = metrics?.docstrings   || 0;
  let bonus = 0;
  if (commentRatio >= 20) bonus += 5;
  else if (commentRatio >= 10) bonus += 3;
  if (lang === 'python' && docstrings >= 2) bonus += 3;
  else if (lang === 'python' && docstrings >= 1) bonus += 1;

  baseScore += bonus;

  // ── Pour Python : pondération avec score Pylint ──────────
  let finalScore;
  if (lang === 'python' && results.score !== undefined) {
    // Pylint score [0-10] → [0-100]
    const pylintNorm = Math.max(0, Math.min(100, Math.round(results.score * 10)));
    // 60 % pénalités item + 40 % pylint → ancrage sur la note officielle
    finalScore = Math.round(baseScore * 0.6 + pylintNorm * 0.4);
  } else {
    finalScore = Math.round(baseScore);
  }

  // ── Clamp réaliste ───────────────────────────────────────
  const minScore = (results.errorCount || 0) >= 8 ? 0 : 5;
  const maxScore = totalProblems === 0 ? 97 : 95;

  finalScore = Math.max(minScore, Math.min(maxScore, finalScore));

  const errC = results.errorCount || 0;
  const wrnC = results.warningCount || 0;
  const conC = results.conventionCount || 0;
  const refC = results.refactorCount || 0;
  console.log(
    `🏆 Score ${lang}: E=${errC} W=${wrnC} C=${conC} R=${refC} | `
    + `density=${density.toFixed(3)} | pen=${penaltyByItems.toFixed(1)}+${penaltyDensity.toFixed(1)} | `
    + `bonus=${bonus} → ${finalScore}/100`
  );

  return finalScore;
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
  return map[language.toLowerCase()] || language.toLowerCase();
}

function simulateAnalysis(code, language) {
  const lines = code.split('\n').length;
  return {
    success: true, simulated: true,
    errors: [], warnings: [],
    improvements: [{ type: 'info', severity: 'info', line: 1,
      message: `Analyse statique uniquement pour ${language}`,
      suggestion: 'Support ESLint/Pylint non disponible pour ce langage' }],
    codeSmells: [],
    errorCount: 0, warningCount: 0,
    metrics: { totalLines: lines, characters: code.length, functions: Math.floor(lines / 10), classes: Math.floor(lines / 50) },
  };
}

function calculateMetrics(code) {
  const lines = code.split('\n');
  return {
    totalLines:    lines.length,
    codeLines:     lines.filter(l => l.trim().length > 0 && !l.trim().startsWith('//')).length,
    commentLines:  lines.filter(l => l.trim().startsWith('//')).length,
    emptyLines:    lines.filter(l => l.trim().length === 0).length,
    characters:    code.length,
    avgLineLength: Math.round(code.length / Math.max(lines.length, 1)),
    commentRatio:  0,
  };
}

module.exports = { analyzeCode, calculateQualityScore, calculateMetrics, normalizeLanguage };