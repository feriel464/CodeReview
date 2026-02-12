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
    // 1. Créer un fichier temporaire avec le code
    tempFile = path.join(__dirname, `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`);
    
    console.log('📝 Création fichier temporaire:', tempFile);
    await fs.writeFile(tempFile, code, 'utf8');

    // 2. Exécuter Pylint
    console.log('🔬 Exécution de Pylint...');
    const pylintOutput = await runPylint(tempFile);

    // 3. Parser les résultats
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
      score: 0
    };

  } finally {
    // 4. Toujours supprimer le fichier temporaire
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
 * @param {string} filePath - Chemin du fichier à analyser
 * @returns {Promise<string>} - Output JSON de Pylint
 */
function runPylint(filePath) {
  return new Promise((resolve, reject) => {
    // Commande Pylint avec format JSON
    // Utiliser 'py -m pylint' pour Windows
    const command = `py -m pylint "${filePath}" --output-format=json --score=yes`;

    console.log('🚀 Commande:', command);

    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      // IMPORTANT: Pylint retourne exit code != 0 même avec des warnings
      // Donc on ne rejette PAS sur error, on récupère stdout quand même
      
      if (stderr && stderr.length > 0) {
        console.error('⚠️  Pylint stderr:', stderr);
      }

      // Stdout contient les résultats JSON
      resolve(stdout);
    });
  });
}

/**
 * Parse les résultats JSON de Pylint
 * @param {string} output - Output JSON de Pylint
 * @param {string} code - Code source original
 * @returns {Object} - Résultats formatés
 */
function parsePylintResults(output, code) {
  try {
    // Séparer les messages JSON du score
    const lines = output.split('\n');
    let jsonPart = '';
    let scoreLine = '';

    // Trouver la partie JSON et le score
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

    // Parser le JSON
    let messages = [];
    if (jsonPart.trim()) {
      try {
        messages = JSON.parse(jsonPart);
      } catch (e) {
        console.error('❌ Erreur parsing JSON Pylint:', e.message);
        console.log('JSON brut:', jsonPart.substring(0, 200));
      }
    }

    // Extraire le score
    let score = 10.0;
    if (scoreLine) {
      const scoreMatch = scoreLine.match(/rated at ([\d.]+)\/10/);
      if (scoreMatch) {
        score = parseFloat(scoreMatch[1]);
      }
    }

    // Séparer par type
    const errors = [];
    const warnings = [];
    const conventions = [];
    const refactors = [];
    const info = [];

    messages.forEach(msg => {
      const item = {
        line: msg.line,
        column: msg.column,
        endLine: msg.endLine,
        endColumn: msg.endColumn,
        message: msg.message,
        messageId: msg['message-id'] || msg.symbol || 'unknown',
        symbol: msg.symbol || '',
        type: msg.type,
        module: msg.module || '',
        obj: msg.obj || ''
      };

      // Classer par type
      switch (msg.type) {
        case 'error':
          errors.push(item);
          break;
        case 'warning':
          warnings.push(item);
          break;
        case 'convention':
          conventions.push(item);
          break;
        case 'refactor':
          refactors.push(item);
          break;
        default:
          info.push(item);
      }
    });

    // Calculer les statistiques
    const totalLines = code.split('\n').length;

    return {
      success: true,
      score: score,
      errors,
      warnings,
      conventions,
      refactors,
      info,
      errorCount: errors.length,
      warningCount: warnings.length,
      conventionCount: conventions.length,
      refactorCount: refactors.length,
      totalProblems: messages.length,
      totalLines,
      // Pour compatibilité avec le format attendu par le frontend
      improvements: conventions.map(c => ({
        type: c.symbol,
        severity: 'convention',
        line: c.line,
        column: c.column,
        message: c.message,
        suggestion: `Convention PEP 8: ${c.symbol}`
      })),
      codeSmells: [...warnings, ...refactors].map(w => ({
        type: w.symbol,
        severity: w.type,
        line: w.line,
        message: w.message,
        variable: w.obj || w.symbol
      }))
    };

  } catch (error) {
    console.error('❌ Erreur parsing résultats Pylint:', error);
    
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
      score: 0
    };
  }
}

module.exports = {
  analyzePython,
  parsePylintResults
};