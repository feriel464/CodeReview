/**
 * Module d'analyse ESLint — config alignée sur eslint.config.js fourni
 * Retourne un résultat normalisé avec improvements + codeSmells + métriques
 */

const { ESLint } = require('eslint');

// ─────────────────────────────────────────────────────────────
//  RÈGLES — miroir exact de votre eslint.config.js + extensions
// ─────────────────────────────────────────────────────────────
const ESLINT_RULES = {
  // ── Erreurs critiques ───────────────────────────────────────
  'no-undef':                  'error',
  'no-unreachable':            'error',
  'no-const-assign':           'error',
  'no-dupe-keys':              'error',
  'no-duplicate-case':         'error',
  'no-extra-semi':             'error',
  'no-func-assign':            'error',
  'no-irregular-whitespace':   'error',
  'no-sparse-arrays':          'error',
  'use-isnan':                 'error',
  'valid-typeof':              'error',
  'no-eval':                   'error',
  'no-implied-eval':           'error',
  'no-debugger':               'error',
  'no-duplicate-imports':      'error',
  'no-self-compare':           'error',
  'no-throw-literal':          'error',
  'no-constant-condition':     'error',
  'no-empty-pattern':          'error',
  'no-new-symbol':             'error',
  'no-obj-calls':              'error',
  'no-unexpected-multiline':   'error',
  'no-unsafe-finally':         'error',

  // ── Warnings (mauvaises pratiques) ─────────────────────────
  'no-unused-vars':            'warn',
  'no-console':                'off',   // Autorisé (config originale)
  'semi':                     ['warn', 'always'],
  'quotes':                   ['warn', 'single'],
  'no-var':                   'warn',
  'prefer-const':              'warn',
  'eqeqeq':                   'warn',
  'no-alert':                  'warn',
  'no-useless-concat':         'warn',
  'no-useless-return':         'warn',
  'prefer-template':           'warn',
  'yoda':                      'warn',
  'no-lonely-if':              'warn',
  'no-unneeded-ternary':       'warn',
  'no-empty':                  'warn',
  'no-multiple-empty-lines':  ['warn', { max: 2 }],
  'no-trailing-spaces':        'warn',
  'space-before-blocks':       'warn',
  'keyword-spacing':           'warn',
  'space-infix-ops':           'warn',
  'comma-spacing':             'warn',
  'object-curly-spacing':     ['warn', 'always'],
  'array-bracket-spacing':    ['warn', 'never'],
  'arrow-spacing':             'warn',
  'prefer-arrow-callback':     'warn',
  'no-useless-escape':         'warn',
  'no-shadow':                 'warn',
  'default-case':              'warn',
  'dot-notation':              'warn',
  'guard-for-in':              'warn',
  'no-else-return':            'warn',
  'no-loop-func':              'warn',
  'no-magic-numbers':         ['warn', { ignore: [0, 1, -1, 2, 100], ignoreArrayIndexes: true }],
  'radix':                     'warn',
  'wrap-iife':                ['warn', 'inside'],

  // ── Règles de complexité / structure ───────────────────────
  'max-depth':               ['warn', { max: 3 }],
  'max-params':              ['warn', { max: 7 }],  // aligné sur votre pylintrc max-args=7
  'max-lines-per-function':  ['warn', { max: 50, skipComments: true, skipBlankLines: true }],
  'complexity':              ['warn', { max: 10 }],
  'max-len':                 ['warn', { code: 100, ignoreUrls: true, ignoreStrings: true }],
};

const GLOBALS = {
  window: 'readonly', document: 'readonly', console: 'readonly',
  process: 'readonly', require: 'readonly', module: 'readonly',
  exports: 'readonly', __dirname: 'readonly', __filename: 'readonly',
  Buffer: 'readonly', setTimeout: 'readonly', setInterval: 'readonly',
  clearTimeout: 'readonly', clearInterval: 'readonly',
  Promise: 'readonly', Symbol: 'readonly', Set: 'readonly',
  Map: 'readonly', WeakMap: 'readonly', WeakSet: 'readonly',
  Proxy: 'readonly', Reflect: 'readonly', fetch: 'readonly',
  URL: 'readonly', URLSearchParams: 'readonly',
  parseInt: 'readonly', parseFloat: 'readonly', isNaN: 'readonly',
  isFinite: 'readonly', encodeURIComponent: 'readonly',
  decodeURIComponent: 'readonly', JSON: 'readonly',
  Math: 'readonly', Date: 'readonly', Error: 'readonly',
  Object: 'readonly', Array: 'readonly', String: 'readonly',
  Number: 'readonly', Boolean: 'readonly', RegExp: 'readonly',
  undefined: 'readonly', null: 'readonly', true: 'readonly', false: 'readonly',
};

// ─────────────────────────────────────────────────────────────
//  ANALYSE PRINCIPALE
// ─────────────────────────────────────────────────────────────
async function analyzeJavaScript(code) {
  try {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [
        {
          languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            globals: GLOBALS,
          },
          rules: ESLINT_RULES,
        },
      ],
    });

    const results = await eslint.lintText(code, { filePath: 'code.js' });
    return parseESLintResults(results, code);

  } catch (error) {
    console.error('❌ Erreur ESLint:', error);
    return {
      success: false, error: error.message,
      errors: [], warnings: [], info: [],
      errorCount: 0, warningCount: 0,
      fixableErrorCount: 0, fixableWarningCount: 0,
      improvements: [], codeSmells: [],
    };
  }
}

// ─────────────────────────────────────────────────────────────
//  PARSING
// ─────────────────────────────────────────────────────────────
function parseESLintResults(results, code) {
  const messages = results[0]?.messages || [];
  const errors = [], warnings = [], info = [];

  messages.forEach(msg => {
    const item = {
      line:         msg.line,
      column:       msg.column,
      endLine:      msg.endLine,
      endColumn:    msg.endColumn,
      message:      msg.message,
      ruleId:       msg.ruleId || 'unknown',
      severity:     msg.severity,
      severityText: msg.severity === 2 ? 'error' : msg.severity === 1 ? 'warning' : 'info',
      fixable:      !!msg.fix,
    };
    if (msg.severity === 2) errors.push(item);
    else if (msg.severity === 1) warnings.push(item);
    else info.push(item);
  });

  const errorCount          = results[0]?.errorCount          || 0;
  const warningCount        = results[0]?.warningCount        || 0;
  const fixableErrorCount   = results[0]?.fixableErrorCount   || 0;
  const fixableWarningCount = results[0]?.fixableWarningCount || 0;

  // Construire improvements (warnings) + codeSmells (errors)
  const improvements = warnings.map(w => ({
    type:       w.ruleId,
    severity:   'warning',
    line:       w.line,
    column:     w.column,
    message:    w.message,
    suggestion: getRuleSuggestion(w.ruleId),
  }));

  const codeSmells = errors.map(e => ({
    type:     e.ruleId,
    severity: 'error',
    line:     e.line,
    message:  e.message,
    variable: e.ruleId,
  }));

  // ── Métriques statiques supplémentaires ───────────────────
  const metrics = computeJSMetrics(code);

  return {
    success: true,
    errors, warnings, info,
    errorCount, warningCount,
    fixableErrorCount, fixableWarningCount,
    totalProblems: errorCount + warningCount,
    improvements, codeSmells, metrics,
  };
}

// ─────────────────────────────────────────────────────────────
//  MÉTRIQUES JS
// ─────────────────────────────────────────────────────────────
function computeJSMetrics(code) {
  const lines = code.split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  const comments = lines.filter(l => {
    const t = l.trim();
    return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
  });
  const functionMatches = code.match(/(?:function\s+\w+|\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>|\bconst\s+\w+\s*=\s*function)/g) || [];
  const classMatches    = code.match(/\bclass\s+\w+/g) || [];
  const importMatches   = code.match(/\b(?:import|require)\s*[({'"]/g) || [];
  const commentRatio    = nonEmpty.length > 0 ? Math.round((comments.length / nonEmpty.length) * 100) : 0;
  const avgLineLen      = lines.length > 0 ? Math.round(code.length / lines.length) : 0;
  const longLines       = lines.filter(l => l.length > 100).length;

  return {
    totalLines:      lines.length,
    codeLines:       nonEmpty.length,
    commentLines:    comments.length,
    emptyLines:      lines.length - nonEmpty.length,
    commentRatio,
    characters:      code.length,
    avgLineLength:   avgLineLen,
    longLines,
    functions:       functionMatches.length,
    classes:         classMatches.length,
    imports:         importMatches.length,
  };
}

// ─────────────────────────────────────────────────────────────
//  SUGGESTIONS PAR RÈGLE
// ─────────────────────────────────────────────────────────────
function getRuleSuggestion(ruleId) {
  const suggestions = {
    'no-unused-vars':         'Supprimez les variables déclarées mais non utilisées',
    'semi':                   'Ajoutez un point-virgule à la fin de cette instruction',
    'quotes':                 'Utilisez des guillemets simples de manière cohérente',
    'no-var':                 'Remplacez "var" par "let" ou "const" (ES6+)',
    'prefer-const':           'Utilisez "const" pour les variables jamais réassignées',
    'eqeqeq':                 'Utilisez "===" (égalité stricte) au lieu de "=="',
    'no-alert':               'Évitez alert/confirm/prompt en production',
    'no-useless-concat':      'Cette concaténation peut être simplifiée',
    'no-useless-return':      'Ce return est inutile et peut être supprimé',
    'prefer-template':        'Utilisez les template literals (`${var}`) au lieu de la concaténation',
    'yoda':                   'Inversez la condition (variable à gauche)',
    'no-lonely-if':           'Fusionnez avec "else if"',
    'no-unneeded-ternary':    'Ce ternaire peut être simplifié',
    'max-depth':              'Imbrication trop profonde (max 3). Refactorisez avec des fonctions',
    'max-params':             'Trop de paramètres (max 7). Utilisez un objet de configuration',
    'max-lines-per-function': 'Fonction trop longue. Découpez-la en sous-fonctions',
    'complexity':             'Complexité cyclomatique trop élevée. Simplifiez la logique',
    'no-empty':               'Ce bloc est vide. Ajoutez du code ou un commentaire',
    'no-debugger':            'Supprimez le "debugger" avant de déployer',
    'no-undef':               'Variable non définie. Déclarez-la ou vérifiez l\'import',
    'no-shadow':              'Cette variable masque une variable du scope parent',
    'default-case':           'Ajoutez un "default" dans ce switch',
    'dot-notation':           'Utilisez la notation pointée (obj.key) au lieu de obj["key"]',
    'guard-for-in':           'Ajoutez un hasOwnProperty() dans cette boucle for-in',
    'no-else-return':         'Supprimez le "else" après un "return"',
    'no-loop-func':           'Évitez de créer des fonctions dans une boucle',
    'no-magic-numbers':       'Remplacez ce nombre magique par une constante nommée',
    'radix':                  'Passez la base (ex: 10) à parseInt()',
    'max-len':                'Ligne trop longue (>100 chars). Découpez-la',
    'no-multiple-empty-lines':'Trop de lignes vides consécutives',
    'no-trailing-spaces':     'Supprimez les espaces en fin de ligne',
    'space-before-blocks':    'Ajoutez un espace avant le bloc {',
    'keyword-spacing':        'Ajoutez un espace autour des mots-clés',
    'space-infix-ops':        'Ajoutez des espaces autour des opérateurs',
    'object-curly-spacing':   'Ajoutez des espaces à l\'intérieur des accolades { }',
    'arrow-spacing':          'Ajoutez des espaces autour de =>',
    'prefer-arrow-callback':  'Utilisez une fonction fléchée comme callback',
    'no-useless-escape':      'Ce caractère d\'échappement est inutile',
  };
  return suggestions[ruleId] || `Règle ESLint: ${ruleId}`;
}

module.exports = { analyzeJavaScript, parseESLintResults };