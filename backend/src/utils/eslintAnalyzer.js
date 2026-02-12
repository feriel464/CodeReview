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
    // 1. Créer une instance ESLint avec configuration
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [
        {
          languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            globals: {
              // Variables globales navigateur
              window: 'readonly',
              document: 'readonly',
              console: 'readonly',
              // Variables globales Node.js
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
            'no-unused-vars': 'warn',
            'no-console': 'off',
            'no-undef': 'error',
            'semi': ['error', 'always'],
            'quotes': ['warn', 'single'],
            'no-unreachable': 'error',
            'no-const-assign': 'error',
            'no-dupe-keys': 'error',
            'no-duplicate-case': 'error',
            'no-empty': 'warn',
            'no-extra-semi': 'error',
            'no-func-assign': 'error',
            'no-irregular-whitespace': 'error',
            'no-sparse-arrays': 'error',
            'use-isnan': 'error',
            'valid-typeof': 'error'
          }
        }
      ]
    });

    // 2. Analyser le code
    const results = await eslint.lintText(code, {
      filePath: 'code.js'
    });

    // 3. Parser et retourner les résultats
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
      fixableWarningCount: 0
    };
  }
}

/**
 * Parse les résultats bruts d'ESLint en format standardisé
 * @param {Array} results - Résultats bruts d'ESLint
 * @returns {Object} - Résultats formatés
 */
function parseESLintResults(results) {
  const messages = results[0]?.messages || [];
  
  const errors = [];
  const warnings = [];
  const info = [];

  messages.forEach(msg => {
    const item = {
      line: msg.line,
      column: msg.column,
      endLine: msg.endLine,
      endColumn: msg.endColumn,
      message: msg.message,
      ruleId: msg.ruleId || 'unknown',
      severity: msg.severity,
      severityText: msg.severity === 2 ? 'error' : msg.severity === 1 ? 'warning' : 'info',
      fixable: msg.fix ? true : false
    };

    if (msg.severity === 2) {
      errors.push(item);
    } else if (msg.severity === 1) {
      warnings.push(item);
    } else {
      info.push(item);
    }
  });

  const errorCount = results[0]?.errorCount || 0;
  const warningCount = results[0]?.warningCount || 0;
  const fixableErrorCount = results[0]?.fixableErrorCount || 0;
  const fixableWarningCount = results[0]?.fixableWarningCount || 0;

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
    improvements: warnings.map(w => ({
      type: w.ruleId,
      severity: 'warning',
      line: w.line,
      column: w.column,
      message: w.message,
      suggestion: `Règle: ${w.ruleId}`
    })),
    codeSmells: errors.filter(e => e.ruleId !== 'no-undef' && e.ruleId !== 'semi').map(e => ({
      type: e.ruleId,
      severity: 'error',
      line: e.line,
      message: e.message,
      variable: e.ruleId
    }))
  };
}

module.exports = {
  analyzeJavaScript,
  parseESLintResults
};