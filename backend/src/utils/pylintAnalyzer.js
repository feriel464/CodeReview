/**
 * Module d'analyse Pylint — aligné sur le .pylintrc fourni
 * max-args=7, max-line-length=100, max-nested-blocks=3
 */

const { exec } = require('child_process');
const fs   = require('fs').promises;
const path = require('path');

// ─────────────────────────────────────────────────────────────
//  ANALYSE PRINCIPALE
// ─────────────────────────────────────────────────────────────
async function analyzePython(code) {
  let tempFile = null;

  try {
    tempFile = path.join(
      __dirname,
      `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`
    );

    console.log('📝 Création fichier temporaire:', tempFile);
    await fs.writeFile(tempFile, code, 'utf8');

    console.log('🔬 Exécution de Pylint...');
    const pylintOutput = await runPylint(tempFile);

    console.log('📊 Parsing des résultats...');
    return parsePylintResults(pylintOutput, code);

  } catch (error) {
    console.error('❌ Erreur Pylint:', error);
    return emptyResult(error.message);
  } finally {
    if (tempFile) {
      try { await fs.unlink(tempFile); }
      catch (e) { console.error('⚠️  Suppression fichier temp:', e.message); }
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  COMMANDE PYLINT — alignée sur votre .pylintrc
// ─────────────────────────────────────────────────────────────
function runPylint(filePath) {
  return new Promise((resolve) => {
    /**
     * Options alignées sur votre .pylintrc :
     *   max-line-length=100        → [FORMAT]
     *   max-args=7                 → [DESIGN]
     *   max-attributes=10          → [DESIGN]
     *   max-nested-blocks=3        → calculé manuellement aussi
     *   min-similarity-lines=4     → [SIMILARITIES]
     *
     * Désactivés (votre .pylintrc) :
     *   C0111/C0114 → missing-module-docstring
     *   R0903       → too-few-public-methods
     *   C0103       → invalid-name (géré par notre analyse statique)
     *   W0212       → protected-access
     *   R0913       → too-many-arguments (géré via max-args)
     *   R0914       → too-many-locals
     *
     * On garde les catégories utiles : E, W, R, C (sauf ceux désactivés)
     */
    const disabledIds = [
      'C0111', 'C0114',  // missing-module-docstring
      'R0903',           // too-few-public-methods
      'C0103',           // invalid-name (notre statique le gère mieux)
      'W0212',           // protected-access
      'R0914',           // too-many-locals
    ].join(',');

    const command = [
      'py -m pylint',
      `"${filePath}"`,
      '--output-format=json',
      '--score=yes',
      `--max-line-length=100`,
      `--max-args=7`,
      `--max-attributes=10`,
      `--max-nested-blocks=3`,
      `--min-similarity-lines=4`,
      '--ignore-comments=yes',
      '--ignore-docstrings=yes',
      `--disable=${disabledIds}`,
    ].join(' ');

    console.log('🚀 Commande Pylint:', command);

    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (stderr && stderr.length > 0) console.warn('⚠️  Pylint stderr:', stderr.substring(0, 200));
      resolve(stdout || '');
    });
  });
}

// ─────────────────────────────────────────────────────────────
//  PARSING
// ─────────────────────────────────────────────────────────────
function parsePylintResults(output, code) {
  try {
    // ── 1. Extraire JSON ──────────────────────────────────────
    const jsonStart = output.indexOf('[');
    const jsonEnd   = output.lastIndexOf(']');
    let messages    = [];

    if (jsonStart !== -1 && jsonEnd !== -1) {
      try {
        messages = JSON.parse(output.substring(jsonStart, jsonEnd + 1));
      } catch (e) {
        console.error('❌ Parsing JSON Pylint:', e.message);
      }
    }

    // ── 2. Extraire le score /10 ──────────────────────────────
    let score = 10.0;
    const scoreMatch = output.match(/rated at ([-\d.]+)\/10/);
    if (scoreMatch) score = Math.max(0, parseFloat(scoreMatch[1]));

    // ── 3. Catégoriser les messages ───────────────────────────
    const errors      = [];
    const warnings    = [];
    const conventions = [];
    const refactors   = [];
    const infoItems   = [];

    messages.forEach(msg => {
      const item = {
        line:      msg.line      || 1,
        column:    msg.column    || 0,
        message:   msg.message   || '',
        messageId: msg['message-id'] || '',
        symbol:    msg.symbol    || '',
        type:      msg.type      || 'convention',
        module:    msg.module    || '',
        obj:       msg.obj       || '',
      };

      switch (msg.type) {
        case 'error':      errors.push(item);      break;
        case 'warning':    warnings.push(item);    break;
        case 'convention': conventions.push(item); break;
        case 'refactor':   refactors.push(item);   break;
        default:           infoItems.push(item);   break;
      }
    });

    // ── 4. Construire improvements (conventions + info) ───────
    const improvements = [
      ...conventions.map(c => ({
        type:       c.symbol,
        severity:   'convention',
        line:       c.line,
        column:     c.column,
        message:    c.message,
        suggestion: getPylintSuggestion(c.symbol, c.message),
      })),
      ...infoItems.map(i => ({
        type:       i.symbol,
        severity:   'info',
        line:       i.line,
        column:     i.column,
        message:    i.message,
        suggestion: getPylintSuggestion(i.symbol, i.message),
      })),
    ];

    // ── 5. Construire codeSmells (errors + warnings + refactors) ─
    const codeSmells = [
      ...errors.map(e => ({
        type:     e.symbol,
        severity: 'error',
        line:     e.line,
        message:  e.message,
        variable: e.obj || e.symbol,
      })),
      ...warnings.map(w => ({
        type:     w.symbol,
        severity: 'warning',
        line:     w.line,
        message:  w.message,
        variable: w.obj || w.symbol,
      })),
      ...refactors.map(r => ({
        type:     r.symbol,
        severity: 'refactor',
        line:     r.line,
        message:  r.message,
        variable: r.obj || r.symbol,
      })),
    ];

    // ── 6. Métriques Python ───────────────────────────────────
    const metrics = computePythonMetrics(code);

    console.log(
      `🐍 Pylint: score=${score.toFixed(2)}/10 | `
      + `E=${errors.length} W=${warnings.length} C=${conventions.length} R=${refactors.length}`
    );

    return {
      success:         true,
      score,
      errors,  warnings,  conventions,  refactors,  info: infoItems,
      errorCount:      errors.length,
      warningCount:    warnings.length,
      conventionCount: conventions.length,
      refactorCount:   refactors.length,
      totalProblems:   messages.length,
      improvements,
      codeSmells,
      metrics,
    };

  } catch (error) {
    console.error('❌ Erreur parsing Pylint:', error);
    return emptyResult(error.message);
  }
}

// ─────────────────────────────────────────────────────────────
//  MÉTRIQUES PYTHON
// ─────────────────────────────────────────────────────────────
function computePythonMetrics(code) {
  const lines    = code.split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  const comments = lines.filter(l => l.trim().startsWith('#'));
  const docstrings = (code.match(/"""[\s\S]*?"""|'''[\s\S]*?'''/g) || []).length;
  const functions = (code.match(/^def\s+\w+/gm)  || []).length;
  const classes   = (code.match(/^class\s+\w+/gm) || []).length;
  const imports   = (code.match(/^(?:import|from)\s+/gm) || []).length;
  const longLines = lines.filter(l => l.length > 100).length;
  const avgLineLen = nonEmpty.length > 0
    ? Math.round(nonEmpty.reduce((sum, l) => sum + l.length, 0) / nonEmpty.length)
    : 0;
  const commentRatio = nonEmpty.length > 0
    ? Math.round(((comments.length + docstrings) / nonEmpty.length) * 100)
    : 0;

  return {
    totalLines:   lines.length,
    codeLines:    nonEmpty.length,
    commentLines: comments.length,
    emptyLines:   lines.length - nonEmpty.length,
    docstrings,
    commentRatio,
    characters:   code.length,
    avgLineLength: avgLineLen,
    longLines,
    functions,
    classes,
    imports,
  };
}

// ─────────────────────────────────────────────────────────────
//  SUGGESTIONS PAR RÈGLE (complètes)
// ─────────────────────────────────────────────────────────────
function getPylintSuggestion(symbol, originalMessage) {
  const map = {
    // Nommage
    'invalid-name':              'Utilisez snake_case pour variables/fonctions, PascalCase pour les classes',
    'C0103':                     'Utilisez snake_case pour variables/fonctions, PascalCase pour les classes',

    // Docstrings
    'missing-function-docstring':'Ajoutez une docstring: """Description de la fonction."""',
    'missing-class-docstring':   'Ajoutez une docstring: """Description de la classe."""',
    'C0116':                     'Ajoutez une docstring à cette fonction',
    'C0115':                     'Ajoutez une docstring à cette classe',

    // Imports
    'unused-import':             'Supprimez cet import inutilisé',
    'W0611':                     'Supprimez cet import inutilisé',
    'wildcard-import':           'Évitez "import *", importez explicitement',
    'wrong-import-order':        'Respectez l\'ordre des imports: stdlib, tiers, locaux',
    'wrong-import-position':     'Placez les imports en haut du fichier',

    // Variables
    'unused-variable':           'Supprimez cette variable déclarée mais jamais utilisée',
    'W0612':                     'Supprimez cette variable non utilisée',
    'undefined-variable':        'Variable non définie, vérifiez la déclaration',
    'redefined-outer-name':      'Cette variable masque une variable du scope extérieur',
    'global-statement':          'Évitez les variables globales, préférez les paramètres',

    // Longueur
    'line-too-long':             'La ligne dépasse 100 caractères. Découpez-la (PEP8)',
    'C0301':                     'La ligne dépasse 100 caractères. Découpez-la',

    // Complexité
    'too-many-branches':         'Trop de branches conditionnelles. Simplifiez la logique',
    'R0912':                     'Trop de branches. Refactorisez en sous-fonctions',
    'too-many-statements':       'Fonction trop longue. Découpez-la',
    'R0915':                     'Fonction trop longue. Découpez-la en sous-fonctions',
    'too-many-arguments':        'Trop de paramètres (max 7). Utilisez un dataclass ou dict',
    'R0913':                     'Trop de paramètres. Utilisez un objet de configuration',
    'too-many-nested-blocks':    'Imbrication trop profonde (max 3). Refactorisez',
    'R1702':                     'Imbrication trop profonde. Créez des fonctions auxiliaires',
    'too-many-locals':           'Trop de variables locales. Découpez la fonction',
    'R0914':                     'Trop de variables locales. Découpez la fonction',
    'too-many-instance-attributes': 'Trop d\'attributs. Regroupez dans des sous-objets',
    'R0902':                     'Trop d\'attributs. Envisagez des sous-classes',

    // Refactoring
    'duplicate-code':            'Code dupliqué. Extrayez dans une fonction réutilisable',
    'R0801':                     'Code dupliqué détecté. Factorisez',
    'consider-using-enumerate':  'Utilisez enumerate() au lieu de range(len(...))',
    'consider-using-f-string':   'Utilisez les f-strings: f"Valeur: {var}"',
    'use-list-comprehension':    'Utilisez une list comprehension pour simplifier',
    'no-else-return':            'Supprimez le "else" après un "return"',
    'no-else-raise':             'Supprimez le "else" après un "raise"',
    'consider-using-with':       'Utilisez "with" pour la gestion automatique des ressources',
    'unnecessary-pass':          'Ce "pass" est inutile et peut être supprimé',
    'simplifiable-if-expression':'Simplifiez cette expression booléenne',
    'chained-comparison':        'Utilisez les comparaisons chaînées: a < x < b',
    'unnecessary-comprehension': 'Cette compréhension peut être simplifiée',

    // Erreurs
    'syntax-error':              'Erreur de syntaxe Python. Vérifiez le code',
    'E0001':                     'Erreur de syntaxe. Vérifiez les parenthèses/indentations',
    'attribute-error':           'Cet attribut n\'existe peut-être pas sur cet objet',
    'type-error':                'Erreur de type probable à l\'exécution',
    'name-error':                'Nom non défini. Vérifiez les imports ou déclarations',
    'import-error':              'Module introuvable. Vérifiez l\'installation du package',

    // Warnings divers
    'fixme':                     'TODO/FIXME détecté. Résolvez avant de déployer',
    'deprecated-method':         'Cette méthode est dépréciée. Utilisez l\'alternative recommandée',
    'broad-except':              'Évitez "except Exception". Attrapez l\'exception spécifique',
    'bare-except':               'Évitez "except:" sans type. Spécifiez l\'exception',
    'raise-missing-from':        'Utilisez "raise X from Y" pour chaîner les exceptions',
    'logging-not-lazy':          'Utilisez le formatage lazy pour le logging: logger.info("%s", val)',
    'subprocess-popen-preexec-fn':'preexec_fn est déconseillé avec fork. Utilisez process_group',
  };

  return map[symbol] || originalMessage || `Pylint: ${symbol}`;
}

// ─────────────────────────────────────────────────────────────
//  UTILITAIRE
// ─────────────────────────────────────────────────────────────
function emptyResult(errorMsg) {
  return {
    success: false, error: errorMsg,
    errors: [], warnings: [], conventions: [], refactors: [], info: [],
    errorCount: 0, warningCount: 0, conventionCount: 0, refactorCount: 0,
    score: 0, improvements: [], codeSmells: [],
  };
}

module.exports = { analyzePython, parsePylintResults };