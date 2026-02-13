/**
 * Module central d'analyse de code
 * Unifie tous les analyseurs (ESLint, Pylint, etc.)
 * + Analyse statique manuelle pour garantir un score réaliste
 */

const { analyzeJavaScript } = require('./eslintAnalyzer');
const { analyzePython } = require('./pylintAnalyzer');

// ─────────────────────────────────────────────────────────────
//  ENTRÉE PRINCIPALE
// ─────────────────────────────────────────────────────────────
async function analyzeCode(code, language) {
  console.log(`🔬 Analyse du code ${language}...`);

  try {
    const normalizedLanguage = normalizeLanguage(language);

    let rawResults;

    switch (normalizedLanguage) {
      case 'javascript':
      case 'js':
        console.log('📜 Utilisation de ESLint');
        rawResults = await analyzeJavaScript(code);
        break;
      case 'typescript':
      case 'ts':
        console.log('💠 Utilisation de ESLint (TypeScript)');
        rawResults = await analyzeJavaScript(code);
        break;
      case 'python':
      case 'py':
        console.log('🐍 Utilisation de Pylint');
        rawResults = await analyzePython(code);
        break;
      default:
        console.log('⚠️  Langage non supporté, simulation');
        rawResults = simulateAnalysis(code, language);
    }

    // ✅ Analyse statique manuelle (toujours exécutée)
    const staticResults = runStaticAnalysis(code, normalizedLanguage);

    // ✅ Fusion des résultats
    const mergedResults = mergeResults(rawResults, staticResults, normalizedLanguage);

    // ✅ Calcul du score basé sur la fusion
    const qualityScore = calculateQualityScore(mergedResults, normalizedLanguage);

    console.log(`🎯 Score final: ${qualityScore}/100`);

    return {
      ...mergedResults,
      qualityScore,
      language: normalizedLanguage,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Erreur analyse code:', error);
    return {
      success: false,
      error: error.message,
      qualityScore: 0,
      errors: [],
      warnings: [],
      improvements: [],
      codeSmells: [],
      errorCount: 0,
      warningCount: 0
    };
  }
}

// ─────────────────────────────────────────────────────────────
//  ANALYSE STATIQUE MANUELLE
// ─────────────────────────────────────────────────────────────
function runStaticAnalysis(code, language) {
  if (language === 'python' || language === 'py') {
    return staticAnalyzePython(code);
  }
  if (['javascript','typescript','js','ts'].includes(language)) {
    return staticAnalyzeJS(code);
  }
  return { improvements: [], codeSmells: [], errorCount: 0, warningCount: 0, conventionCount: 0, refactorCount: 0 };
}

// ─── Analyse statique Python ─────────────────────────────────
function staticAnalyzePython(code) {
  const lines = code.split('\n');
  const improvements = [];
  const codeSmells   = [];
  const seen = new Set();

  const addImp = (line, msg, suggestion, type = 'convention') => {
    const key = `${line}-${msg.substring(0,40)}`;
    if (!seen.has(key)) { seen.add(key); improvements.push({ type, severity: type, line, message: msg, suggestion }); }
  };
  const addSmell = (line, msg, variable, type = 'warning') => {
    const key = `${line}-${msg.substring(0,40)}`;
    if (!seen.has(key)) { seen.add(key); codeSmells.push({ type, severity: type, line, message: msg, variable }); }
  };

  // 1. Imbrication trop profonde
  lines.forEach((line, idx) => {
    const depth = Math.floor(line.match(/^(\s*)/)[1].length / 4);
    if (depth >= 4) addSmell(idx + 1, `Imbrication trop profonde (niveau ${depth})`, 'too-many-nested-blocks', 'refactor');
  });

  // 2. Fonctions mal nommées (pas snake_case)
  for (const m of code.matchAll(/^def ([A-Z][a-zA-Z0-9]*|[a-z]+[A-Z][a-zA-Z0-9]*)\s*\(/gm)) {
    const ln = code.substring(0, m.index).split('\n').length;
    addImp(ln, `Fonction "${m[1]}" devrait être en snake_case`, `Renommez en: "${toSnakeCase(m[1])}"`);
  }

  // 3. Classes mal nommées (pas PascalCase)
  for (const m of code.matchAll(/^class ([a-z][a-zA-Z0-9]*)\s*[:(]/gm)) {
    const ln = code.substring(0, m.index).split('\n').length;
    addImp(ln, `Classe "${m[1]}" devrait être en PascalCase`, `Renommez en: "${toPascalCase(m[1])}"`);
  }

  // 4. Variables locales mal nommées
  for (const m of code.matchAll(/^\s{4,}([A-Z][a-zA-Z0-9]*)\s*=/gm)) {
    const ln = code.substring(0, m.index).split('\n').length;
    addImp(ln, `Variable locale "${m[1]}" devrait être en snake_case`, `Renommez en: "${toSnakeCase(m[1])}"`);
  }

  // 5. Variables globales PascalCase (pas constantes)
  for (const m of code.matchAll(/^([A-Z][a-z][a-zA-Z0-9]*)\s*=/gm)) {
    const ln = code.substring(0, m.index).split('\n').length;
    addImp(ln, `Variable globale "${m[1]}" devrait être en UPPER_CASE ou snake_case`, 'Utilisez UPPER_CASE pour constantes ou snake_case pour variables');
  }

  // 6. Trop de paramètres
  for (const m of code.matchAll(/^def (\w+)\(([^)]+)\)/gm)) {
    const params = m[2].split(',').filter(p => p.trim() && p.trim() !== 'self');
    if (params.length > 5) {
      const ln = code.substring(0, m.index).split('\n').length;
      addSmell(ln, `Fonction "${m[1]}" a trop de paramètres (${params.length} > 5)`, 'too-many-arguments', 'refactor');
    }
  }

  // 7. Nom de fonction trop long
  for (const m of code.matchAll(/^def ([a-zA-Z_]{40,})\s*\(/gm)) {
    const ln = code.substring(0, m.index).split('\n').length;
    addImp(ln, `Nom de fonction trop long (${m[1].length} chars)`, 'Raccourcissez le nom pour améliorer la lisibilité');
  }

  // 8. Imports inutilisés
  for (const m of code.matchAll(/^import (\w+)$/gm)) {
    const mod = m[1];
    if (![...code.matchAll(new RegExp(`\\b${mod}\\s*\\.`, 'g'))].length) {
      const ln = code.substring(0, m.index).split('\n').length;
      addSmell(ln, `Import inutilisé: "${mod}"`, 'unused-import', 'warning');
    }
  }

  // 9. Variables assignées mais jamais utilisées
  for (const m of code.matchAll(/^\s{4,}(\w+)\s*=\s*[^=]/gm)) {
    const vn = m[1];
    if (vn === '_' || vn.startsWith('__')) continue;
    const after = code.substring(m.index + m[0].length);
    if (![...after.matchAll(new RegExp(`\\b${vn}\\b`, 'g'))].length) {
      const ln = code.substring(0, m.index).split('\n').length;
      addImp(ln, `Variable "${vn}" assignée mais jamais utilisée`, 'Supprimez-la ou utilisez-la', 'warning');
    }
  }

  // 10. Lignes trop longues
  lines.forEach((line, idx) => {
    if (line.length > 79) addImp(idx + 1, `Ligne trop longue (${line.length} > 79 chars PEP8)`, 'Découpez cette ligne');
  });

  // 11. Fonctions sans docstring
  for (const m of code.matchAll(/^(def \w+\([^)]*\):)\s*\n(\s*)(?!""")/gm)) {
    const ln = code.substring(0, m.index).split('\n').length;
    addImp(ln, `Fonction sans docstring`, 'Ajoutez une docstring: """Description."""');
  }

  const conventionCount = improvements.filter(i => i.severity === 'convention').length;
  const warningCount    = [...improvements, ...codeSmells].filter(i => i.severity === 'warning').length;
  const refactorCount   = codeSmells.filter(i => i.severity === 'refactor').length;
  const errorCount      = codeSmells.filter(i => i.severity === 'error').length;

  console.log(`📊 Static Python: ${conventionCount} conventions, ${warningCount} warnings, ${refactorCount} refactors`);
  return { success: true, improvements, codeSmells, conventionCount, warningCount, refactorCount, errorCount, isStatic: true };
}

// ─── Analyse statique JavaScript ─────────────────────────────
function staticAnalyzeJS(code) {
  const lines = code.split('\n');
  const improvements = [];
  const codeSmells   = [];
  const seen = new Set();

  const addImp = (line, msg, suggestion, type = 'warning') => {
    const key = `${line}-${msg.substring(0,40)}`;
    if (!seen.has(key)) { seen.add(key); improvements.push({ type, severity: type, line, message: msg, suggestion }); }
  };
  const addSmell = (line, msg, variable, type = 'error') => {
    const key = `${line}-${msg.substring(0,40)}`;
    if (!seen.has(key)) { seen.add(key); codeSmells.push({ type, severity: type, line, message: msg, variable }); }
  };

  // 1. Point-virgule manquant
  lines.forEach((line, idx) => {
    const t = line.trim();
    if (t.length > 0 && !t.endsWith(';') && !t.endsWith('{') && !t.endsWith('}')
      && !t.endsWith(',') && !t.endsWith('(') && !t.endsWith(')')
      && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
      && !t.startsWith('import ') && !t.startsWith('export ')
      && !/^(if|else|for|while|function|class|try|catch|finally)\b/.test(t)) {
      addImp(idx + 1, `Point-virgule manquant`, 'Ajoutez ";" à la fin de cette instruction');
    }
  });

  // 2. Variables déclarées mais jamais utilisées
  const declaredVars = new Map();
  for (const m of code.matchAll(/(?:const|let|var)\s+(\w+)\s*=/g)) {
    if (!declaredVars.has(m[1])) declaredVars.set(m[1], code.substring(0, m.index).split('\n').length);
  }
  for (const [varName, lineNum] of declaredVars) {
    if ([...code.matchAll(new RegExp(`\\b${varName}\\b`, 'g'))].length <= 1) {
      addImp(lineNum, `Variable "${varName}" déclarée mais jamais utilisée`, 'Supprimez ou utilisez cette variable');
    }
  }

  // 3. Variables non définies utilisées dans console.log
  const allDeclared = new Set([...declaredVars.keys()]);
  const builtins = new Set(['console','Math','JSON','Object','Array','String','Number','Boolean','Date','Error','parseInt','parseFloat','isNaN','undefined','null','true','false','NaN','Infinity','window','document','process','require','module','exports','setTimeout','setInterval']);
  for (const m of code.matchAll(/\bconsole\.log\(\s*(\w+)\s*\)/g)) {
    if (!allDeclared.has(m[1]) && !builtins.has(m[1])) {
      const ln = code.substring(0, m.index).split('\n').length;
      addSmell(ln, `Variable non définie utilisée: "${m[1]}"`, m[1], 'error');
    }
  }

  // 4. Guillemets doubles
  lines.forEach((line, idx) => {
    if (!line.trim().startsWith('//') && /"[^"]*"/.test(line) && !/`/.test(line)) {
      addImp(idx + 1, `Utilisez des guillemets simples au lieu de doubles`, "Remplacez les \" par '");
    }
  });

  // 5. Imbrication trop profonde
  lines.forEach((line, idx) => {
    const depth = Math.floor(line.match(/^(\s*)/)[0].length / 2);
    if (depth > 6) addSmell(idx + 1, `Imbrication trop profonde (niveau ${Math.floor(depth/2)})`, 'max-depth', 'warning');
  });

  // 6. Trop de paramètres
  for (const m of code.matchAll(/function\s+(\w+)\s*\(([^)]+)\)/g)) {
    const params = m[2].split(',').filter(p => p.trim());
    if (params.length > 5) {
      const ln = code.substring(0, m.index).split('\n').length;
      addSmell(ln, `Fonction "${m[1]}" a trop de paramètres (${params.length} > 5)`, 'max-params', 'warning');
    }
  }

  // 7. Nom de fonction trop long
  for (const m of code.matchAll(/function\s+([a-zA-Z_]{40,})\s*\(/g)) {
    const ln = code.substring(0, m.index).split('\n').length;
    addSmell(ln, `Nom de fonction trop long (${m[1].length} chars)`, 'max-len', 'warning');
  }

  // 8. Lignes trop longues
  lines.forEach((line, idx) => {
    if (line.length > 100) addImp(idx + 1, `Ligne trop longue (${line.length} > 100 chars)`, 'Découpez cette ligne');
  });

  const errorCount   = codeSmells.filter(i => i.severity === 'error').length;
  const warningCount = [...improvements, ...codeSmells].filter(i => i.severity === 'warning').length;

  console.log(`📊 Static JS: ${errorCount} erreurs, ${warningCount} warnings`);
  return { success: true, improvements, codeSmells, conventionCount: 0, warningCount, refactorCount: 0, errorCount, isStatic: true };
}

// ─────────────────────────────────────────────────────────────
//  FUSION
// ─────────────────────────────────────────────────────────────
function mergeResults(rawResults, staticResults, language) {
  const rawImprovements    = rawResults.improvements    || [];
  const rawCodeSmells      = rawResults.codeSmells      || [];
  const staticImprovements = staticResults.improvements || [];
  const staticCodeSmells   = staticResults.codeSmells   || [];

  const dk = (item) => `${item.line}-${(item.message||'').substring(0, 30)}`;
  const rawImpKeys   = new Set(rawImprovements.map(dk));
  const rawSmellKeys = new Set(rawCodeSmells.map(dk));

  return {
    ...rawResults,
    success:         true,
    improvements:    [...rawImprovements, ...staticImprovements.filter(i => !rawImpKeys.has(dk(i)))],
    codeSmells:      [...rawCodeSmells,   ...staticCodeSmells.filter(i => !rawSmellKeys.has(dk(i)))],
    errorCount:      Math.max(rawResults.errorCount      || 0, staticResults.errorCount      || 0),
    warningCount:    Math.max(rawResults.warningCount     || 0, staticResults.warningCount    || 0),
    conventionCount: Math.max(rawResults.conventionCount  || 0, staticResults.conventionCount || 0),
    refactorCount:   Math.max(rawResults.refactorCount    || 0, staticResults.refactorCount   || 0),
    score:           rawResults.score
  };
}

// ─────────────────────────────────────────────────────────────
//  SCORE
// ─────────────────────────────────────────────────────────────
function calculateQualityScore(results, language) {
  if (!results.success) return 0;

  let scoreByItems = 100;
  (results.codeSmells || []).forEach(s => {
    if      (s.severity === 'error')   scoreByItems -= 15;
    else if (s.severity === 'refactor') scoreByItems -= 7;
    else                               scoreByItems -= 6;
  });
  (results.improvements || []).forEach(i => {
    if      (i.severity === 'warning') scoreByItems -= 5;
    else                               scoreByItems -= 3;
  });

  let scoreByCounters = 100;
  scoreByCounters -= (results.errorCount      || 0) * 15;
  scoreByCounters -= (results.warningCount     || 0) * 6;
  scoreByCounters -= (results.conventionCount  || 0) * 3;
  scoreByCounters -= (results.refactorCount    || 0) * 7;

  let finalScore;
  if (language === 'python' && results.score !== undefined) {
    const pylintScore = Math.round(results.score * 10);
    finalScore = Math.round(scoreByItems * 0.5 + scoreByCounters * 0.3 + pylintScore * 0.2);
  } else {
    finalScore = Math.round((scoreByItems + scoreByCounters) / 2);
  }

  console.log(`🏆 Score ${language}: items=${((results.improvements||[]).length+(results.codeSmells||[]).length)} → ${Math.max(0,Math.min(100,finalScore))}/100`);
  return Math.max(0, Math.min(100, finalScore));
}

// ─────────────────────────────────────────────────────────────
//  UTILITAIRES
// ─────────────────────────────────────────────────────────────
function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}
function toPascalCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function normalizeLanguage(language) {
  const mapping = {
    'javascript':'javascript','js':'javascript',
    'typescript':'typescript','ts':'typescript',
    'python':'python','py':'python',
    'java':'java','cpp':'cpp','c++':'cpp',
    'csharp':'csharp','c#':'csharp',
    'go':'go','golang':'go','rust':'rust','php':'php','ruby':'ruby'
  };
  return mapping[language.toLowerCase()] || language.toLowerCase();
}
function simulateAnalysis(code, language) {
  const lines = code.split('\n').length;
  return {
    success:true,simulated:true,errors:[],warnings:[],
    improvements:[{type:'info',severity:'info',line:1,message:`Analyse non disponible pour ${language}`,suggestion:'Support à venir'}],
    codeSmells:[],errorCount:0,warningCount:0,
    metrics:{lines,characters:code.length,functions:Math.floor(lines/10),classes:Math.floor(lines/50)}
  };
}
function calculateMetrics(code) {
  const lines = code.split('\n');
  return {
    totalLines:lines.length,
    codeLines:lines.filter(l=>l.trim().length>0&&!l.trim().startsWith('//')).length,
    commentLines:lines.filter(l=>l.trim().startsWith('//')).length,
    emptyLines:lines.filter(l=>l.trim().length===0).length,
    characters:code.length,
    averageLineLength:Math.round(code.length/lines.length)
  };
}

module.exports = { analyzeCode, calculateQualityScore, calculateMetrics, normalizeLanguage };