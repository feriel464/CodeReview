/**
 * Module d'analyse ESLint
 * Analyse le code JavaScript/TypeScript et retourne les erreurs/warnings
 */

const { ESLint } = require('eslint');

/**
 * Analyse du code JavaScript avec ESLint
 * @param {string} code - Le code source à analyser
 * @returns {Promise<Object>} - Résultats d'analyse standardisés
 */
async function analyzeJavaScript(code) {
  try {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [
        {
          languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            globals: {
              window: 'readonly',
              document: 'readonly',
              console: 'readonly',
              process: 'readonly',
              require: 'readonly',
              module: 'readonly',
              exports: 'readonly',
              __dirname: 'readonly',
              __filename: 'readonly',
              Buffer: 'readonly',
              setTimeout: 'readonly',
              setInterval: 'readonly',
              clearTimeout: 'readonly',
              clearInterval: 'readonly'
            }
          },
          rules: {
            // ✅ Erreurs critiques
            'no-undef':           'error',
            'no-unreachable':     'error',
            'no-const-assign':    'error',
            'no-dupe-keys':       'error',
            'no-duplicate-case':  'error',
            'no-extra-semi':      'error',
            'no-func-assign':     'error',
            'no-irregular-whitespace': 'error',
            'no-sparse-arrays':   'error',
            'use-isnan':          'error',
            'valid-typeof':       'error',

            // ✅ Warnings (mauvaises pratiques)
            'no-unused-vars':     'warn',
            'no-console':         'off',
            'semi':               ['warn', 'always'],
            'quotes':             ['warn', 'single'],
            'no-empty':           'warn',

            // ✅ FIX: Règles supplémentaires pour mieux détecter les problèmes
            'no-var':                   'warn',   // Préférer let/const
            'prefer-const':             'warn',   // Préférer const quand possible
            'eqeqeq':                   'warn',   // Utiliser === au lieu de ==
            'no-eval':                  'error',  // Interdire eval()
            'no-implied-eval':          'error',  // Interdire eval implicite
            'no-alert':                 'warn',   // Éviter alert/confirm
            'no-debugger':              'error',  // Interdire debugger
            'no-duplicate-imports':     'error',  // Interdire imports dupliqués
            'no-self-compare':          'error',  // Comparaison avec soi-même
            'no-throw-literal':         'error',  // throw doit être une Error
            'no-useless-concat':        'warn',   // Concaténation inutile
            'no-useless-return':        'warn',   // Return inutile
            'prefer-template':          'warn',   // Template literals
            'yoda':                     'warn',   // Conditions yoda
            'no-lonely-if':             'warn',   // if seul dans else
            'no-unneeded-ternary':      'warn',   // Ternaire inutile
            'max-depth':               ['warn', { max: 3 }],  // ✅ Profondeur max d'imbrication
            'max-params':              ['warn', { max: 5 }],  // ✅ Trop de paramètres
            'max-lines-per-function':  ['warn', { max: 50, skipComments: true }], // ✅ Fonction trop longue
            'complexity':              ['warn', { max: 10 }], // ✅ Complexité cyclomatique
          }
        }
      ]
    });

    const results = await eslint.lintText(code, {
      filePath: 'code.js'
    });

    return parseESLintResults(results);

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse ESLint:', error);
    
    return {
      success: false,
      error: error.message,
      errors: [],
      warnings: [],
      info: [],
      errorCount: 0,
      warningCount: 0,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
      improvements: [],
      codeSmells: []
    };
  }
}

/**
 * Parse les résultats bruts d'ESLint en format standardisé
 */
function parseESLintResults(results) {
  const messages = results[0]?.messages || [];
  
  const errors   = [];
  const warnings = [];
  const info     = [];

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
      fixable:      msg.fix ? true : false
    };

    if (msg.severity === 2) {
      errors.push(item);
    } else if (msg.severity === 1) {
      warnings.push(item);
    } else {
      info.push(item);
    }
  });

  const errorCount          = results[0]?.errorCount          || 0;
  const warningCount        = results[0]?.warningCount        || 0;
  const fixableErrorCount   = results[0]?.fixableErrorCount   || 0;
  const fixableWarningCount = results[0]?.fixableWarningCount || 0;

  // ✅ FIX: Construire improvements depuis TOUS les warnings (incluant les nouvelles règles)
  const improvements = warnings.map(w => ({
    type:       w.ruleId,
    severity:   'warning',
    line:       w.line,
    column:     w.column,
    message:    w.message,
    suggestion: getRuleSuggestion(w.ruleId)
  }));

  // ✅ FIX: Construire codeSmells depuis TOUTES les erreurs
  const codeSmells = errors.map(e => ({
    type:     e.ruleId,
    severity: 'error',
    line:     e.line,
    message:  e.message,
    variable: e.ruleId
  }));

  return {
    success: true,
    errors,
    warnings,
    info,
    errorCount,
    warningCount,
    fixableErrorCount,
    fixableWarningCount,
    totalProblems: errorCount + warningCount,
    improvements,
    codeSmells
  };
}

/**
 * ✅ NOUVEAU: Retourne une suggestion lisible pour chaque règle ESLint
 */
function getRuleSuggestion(ruleId) {
  const suggestions = {
    'no-unused-vars':          'Supprimez les variables déclarées mais non utilisées',
    'semi':                    'Ajoutez un point-virgule à la fin de cette instruction',
    'quotes':                  'Utilisez des guillemets simples (single quotes) de manière cohérente',
    'no-var':                  'Remplacez "var" par "let" ou "const" (ES6+)',
    'prefer-const':            'Utilisez "const" pour les variables qui ne sont jamais réassignées',
    'eqeqeq':                  'Utilisez "===" (égalité stricte) au lieu de "==" pour éviter les conversions implicites',
    'no-alert':                'Évitez alert/confirm/prompt en production, utilisez une UI dédiée',
    'no-useless-concat':       'Cette concaténation peut être simplifiée',
    'no-useless-return':       'Ce return ne retourne rien d\'utile et peut être supprimé',
    'prefer-template':         'Utilisez un template literal (`${variable}`) au lieu de la concaténation',
    'yoda':                    'Inversez la condition : mettez la variable à gauche (style non-yoda)',
    'no-lonely-if':            'Fusionnez ce "if" avec le "else" parent avec "else if"',
    'no-unneeded-ternary':     'Ce ternaire peut être simplifié',
    'max-depth':               'La profondeur d\'imbrication est trop élevée (max 3). Refactorisez avec des fonctions',
    'max-params':              'Cette fonction a trop de paramètres (max 5). Utilisez un objet de configuration',
    'max-lines-per-function':  'Cette fonction est trop longue. Découpez-la en sous-fonctions',
    'complexity':              'La complexité cyclomatique est trop élevée. Simplifiez la logique',
    'no-empty':                'Ce bloc est vide. Ajoutez du code ou un commentaire explicatif',
    'no-debugger':             'Supprimez le "debugger" avant de déployer en production',
  };

  return suggestions[ruleId] || `Règle ESLint: ${ruleId}`;
}

module.exports = {
  analyzeJavaScript,
  parseESLintResults
};