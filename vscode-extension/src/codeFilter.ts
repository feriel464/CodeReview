/**
 * codeFilter.ts
 * Filtre strict : accepte UNIQUEMENT du code source, rejette tout texte ordinaire.
 */

export interface FilterResult {
  isCode: boolean;
  detectedLanguage: string | null;
  confidence: number; // 0-100
  reason: string;
}

// Signatures caractéristiques de chaque langage
const LANGUAGE_SIGNATURES: Record<string, RegExp[]> = {
  javascript: [
    /\b(const|let|var)\s+\w+\s*=/,
    /\bfunction\s+\w+\s*\(/,
    /=>\s*\{/,
    /\brequire\s*\(/,
    /\bimport\s+.+\s+from\s+['"]/,
    /\bconsole\.(log|error|warn)\s*\(/,
    /\bmodule\.exports\s*=/,
    /\basync\s+function/,
    /\bawait\s+\w+/,
  ],
  typescript: [
    /:\s*(string|number|boolean|any|void|never|unknown)\b/,
    /\binterface\s+\w+\s*\{/,
    /\btype\s+\w+\s*=/,
    /\b(public|private|protected|readonly)\s+\w+/,
    /\benum\s+\w+\s*\{/,
    /<[A-Z]\w*>/,
  ],
  python: [
    /^def\s+\w+\s*\(/m,
    /^class\s+\w+(\s*\(.*\))?\s*:/m,
    /^import\s+\w+/m,
    /^from\s+\w+\s+import/m,
    /\bprint\s*\(/,
    /\bself\.\w+/,
    /:\s*$(?=\n\s+)/m,
    /#.*/,
  ],
  java: [
    /\bpublic\s+(class|interface|enum)\s+\w+/,
    /\b(public|private|protected)\s+\w+\s+\w+\s*\(/,
    /\bSystem\.out\.print/,
    /\bnew\s+\w+\s*\(/,
    /\bimport\s+java\./,
    /@Override/,
    /\bvoid\s+\w+\s*\(/,
  ],
  php: [
    /<\?php/,
    /\$\w+\s*=/,
    /\becho\s+/,
    /\bfunction\s+\w+\s*\(/,
    /\b(public|private|protected)\s+function/,
    /->[\w]+/,
  ],
  cpp: [
    /#include\s*[<"]\w+/,
    /\bstd::/,
    /\bint\s+main\s*\(/,
    /\bcout\s*<</,
    /\bnamespace\s+\w+/,
    /\breturn\s+0;/,
  ],
  csharp: [
    /\busing\s+System/,
    /\bnamespace\s+\w+/,
    /\bpublic\s+class\s+\w+/,
    /\bConsole\.(Write|Read)/,
    /\bvar\s+\w+\s*=/,
  ],
  go: [
    /\bpackage\s+\w+/,
    /\bfunc\s+\w+\s*\(/,
    /\bimport\s+\(/,
    /\bfmt\.(Print|Println|Sprintf)/,
    /:=\s*/,
  ],
  rust: [
    /\bfn\s+\w+\s*\(/,
    /\blet\s+(mut\s+)?\w+/,
    /\buse\s+std::/,
    /println!\s*\(/,
    /\bimpl\s+\w+/,
    /\b&str\b|\b&mut\b/,
  ],
  ruby: [
    /\bdef\s+\w+/,
    /\bend\b/,
    /\bputs\s+/,
    /\brequire\s+['"]/,
    /\battr_accessor\b/,
    /\bclass\s+\w+\s*</,
  ],
  sql: [
    /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/i,
    /\bFROM\s+\w+/i,
    /\bWHERE\s+/i,
    /\bJOIN\s+/i,
    /\bINNER\s+JOIN\b/i,
  ],
};

// Patterns qui indiquent que ce n'est PAS du code (texte ordinaire)
const NON_CODE_PATTERNS: RegExp[] = [
  /^(Bonjour|Hello|Salut|Hi|Hey|Dear|Cher)\b/i,
  /^(Je voudrais|I want|I need|Please|Pouvez-vous|Can you)\b/i,
  /^\d+\.\s+[A-Z]/m,                              // listes numérotées de prose
  /\b(lorem ipsum|dolor sit amet)\b/i,
  /^[A-Z][^{};()=<>]{50,}\.$(?!\n\s)/m,          // longues phrases sans syntaxe
];

// Indicateurs génériques de code (indépendants du langage)
const GENERIC_CODE_PATTERNS: RegExp[] = [
  /[{};]/,                   // accolades / point-virgule
  /\w+\s*\(.*\)/,            // appel de fonction
  /\/\/.*|\/\*[\s\S]*?\*\//,// commentaires
  /^\s{2,}|\t/m,             // indentation
  /=\s*\w+/,                  // affectation
  /\b(if|else|for|while|return|class|function|import|export)\b/,
  /#.+/,                      // commentaire Python/bash
  /\bint\b|\bstring\b|\bbool\b|\bvoid\b/,
];

/**
 * Détecte le langage le plus probable.
 */
function detectLanguage(code: string): { lang: string; score: number } | null {
  let best: { lang: string; score: number } | null = null;

  for (const [lang, patterns] of Object.entries(LANGUAGE_SIGNATURES)) {
    const matches = patterns.filter(p => p.test(code)).length;
    const score   = Math.round((matches / patterns.length) * 100);
    if (score > 0 && (!best || score > best.score)) {
      best = { lang, score };
    }
  }

  return best;
}

/**
 * Filtre principal : détermine si l'entrée est du code source.
 */
export function filterCode(input: string): FilterResult {
  const trimmed = input.trim();

  // Trop court pour être du code utile
  if (trimmed.length < 20) {
    return { isCode: false, detectedLanguage: null, confidence: 0, reason: 'Contenu trop court (minimum 20 caractères)' };
  }

  // Vérifications texte non-code
  const looksLikeText = NON_CODE_PATTERNS.some(p => p.test(trimmed));
  if (looksLikeText) {
    return { isCode: false, detectedLanguage: null, confidence: 0, reason: 'Le contenu ressemble à du texte ordinaire, pas à du code' };
  }

  // Score générique de code
  const genericMatches = GENERIC_CODE_PATTERNS.filter(p => p.test(trimmed)).length;
  const genericScore   = Math.round((genericMatches / GENERIC_CODE_PATTERNS.length) * 100);

  // Si score générique trop bas → rejet
  if (genericScore < 25) {
    return {
      isCode:           false,
      detectedLanguage: null,
      confidence:       genericScore,
      reason:           `Aucun indicateur de code détecté (score: ${genericScore}/100). Collez uniquement du code source.`,
    };
  }

  // Détection du langage
  const detection = detectLanguage(trimmed);
  const finalScore = detection
    ? Math.round((genericScore * 0.4) + (detection.score * 0.6))
    : genericScore;

  if (finalScore < 20) {
    return {
      isCode:           false,
      detectedLanguage: detection?.lang || null,
      confidence:       finalScore,
      reason:           'Contenu insuffisamment similaire à du code source reconnu.',
    };
  }

  return {
    isCode:           true,
    detectedLanguage: detection?.lang || null,
    confidence:       Math.min(100, finalScore),
    reason:           detection
      ? `Code ${detection.lang} détecté avec ${finalScore}% de confiance`
      : `Code générique détecté avec ${finalScore}% de confiance`,
  };
}

/**
 * Map extension de fichier → code langage backend.
 */
export function extensionToLanguage(ext: string): string {
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python',
    java: 'java',
    php: 'php',
    cpp: 'cpp', cc: 'cpp', cxx: 'cpp', h: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    sql: 'sql',
    swift: 'swift',
    kt: 'kotlin', kts: 'kotlin',
  };
  return map[ext.toLowerCase()] || ext.toLowerCase();
}