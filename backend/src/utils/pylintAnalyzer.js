/**
 * Module d'analyse Pylint
 * Analyse le code Python et retourne les erreurs/warnings
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * Analyse du code Python avec Pylint
 * @param {string} code - Le code source Python à analyser
 * @returns {Promise<Object>} - Résultats d'analyse standardisés
 */
async function analyzePython(code) {
  let tempFile = null;

  try {
    tempFile = path.join(__dirname, `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`);
    
    console.log('📝 Création fichier temporaire:', tempFile);
    await fs.writeFile(tempFile, code, 'utf8');

    console.log('🔬 Exécution de Pylint...');
    const pylintOutput = await runPylint(tempFile);

    console.log('📊 Parsing des résultats...');
    const result = parsePylintResults(pylintOutput, code);

    return result;

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse Pylint:', error);
    
    return {
      success: false,
      error: error.message,
      errors: [],
      warnings: [],
      conventions: [],
      refactors: [],
      errorCount: 0,
      warningCount: 0,
      conventionCount: 0,
      refactorCount: 0,
      score: 0,
      improvements: [],
      codeSmells: []
    };

  } finally {
    if (tempFile) {
      try {
        await fs.unlink(tempFile);
        console.log('🗑️  Fichier temporaire supprimé');
      } catch (err) {
        console.error('⚠️  Erreur suppression fichier temp:', err.message);
      }
    }
  }
}

/**
 * Exécute Pylint sur un fichier
 */
function runPylint(filePath) {
  return new Promise((resolve, reject) => {
    // ✅ FIX: Options Pylint enrichies pour détecter plus de problèmes
    // --max-line-length=79        → PEP8 standard
    // --max-args=5                → Limite paramètres
    // --max-nested-blocks=3       → Limite imbrication
    // --min-similarity-lines=4    → Détection code dupliqué
    // --disable=C0114             → Désactiver "missing module docstring" (trop verbeux)
    const command = [
      'py -m pylint',
      `"${filePath}"`,
      '--output-format=json',
      '--score=yes',
      '--max-line-length=79',
      '--max-args=5',
      '--max-nested-blocks=3',
      '--min-similarity-lines=4',
      '--disable=C0114',           // missing-module-docstring (trop verbeux)
    ].join(' ');

    console.log('🚀 Commande:', command);

    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      // Pylint retourne exit code != 0 même avec des warnings → on ne rejette pas
      if (stderr && stderr.length > 0) {
        console.error('⚠️  Pylint stderr:', stderr);
      }
      resolve(stdout);
    });
  });
}

/**
 * Parse les résultats JSON de Pylint
 */
function parsePylintResults(output, code) {
  try {
    const lines = output.split('\n');
    let jsonPart = '';
    let scoreLine = '';

    let inJson = false;
    for (const line of lines) {
      if (line.trim().startsWith('[')) {
        inJson = true;
      }
      if (inJson && (line.trim().startsWith('[') || line.trim().startsWith('{'))) {
        jsonPart += line;
      }
      if (line.includes('rated at')) {
        scoreLine = line;
      }
    }

    let messages = [];
    if (jsonPart.trim()) {
      try {
        messages = JSON.parse(jsonPart);
      } catch (e) {
        console.error('❌ Erreur parsing JSON Pylint:', e.message);
        console.log('JSON brut:', jsonPart.substring(0, 200));
      }
    }

    // Extraire le score Pylint brut
    let score = 10.0;
    if (scoreLine) {
      const scoreMatch = scoreLine.match(/rated at ([\d.]+)\/10/);
      if (scoreMatch) {
        score = parseFloat(scoreMatch[1]);
      }
    }

    const errors      = [];
    const warnings    = [];
    const conventions = [];
    const refactors   = [];
    const info        = [];

    messages.forEach(msg => {
      const item = {
        line:      msg.line,
        column:    msg.column,
        endLine:   msg.endLine,
        endColumn: msg.endColumn,
        message:   msg.message,
        messageId: msg['message-id'] || msg.symbol || 'unknown',
        symbol:    msg.symbol || '',
        type:      msg.type,
        module:    msg.module || '',
        obj:       msg.obj || ''
      };

      switch (msg.type) {
        case 'error':      errors.push(item);      break;
        case 'warning':    warnings.push(item);    break;
        case 'convention': conventions.push(item); break;
        case 'refactor':   refactors.push(item);   break;
        default:           info.push(item);        break;
      }
    });

    const totalLines = code.split('\n').length;

    // ✅ FIX: improvements inclut conventions ET infos utiles
    const improvements = [
      ...conventions.map(c => ({
        type:       c.symbol,
        severity:   'convention',
        line:       c.line,
        column:     c.column,
        message:    c.message,
        suggestion: getPylintSuggestion(c.symbol, c.message)
      })),
      ...info.map(i => ({
        type:       i.symbol,
        severity:   'info',
        line:       i.line,
        column:     i.column,
        message:    i.message,
        suggestion: getPylintSuggestion(i.symbol, i.message)
      }))
    ];

    // ✅ FIX: codeSmells inclut errors + warnings + refactors
    const codeSmells = [
      ...errors.map(e => ({
        type:     e.symbol,
        severity: 'error',
        line:     e.line,
        message:  e.message,
        variable: e.obj || e.symbol
      })),
      ...warnings.map(w => ({
        type:     w.symbol,
        severity: 'warning',
        line:     w.line,
        message:  w.message,
        variable: w.obj || w.symbol
      })),
      ...refactors.map(r => ({
        type:     r.symbol,
        severity: 'refactor',
        line:     r.line,
        message:  r.message,
        variable: r.obj || r.symbol
      }))
    ];

    console.log(`🐍 Pylint: score=${score} erreurs=${errors.length} warnings=${warnings.length} conventions=${conventions.length} refactors=${refactors.length}`);

    return {
      success:         true,
      score:           score,
      errors,
      warnings,
      conventions,
      refactors,
      info,
      errorCount:      errors.length,
      warningCount:    warnings.length,
      conventionCount: conventions.length,
      refactorCount:   refactors.length,
      totalProblems:   messages.length,
      totalLines,
      improvements,
      codeSmells
    };

  } catch (error) {
    console.error('❌ Erreur parsing résultats Pylint:', error);
    
    return {
      success:         false,
      error:           error.message,
      errors:          [],
      warnings:        [],
      conventions:     [],
      refactors:       [],
      errorCount:      0,
      warningCount:    0,
      conventionCount: 0,
      refactorCount:   0,
      score:           0,
      improvements:    [],
      codeSmells:      []
    };
  }
}

/**
 * ✅ NOUVEAU: Retourne une suggestion lisible pour chaque règle Pylint
 */
function getPylintSuggestion(symbol, originalMessage) {
  const suggestions = {
    // Conventions de nommage
    'invalid-name':              'Utilisez snake_case pour les variables/fonctions et PascalCase pour les classes',
    'C0103':                     'Utilisez snake_case pour les variables/fonctions et PascalCase pour les classes',

    // Docstrings
    'missing-function-docstring':'Ajoutez une docstring pour documenter cette fonction',
    'missing-class-docstring':   'Ajoutez une docstring pour documenter cette classe',
    'C0116':                     'Ajoutez une docstring pour documenter cette fonction',
    'C0115':                     'Ajoutez une docstring pour documenter cette classe',

    // Imports
    'unused-import':             'Supprimez cet import inutilisé',
    'W0611':                     'Supprimez cet import inutilisé',
    'wildcard-import':           'Évitez "import *", importez explicitement ce dont vous avez besoin',

    // Variables
    'unused-variable':           'Supprimez cette variable déclarée mais jamais utilisée',
    'W0612':                     'Supprimez cette variable déclarée mais jamais utilisée',
    'undefined-variable':        'Cette variable n\'est pas définie',

    // Longueur de ligne
    'line-too-long':             'La ligne dépasse 79 caractères (PEP8). Découpez-la',
    'C0301':                     'La ligne dépasse 79 caractères (PEP8). Découpez-la',

    // Complexité
    'too-many-branches':         'Trop de branches conditionnelles. Simplifiez la logique',
    'R0912':                     'Trop de branches conditionnelles. Simplifiez la logique',
    'too-many-statements':       'Fonction trop longue. Découpez-la en sous-fonctions',
    'R0915':                     'Fonction trop longue. Découpez-la en sous-fonctions',
    'too-many-arguments':        'Trop de paramètres (max 5). Utilisez un objet ou un dataclass',
    'R0913':                     'Trop de paramètres (max 5). Utilisez un objet ou un dataclass',
    'too-many-nested-blocks':    'Imbrication trop profonde (max 3). Refactorisez avec des fonctions',
    'R1702':                     'Imbrication trop profonde (max 3). Refactorisez avec des fonctions',
    'too-many-locals':           'Trop de variables locales. Découpez la fonction',

    // Refactoring
    'duplicate-code':            'Code dupliqué détecté. Extrayez dans une fonction réutilisable',
    'consider-using-enumerate':  'Utilisez enumerate() au lieu de range(len(...))',
    'consider-using-f-string':   'Utilisez les f-strings pour le formatage de chaînes',
    'use-list-comprehension':    'Utilisez une list comprehension pour simplifier ce code',
    'no-else-return':            'Supprimez le "else" après un "return" (inutile)',
  };

  return suggestions[symbol] || originalMessage || `Convention Pylint: ${symbol}`;
}

module.exports = {
  analyzePython,
  parsePylintResults
};