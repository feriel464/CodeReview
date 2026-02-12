/**
 * Module central d'analyse de code
 * Unifie tous les analyseurs (ESLint, Pylint, etc.)
 */

const { analyzeJavaScript } = require('./eslintAnalyzer');
const { analyzePython } = require('./pylintAnalyzer');

/**
 * Analyse du code selon le langage
 * @param {string} code - Le code source à analyser
 * @param {string} language - Le langage de programmation
 * @returns {Promise<Object>} - Résultats d'analyse unifiés
 */
async function analyzeCode(code, language) {
  console.log(`🔬 Analyse du code ${language}...`);
  
  try {
    // Normaliser le nom du langage
    const normalizedLanguage = normalizeLanguage(language);
    
    // Router vers le bon analyseur
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
    
    // Calculer le score de qualité unifié (0-100)
    const qualityScore = calculateQualityScore(rawResults, normalizedLanguage);
    
    // Retourner le format unifié
    return {
      ...rawResults,
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

/**
 * Normalise le nom d'un langage
 * @param {string} language - Nom du langage
 * @returns {string} - Nom normalisé
 */
function normalizeLanguage(language) {
  const mapping = {
    'javascript': 'javascript',
    'js': 'javascript',
    'typescript': 'typescript',
    'ts': 'typescript',
    'python': 'python',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c++': 'cpp',
    'csharp': 'csharp',
    'c#': 'csharp',
    'go': 'go',
    'golang': 'go',
    'rust': 'rust',
    'php': 'php',
    'ruby': 'ruby'
  };
  
  return mapping[language.toLowerCase()] || language.toLowerCase();
}

/**
 * Calcule le score de qualité unifié (0-100)
 * @param {Object} results - Résultats bruts de l'analyse
 * @param {string} language - Langage du code
 * @returns {number} - Score entre 0 et 100
 */
function calculateQualityScore(results, language) {
  // Si l'analyse a échoué
  if (!results.success) {
    return 0;
  }
  
  // Pour Python : on a déjà un score sur 10
  if (language === 'python' && results.score !== undefined) {
    // Convertir le score Pylint (0-10) en score sur 100
    return Math.round(results.score * 10);
  }
  
  // Pour JavaScript/TypeScript : calculer basé sur les erreurs
  if (language === 'javascript' || language === 'typescript') {
    let score = 100;
    
    const errorCount = results.errorCount || 0;
    const warningCount = results.warningCount || 0;
    
    // -10 points par erreur
    score -= errorCount * 10;
    
    // -2 points par warning
    score -= warningCount * 2;
    
    // Score minimum 0, maximum 100
    return Math.max(0, Math.min(100, score));
  }
  
  // Pour les langages simulés
  return Math.floor(Math.random() * 30) + 70; // 70-100
}

/**
 * Simule une analyse pour les langages non encore supportés
 * @param {string} code - Le code source
 * @param {string} language - Le langage
 * @returns {Object} - Résultats simulés
 */
function simulateAnalysis(code, language) {
  const lines = code.split('\n').length;
  const chars = code.length;
  
  console.log(`⚠️  Analyse simulée pour ${language}`);
  
  return {
    success: true,
    simulated: true,
    errors: [],
    warnings: [],
    improvements: [
      {
        type: 'info',
        severity: 'info',
        line: Math.floor(Math.random() * lines) + 1,
        message: `Analyse complète non disponible pour ${language}`,
        suggestion: 'Support complet à venir dans une prochaine version'
      }
    ],
    codeSmells: [],
    errorCount: 0,
    warningCount: 0,
    metrics: {
      lines,
      characters: chars,
      functions: Math.floor(lines / 10),
      classes: Math.floor(lines / 50)
    }
  };
}

/**
 * Calcule des métriques de code (indépendant du langage)
 * @param {string} code - Le code source
 * @returns {Object} - Métriques
 */
function calculateMetrics(code) {
  const lines = code.split('\n');
  
  return {
    totalLines: lines.length,
    codeLines: lines.filter(line => line.trim().length > 0 && !line.trim().startsWith('//')).length,
    commentLines: lines.filter(line => line.trim().startsWith('//')).length,
    emptyLines: lines.filter(line => line.trim().length === 0).length,
    characters: code.length,
    averageLineLength: Math.round(code.length / lines.length)
  };
}

module.exports = {
  analyzeCode,
  calculateQualityScore,
  calculateMetrics,
  normalizeLanguage
};