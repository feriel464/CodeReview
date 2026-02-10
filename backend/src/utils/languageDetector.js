// =========================================
// MODULE DE DÉTECTION DE LANGAGE
// =========================================

/**
 * Détecte le langage de programmation basé sur le code source
 * @param {string} code - Le code source à analyser
 * @returns {object} - { language: 'python', confidence: 0.95, indicators: [...] }
 */
function detectLanguage(code) {
  const trimmedCode = code.trim();
  
  // Scores pour chaque langage
  const scores = {
    python: 0,
    javascript: 0,
    typescript: 0,
    java: 0,
    cpp: 0,
    csharp: 0,
    go: 0,
    rust: 0,
    php: 0,
    ruby: 0
  };

  const indicators = [];

  // =========================================
  // PYTHON
  // =========================================
  
  // Mots-clés Python
  if (/\bdef\s+\w+\s*\(/.test(code)) {
    scores.python += 3;
    indicators.push('def keyword');
  }
  if (/\bimport\s+\w+/.test(code) && !/\bfrom\s+['"]/.test(code)) {
    scores.python += 2;
  }
  if (/\bfrom\s+\w+\s+import\b/.test(code)) {
    scores.python += 3;
    indicators.push('from...import');
  }
  if (/\bif\s+__name__\s*==\s*['"]__main__['"]/.test(code)) {
    scores.python += 5;
    indicators.push('__main__ check');
  }
  if (/\bprint\s*\(/.test(code)) {
    scores.python += 1;
  }
  if (/\bclass\s+\w+\s*(\(|:)/.test(code)) {
    scores.python += 2;
  }
  if (/:\s*$\n\s{4}/m.test(code)) {
    scores.python += 2;
    indicators.push('Python indentation');
  }
  if (/\bself\b/.test(code)) {
    scores.python += 2;
  }
  if (/\b(elif|pass|lambda|yield)\b/.test(code)) {
    scores.python += 2;
  }

  // =========================================
  // JAVASCRIPT
  // =========================================
  
  // Mots-clés JavaScript
  if (/\b(const|let|var)\s+\w+\s*=/.test(code)) {
    scores.javascript += 3;
    indicators.push('const/let/var');
  }
  if (/\bfunction\s+\w+\s*\(/.test(code)) {
    scores.javascript += 2;
  }
  if (/=>\s*{/.test(code)) {
    scores.javascript += 3;
    indicators.push('arrow function');
  }
  if (/\bconsole\.log\s*\(/.test(code)) {
    scores.javascript += 3;
    indicators.push('console.log');
  }
  if (/\b(async|await)\b/.test(code)) {
    scores.javascript += 2;
  }
  if (/\brequire\s*\(['"]/.test(code)) {
    scores.javascript += 2;
  }
  if (/\bexport\s+(default|const|function|class)\b/.test(code)) {
    scores.javascript += 2;
  }
  if (/===|!==/.test(code)) {
    scores.javascript += 1;
  }

  // =========================================
  // TYPESCRIPT
  // =========================================
  
  if (/:\s*(string|number|boolean|any|void|never)\b/.test(code)) {
    scores.typescript += 4;
    indicators.push('TypeScript type annotations');
  }
  if (/\binterface\s+\w+\s*{/.test(code)) {
    scores.typescript += 4;
    indicators.push('interface keyword');
  }
  if (/\btype\s+\w+\s*=/.test(code)) {
    scores.typescript += 3;
  }
  if (/<\w+>/.test(code) && /\bfunction\b/.test(code)) {
    scores.typescript += 2;
  }
  // TypeScript hérite des patterns JavaScript
  scores.typescript += scores.javascript * 0.5;

  // =========================================
  // JAVA
  // =========================================
  
  if (/\bpublic\s+(class|interface|enum)\s+\w+/.test(code)) {
    scores.java += 5;
    indicators.push('public class/interface');
  }
  if (/\bprivate\s+(static\s+)?[\w<>]+\s+\w+\s*[;(]/.test(code)) {
    scores.java += 3;
  }
  if (/\bSystem\.out\.println\s*\(/.test(code)) {
    scores.java += 4;
    indicators.push('System.out.println');
  }
  if (/\bpublic\s+static\s+void\s+main\s*\(/.test(code)) {
    scores.java += 5;
    indicators.push('main method');
  }
  if (/@Override|@Deprecated/.test(code)) {
    scores.java += 3;
  }
  if (/\bnew\s+\w+\s*\(/.test(code)) {
    scores.java += 1;
  }

  // =========================================
  // C++
  // =========================================
  
  if (/#include\s+<\w+>/.test(code)) {
    scores.cpp += 4;
    indicators.push('#include directive');
  }
  if (/\bstd::/.test(code)) {
    scores.cpp += 4;
    indicators.push('std namespace');
  }
  if (/\bcout\s*<</.test(code)) {
    scores.cpp += 4;
    indicators.push('cout');
  }
  if (/\btemplate\s*</.test(code)) {
    scores.cpp += 3;
  }
  if (/\bnamespace\s+\w+/.test(code)) {
    scores.cpp += 2;
  }
  if (/::/.test(code)) {
    scores.cpp += 1;
  }

  // =========================================
  // C#
  // =========================================
  
  if (/\busing\s+System/.test(code)) {
    scores.csharp += 4;
    indicators.push('using System');
  }
  if (/\bnamespace\s+\w+/.test(code)) {
    scores.csharp += 2;
  }
  if (/\bConsole\.WriteLine\s*\(/.test(code)) {
    scores.csharp += 4;
    indicators.push('Console.WriteLine');
  }
  if (/\bpublic\s+(partial\s+)?class\s+\w+/.test(code)) {
    scores.csharp += 3;
  }

  // =========================================
  // GO
  // =========================================
  
  if (/\bpackage\s+main/.test(code)) {
    scores.go += 4;
    indicators.push('package main');
  }
  if (/\bfunc\s+main\s*\(\s*\)/.test(code)) {
    scores.go += 4;
    indicators.push('func main');
  }
  if (/\bfmt\.Print/.test(code)) {
    scores.go += 3;
  }
  if (/:=/.test(code)) {
    scores.go += 2;
    indicators.push(':= operator');
  }
  if (/\bgo\s+func\s*\(/.test(code)) {
    scores.go += 3;
  }

  // =========================================
  // RUST
  // =========================================
  
  if (/\bfn\s+main\s*\(\s*\)/.test(code)) {
    scores.rust += 4;
    indicators.push('fn main');
  }
  if (/\blet\s+mut\s+/.test(code)) {
    scores.rust += 3;
    indicators.push('let mut');
  }
  if (/println!\s*\(/.test(code)) {
    scores.rust += 4;
    indicators.push('println! macro');
  }
  if (/&str|&mut/.test(code)) {
    scores.rust += 2;
  }

  // =========================================
  // PHP
  // =========================================
  
  if (/<\?php/.test(code)) {
    scores.php += 5;
    indicators.push('<?php tag');
  }
  if (/\$\w+\s*=/.test(code)) {
    scores.php += 3;
    indicators.push('$variable syntax');
  }
  if (/\becho\s+/.test(code)) {
    scores.php += 2;
  }

  // =========================================
  // RUBY
  // =========================================
  
  if (/\bputs\s+/.test(code)) {
    scores.ruby += 2;
  }
  if (/\bend\b/.test(code) && /\bdef\s+\w+/.test(code)) {
    scores.ruby += 3;
    indicators.push('def...end');
  }

  // =========================================
  // CALCUL DU RÉSULTAT
  // =========================================

  // Trouver le langage avec le score le plus élevé
  let detectedLanguage = null;
  let maxScore = 0;

  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLanguage = lang;
    }
  }

  // Calculer la confiance (0-1)
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? maxScore / totalScore : 0;

  return {
    language: detectedLanguage,
    confidence: confidence,
    score: maxScore,
    allScores: scores,
    indicators: indicators
  };
}

/**
 * Vérifie si le code correspond au langage sélectionné
 * @param {string} code - Le code source
 * @param {string} selectedLanguage - Le langage sélectionné par l'utilisateur
 * @returns {object} - { match: boolean, detected: string, confidence: number }
 */
function validateLanguage(code, selectedLanguage) {
  const detection = detectLanguage(code);
  
  // Normaliser les noms de langage
  const normalizedSelected = normalizeLanguageName(selectedLanguage);
  const normalizedDetected = detection.language;

  // Seuil de confiance minimum pour considérer la détection fiable
  const CONFIDENCE_THRESHOLD = 0.3;

  // Si la détection n'est pas assez confiante, on accepte
  if (detection.confidence < CONFIDENCE_THRESHOLD) {
    return {
      match: true, // On ne peut pas être sûr, donc on accepte
      detected: normalizedDetected,
      confidence: detection.confidence,
      uncertain: true,
      message: 'Détection incertaine, le code sera analysé tel quel'
    };
  }

  // Vérifier si ça correspond
  const match = normalizedSelected === normalizedDetected;

  return {
    match: match,
    detected: normalizedDetected,
    selected: normalizedSelected,
    confidence: detection.confidence,
    score: detection.score,
    indicators: detection.indicators,
    message: match 
      ? 'Le langage correspond'
      : `Le code semble être du ${getLanguageName(normalizedDetected)} (confiance: ${Math.round(detection.confidence * 100)}%)`
  };
}

/**
 * Normalise le nom d'un langage
 */
function normalizeLanguageName(language) {
  const mapping = {
    'python': 'python',
    'javascript': 'javascript',
    'js': 'javascript',
    'typescript': 'typescript',
    'ts': 'typescript',
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
 * Obtient le nom lisible d'un langage
 */
function getLanguageName(languageCode) {
  const names = {
    'python': 'Python',
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'java': 'Java',
    'cpp': 'C++',
    'csharp': 'C#',
    'go': 'Go',
    'rust': 'Rust',
    'php': 'PHP',
    'ruby': 'Ruby'
  };

  return names[languageCode] || languageCode;
}

module.exports = {
  detectLanguage,
  validateLanguage,
  normalizeLanguageName,
  getLanguageName
};