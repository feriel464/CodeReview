// controllers/pdfController.js
const cloudinary = require('cloudinary').v2;
const PDFParser = require('pdf2json');
const axios = require('axios');
const { analyzeCode } = require('../utils/codeAnalyzer');
const pool = require('../config/db');

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';
const pdf = require('pdf-parse');

// ── Extraction du texte depuis le buffer PDF ──────────────────────────
async function extractTextFromPDF(buffer) {
  const data = await pdf(buffer);
  return {
    text: data.text,
    numpages: data.numpages
  };
}

// ── Nettoyage du code extrait par pdf2json ────────────────────────────
function cleanExtractedCode(code) {
  return code
    .replace(/   +/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Reconstruction des sauts de ligne pour code PDF dégradé ──────────
function reconstructLineBreaks(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const avgLen = lines.reduce((s, l) => s + l.length, 0) / Math.max(lines.length, 1);
  if (avgLen < 80 && lines.length > 3) return text;

  const pythonNewlineKeywords = [
    'import ', 'from ', 'def ', 'class ', 'if ', 'elif ', 'else:',
    'for ', 'while ', 'try:', 'except', 'finally:', 'with ', 'return ',
    'raise ', 'pass', 'break', 'continue', 'print(', 'yield ',
    'async ', 'await ', '#'
  ];

  const jsNewlineKeywords = [
    'const ', 'let ', 'var ', 'function ', 'class ', 'if (', 'else {',
    'else if', 'for (', 'while (', 'return ', 'import ', 'export ',
    'try {', 'catch (', 'finally {', '//', 'async ', 'await '
  ];

  let result = text;
  const allKeywords = [...new Set([...pythonNewlineKeywords, ...jsNewlineKeywords])];

  for (const kw of allKeywords) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+$/, '\\s+');
    const pattern = new RegExp(`([^\\n])\\s+(${escaped})`, 'g');
    result = result.replace(pattern, (match, before, keyword) => `${before}\n${keyword}`);
  }

  result = result.replace(/:\s+(?=[a-zA-Z_#])/g, ':\n');
  result = result.replace(/;\s+(?=[a-zA-Z_#/])/g, ';\n');
  result = result.replace(/\n{3,}/g, '\n\n').trim();

  return result;
}

// ── Détection des blocs de code ───────────────────────────────────────
function extractCodeBlocks(rawText) {
  const blocks = [];
  const processedText = reconstructLineBreaks(rawText);

  // Cas 1 : blocs Markdown fence
  const fencePatterns = [
    /```(\w+)?\n([\s\S]*?)```/g,
    /```(\w+)?\s+([\s\S]*?)```/g,
  ];
  for (const regex of fencePatterns) {
    let match;
    while ((match = regex.exec(processedText)) !== null) {
      const code = match[2].trim();
      if (code.length > 30) {
        blocks.push({ code, language: match[1] || null, source: 'fence' });
      }
    }
    if (blocks.length > 0) break;
  }

  // Cas 2 : lignes indentées
  if (blocks.length === 0) {
    const lines = processedText.split('\n');
    let buf = [];
    let inBlock = false;
    for (const line of lines) {
      const isCodeLine = /^(    |\t)/.test(line) || /[{};()=><]/.test(line);
      if (isCodeLine) {
        buf.push(line);
        inBlock = true;
      } else if (inBlock && line.trim() === '') {
        buf.push('');
      } else if (inBlock) {
        const candidate = buf.join('\n').trim();
        if (candidate.length > 50) blocks.push({ code: candidate, language: null, source: 'indentation' });
        buf = [];
        inBlock = false;
      }
    }
    if (inBlock && buf.join('\n').trim().length > 50) {
      blocks.push({ code: buf.join('\n').trim(), language: null, source: 'indentation' });
    }
  }

  // Cas 3 : heuristique
  if (blocks.length === 0) {
    const codePatterns = [
      /def\s+\w+\s*\(/, /import\s+\w+/, /class\s+\w+/,
      /function\s+\w+/, /const\s+\w+\s*=/, /cursor\.execute/i,
      /os\.system/, /hashlib\./, /sqlite3\./, /subprocess\./,
    ];
    const linesRec = processedText.split('\n');
    const hasCodeLine = linesRec.some(l => codePatterns.some(p => p.test(l)));
    if (hasCodeLine) blocks.push({ code: rawText, language: null, source: 'heuristic' });
  }

  // Cas 4 : filet de sécurité
  if (blocks.length === 0 && rawText.length > 50) {
    const hasObviousCode = /def |import |class |function |cursor\.|os\.system|hashlib/i.test(rawText);
    if (hasObviousCode) {
      blocks.push({ code: reconstructLineBreaks(rawText), language: null, source: 'fallback' });
    }
  }

  return blocks;
}

// ── Détection automatique du langage ─────────────────────────────────
function detectLanguage(code) {
  if (/def\s+\w+\s*\(|import\s+\w+|print\s*\(|hashlib|sqlite3/.test(code)) return 'python';
  if (/function\s+\w+|const\s+|let\s+|=>/.test(code))                       return 'javascript';
  if (/public\s+(class|static|void)|System\.out/.test(code))                 return 'java';
  if (/#include\s*<|int\s+main\s*\(/.test(code))                             return 'cpp';
  if (/<\?php|echo\s+/.test(code))                                           return 'php';
  if (/func\s+\w+.*{|:=/.test(code))                                         return 'go';
  return 'javascript';
}

// ── Analyse de sécurité statique par regex ────────────────────────────
function detectSecurityVulnsRegex(code, language) {
  const vulns = [];

  // ── 1. SQL Injection (CWE-89) ────────────────────────────────────
  const hasSQLContext = /cursor\.execute|pool\.query|db\.query|conn\.query|\.execute\s*\(/i.test(code);
  const hasSQLKeyword = /SELECT|INSERT|UPDATE|DELETE|WHERE/i.test(code);
  const hasConcatInSQL = (
    /["'][^"']*(?:SELECT|WHERE|FROM|AND)[^"']*["']\s*\+/i.test(code) ||
    (/\+\s*\w+\s*\+/.test(code) && hasSQLKeyword) ||
    /["'].*(?:user|pass|name|id)\s*=\s*['"][^'"]*["']\s*\+/.test(code) ||
    /cursor\.execute\s*\(\s*(?:query|sql|stmt|request)\s*[,)]/i.test(code)
  );

  if ((hasSQLContext && hasConcatInSQL) || (hasSQLContext && hasSQLKeyword && /\+/.test(code))) {
    const lines = code.split('\n');
    const sqlLineIdx = lines.findIndex(l =>
      /cursor\.execute|pool\.query/i.test(l) ||
      (/SELECT|INSERT|UPDATE|DELETE/i.test(l) && /\+/.test(l))
    );
    const sqlLine = sqlLineIdx + 1;
    vulns.push({
      id: `VULN-${String(vulns.length + 1).padStart(3, '0')}`,
      type: 'SQL_INJECTION',
      severity: 'critical',
      cwe: 'CWE-89',
      title: 'SQL Injection',
      description: 'Construction de requête SQL par concaténation de chaînes avec des entrées utilisateur non validées.',
      line: sqlLine || '?',
      snippet: lines[sqlLineIdx]?.trim() || '',
      vulnerableLines: sqlLineIdx >= 0 ? [{
        line: sqlLine,
        code: lines[sqlLineIdx]?.trim() || '',
        explanation: 'Concaténation de variables dans une requête SQL permettant l\'injection de code malveillant'
      }] : [],
      fix: 'Utiliser des requêtes paramétrées : cursor.execute("SELECT * FROM users WHERE user = %s AND pass = %s", (username, password))',
      confidence: '99%',
      source: 'regex'
    });
  }

  // ── 2. Secrets hardcodés (CWE-798) ──────────────────────────────
  const secretPatterns = [
    /(?:SECRET_KEY|API_KEY|PRIVATE_KEY)\s*=\s*["'][^"']{4,}["']/gi,
    /(?:PASSWORD|PASSWD|PWD|ADMIN_PASSWORD)\s*=\s*["'][^"']{3,}["']/gi,
    /(?:TOKEN|AUTH_TOKEN|ACCESS_TOKEN)\s*=\s*["'][^"']{8,}["']/gi,
  ];

  const secretsFound = [];
  const secretLines = [];
  const codeLines = code.split('\n');

  for (const regex of secretPatterns) {
    regex.lastIndex = 0;
    const matches = code.match(regex);
    if (matches) secretsFound.push(...matches);
  }

  // Trouver les numéros de lignes pour chaque secret
  const secretLinePattern = /(?:SECRET_KEY|API_KEY|PRIVATE_KEY|PASSWORD|PASSWD|PWD|ADMIN_PASSWORD|TOKEN|AUTH_TOKEN|ACCESS_TOKEN)\s*=\s*["'][^"']{3,}["']/i;
  codeLines.forEach((line, idx) => {
    if (secretLinePattern.test(line)) {
      secretLines.push({ line: idx + 1, code: line.trim(), explanation: 'Secret ou credential écrit en dur dans le code source' });
    }
  });

  const uniqueSecrets = [...new Set(secretsFound)];
  if (uniqueSecrets.length > 0) {
    vulns.push({
      id: `VULN-${String(vulns.length + 1).padStart(3, '0')}`,
      type: 'HARDCODED_SECRET',
      severity: 'high',
      cwe: 'CWE-798',
      title: 'Secrets hardcodés',
      description: `${uniqueSecrets.length} secret(s) détecté(s) en clair dans le code source.`,
      line: secretLines[0]?.line || '?',
      snippet: secretLines[0]?.code || uniqueSecrets[0] || '',
      vulnerableLines: secretLines,
      fix: 'Stocker les secrets dans des variables d\'environnement (.env) et utiliser python-dotenv ou os.environ. Ne jamais committer de secrets dans Git.',
      confidence: '98%',
      source: 'regex'
    });
  }

  // ── 3. Command Injection (CWE-78) ────────────────────────────────
  const cmdInjectionPatterns = [
    /os\.system\s*\(\s*["'][^"']*["']\s*\+/,
    /os\.system\s*\(\s*f["'][^"']*\{/,
    /os\.system\s*\(\s*["'][^"']*["']\s*%/,
    /subprocess\.[a-z]+\s*\(.*shell\s*=\s*True.*\+/,
    /exec\s*\(\s*["'][^"']*["']\s*\+/,
    /os\.system\s*\([^)]*\+\s*\w+/,
    /os\.system\s*\([^)]*\w+\s*\+/,
  ];

  for (const pattern of cmdInjectionPatterns) {
    if (pattern.test(code)) {
      const lines = code.split('\n');
      const cmdLineIdx = lines.findIndex(l => pattern.test(l));
      const cmdLine = cmdLineIdx + 1;
      vulns.push({
        id: `VULN-${String(vulns.length + 1).padStart(3, '0')}`,
        type: 'COMMAND_INJECTION',
        severity: 'critical',
        cwe: 'CWE-78',
        title: 'Command Injection',
        description: 'Exécution de commandes système construites par concaténation de chaînes avec des données non validées.',
        line: cmdLine || '?',
        snippet: lines[cmdLineIdx]?.trim() || '',
        vulnerableLines: cmdLineIdx >= 0 ? [{
          line: cmdLine,
          code: lines[cmdLineIdx]?.trim() || '',
          explanation: 'Exécution de commandes système avec des données utilisateur non validées'
        }] : [],
        fix: 'Utiliser subprocess.run() avec une liste d\'arguments : subprocess.run(["tar", "-czf", "backup.tar.gz", folder], check=True)',
        confidence: '99%',
        source: 'regex'
      });
      break;
    }
  }

  // ── 4. Algorithme de hachage faible (CWE-916) ────────────────────
  const weakHashPatterns = [
    { regex: /hashlib\.md5\s*\(/,    algo: 'MD5'    },
    { regex: /hashlib\.sha1\s*\(/,   algo: 'SHA-1'  },
    { regex: /hashlib\.sha256\s*\(/, algo: 'SHA-256 (faible pour mots de passe sans sel)' },
  ];

  for (const { regex, algo } of weakHashPatterns) {
    if (regex.test(code)) {
      const lines = code.split('\n');
      const hashLineIdx = lines.findIndex(l => regex.test(l));
      const hashLine = hashLineIdx + 1;
      vulns.push({
        id: `VULN-${String(vulns.length + 1).padStart(3, '0')}`,
        type: 'WEAK_HASH_ALGORITHM',
        severity: algo.startsWith('SHA-256') ? 'medium' : 'high',
        cwe: 'CWE-916',
        title: `Algorithme de hachage faible : ${algo}`,
        description: `${algo} est cryptographiquement cassé et ne doit pas être utilisé pour hacher des mots de passe.`,
        line: hashLine || '?',
        snippet: lines[hashLineIdx]?.trim() || '',
        vulnerableLines: hashLineIdx >= 0 ? [{
          line: hashLine,
          code: lines[hashLineIdx]?.trim() || '',
          explanation: `${algo} est vulnérable aux attaques par force brute et rainbow tables`
        }] : [],
        fix: 'Utiliser bcrypt, scrypt ou Argon2 avec sel automatique : import bcrypt; bcrypt.hashpw(password.encode(), bcrypt.gensalt())',
        confidence: '99%',
        source: 'regex'
      });
    }
  }

  // ── 5. Path Traversal (CWE-22) ───────────────────────────────────
  const hasOpenWithVar = /open\s*\(\s*\w+\s*[,)]/.test(code);
  const hasFunctionParam = /def\s+\w+\s*\(\s*\w+/.test(code);
  const hasPathValidation = /os\.path\.abspath|os\.path\.join|secure_filename|\.startswith\s*\(/.test(code);

  if (hasOpenWithVar && hasFunctionParam && !hasPathValidation) {
    const lines = code.split('\n');
    const fileLineIdx = lines.findIndex(l => /open\s*\(/.test(l));
    const fileLine = fileLineIdx + 1;
    if (fileLine > 0) {
      vulns.push({
        id: `VULN-${String(vulns.length + 1).padStart(3, '0')}`,
        type: 'PATH_TRAVERSAL',
        severity: 'medium',
        cwe: 'CWE-22',
        title: 'Possible Path Traversal',
        description: 'Ouverture de fichier avec un chemin potentiellement contrôlé par l\'utilisateur sans validation.',
        line: fileLine,
        snippet: lines[fileLineIdx]?.trim() || '',
        vulnerableLines: [{
          line: fileLine,
          code: lines[fileLineIdx]?.trim() || '',
          explanation: 'Accès non sécurisé au système de fichiers permettant la lecture de fichiers arbitraires'
        }],
        fix: 'Utiliser os.path.abspath() et vérifier que le chemin reste dans le répertoire autorisé.',
        confidence: '60%',
        source: 'regex'
      });
    }
  }

  return vulns;
}

// ── Calcul du score de sécurité ───────────────────────────────────────
function computeSecurityScore(vulns) {
  const weights = { critical: 30, high: 15, medium: 7, low: 3 };
  let penalty = 0;
  for (const v of vulns) penalty += weights[v.severity] || 0;
  return Math.max(0, 100 - penalty);
}

// ── Base de connaissances pour enrichir les vulnérabilités ML ─────────
// Utilisée quand le ML retourne des champs vides ou génériques.
const VULN_KNOWLEDGE_BASE = {
  SQL_INJECTION: {
    cwe: 'CWE-89',
    severity: 'critical',
    title: 'SQL Injection',
    description: 'Construction de requête SQL par concaténation de chaînes avec des entrées utilisateur non validées. Un attaquant peut manipuler la requête pour accéder ou modifier des données arbitraires.',
    fix: 'Utiliser des requêtes paramétrées : cursor.execute("SELECT * FROM users WHERE user = %s AND pass = %s", (username, password))',
    linePatterns: [/cursor\.execute/i, /pool\.query/i, /SELECT.*WHERE/i, /INSERT\s+INTO/i]
  },
  HARDCODED_SECRET: {
    cwe: 'CWE-798',
    severity: 'high',
    title: 'Secrets hardcodés',
    description: 'Des credentials ou secrets sont écrits en dur dans le code source. Cela expose les informations sensibles à quiconque ayant accès au code (dépôt Git, logs, etc.).',
    fix: 'Stocker les secrets dans des variables d\'environnement (.env) et utiliser python-dotenv ou os.environ. Ne jamais committer de secrets dans Git.',
    linePatterns: [/SECRET_KEY\s*=/, /API_KEY\s*=/, /PASSWORD\s*=/, /PASSWD\s*=/, /TOKEN\s*=/, /ADMIN_PASSWORD\s*=/]
  },
  COMMAND_INJECTION: {
    cwe: 'CWE-78',
    severity: 'critical',
    title: 'Command Injection',
    description: 'Exécution de commandes système construites dynamiquement à partir d\'entrées non validées. Un attaquant peut exécuter des commandes arbitraires sur le serveur.',
    fix: 'Utiliser subprocess.run() avec une liste d\'arguments : subprocess.run(["tar", "-czf", "backup.tar.gz", folder], check=True). Ne jamais passer shell=True avec des données utilisateur.',
    linePatterns: [/os\.system/i, /subprocess\./i, /exec\s*\(/i]
  },
  WEAK_HASH_ALGORITHM: {
    cwe: 'CWE-916',
    severity: 'high',
    title: 'Algorithme de hachage faible',
    description: 'MD5 et SHA-1 sont cryptographiquement cassés. Ils ne doivent jamais être utilisés pour hacher des mots de passe car ils sont vulnérables aux attaques par force brute et rainbow tables.',
    fix: 'Utiliser bcrypt, scrypt ou Argon2 : import bcrypt; bcrypt.hashpw(password.encode(), bcrypt.gensalt())',
    linePatterns: [/hashlib\.md5/i, /hashlib\.sha1/i, /hashlib\.sha256/i]
  },
  PATH_TRAVERSAL: {
    cwe: 'CWE-22',
    severity: 'medium',
    title: 'Path Traversal',
    description: 'Un chemin de fichier contrôlé par l\'utilisateur est utilisé sans validation. Un attaquant peut accéder à des fichiers en dehors du répertoire prévu (ex: ../../etc/passwd).',
    fix: 'Utiliser os.path.abspath() et vérifier que le chemin résolu commence par le répertoire autorisé. Utiliser werkzeug.utils.secure_filename() pour les uploads.',
    linePatterns: [/open\s*\(/i, /os\.path\.join/i]
  },
  XSS: {
    cwe: 'CWE-79',
    severity: 'high',
    title: 'Cross-Site Scripting (XSS)',
    description: 'Des données utilisateur sont insérées dans le HTML sans échappement. Un attaquant peut injecter du JavaScript malveillant exécuté dans le navigateur des victimes.',
    fix: 'Échapper toutes les données utilisateur avant insertion dans le HTML. Utiliser les mécanismes d\'échappement automatique du framework (Jinja2 autoescaping, React JSX).',
    linePatterns: [/innerHTML/i, /document\.write/i, /\.html\s*\(/i]
  },
  INSECURE_DESERIALIZATION: {
    cwe: 'CWE-502',
    severity: 'critical',
    title: 'Désérialisation non sécurisée',
    description: 'Désérialisation de données non fiables pouvant mener à l\'exécution de code arbitraire.',
    fix: 'Utiliser des formats sûrs comme JSON. Si pickle est nécessaire, valider la source avec une signature HMAC.',
    linePatterns: [/pickle\.loads/i, /yaml\.load\s*\(/i, /marshal\.loads/i]
  }
};

// ── Enrichissement d'une vulnérabilité ML avec la base de connaissances ─
function enrichMlVuln(vuln, code) {
  const kb = VULN_KNOWLEDGE_BASE[vuln.type];
  if (!kb) return vuln;

  const lines = code.split('\n');

  // Retrouver le numéro de ligne si manquant
  let lineNumber = vuln.line;
  if (!lineNumber || lineNumber === '?' || lineNumber === 0) {
    for (const pattern of (kb.linePatterns || [])) {
      const idx = lines.findIndex(l => pattern.test(l));
      if (idx !== -1) { lineNumber = idx + 1; break; }
    }
  }

  // Retrouver le snippet si manquant
  let snippet = vuln.snippet;
  if ((!snippet || snippet.trim() === '') && lineNumber && lineNumber !== '?') {
    snippet = lines[lineNumber - 1]?.trim() || '';
  }

  // Reconstruire vulnerableLines si vide mais qu'on a une ligne
  let vulnerableLines = vuln.vulnerableLines || [];
  if (vulnerableLines.length === 0 && lineNumber && lineNumber !== '?') {
    const lineCode = lines[lineNumber - 1]?.trim() || '';
    if (lineCode) {
      vulnerableLines = [{
        line: lineNumber,
        code: lineCode,
        explanation: kb.description.split('.')[0] // première phrase comme explication
      }];
    }
  }

  return {
    ...vuln,
    cwe:            vuln.cwe || kb.cwe,
    severity:       vuln.severity || kb.severity,
    title:          (vuln.title && vuln.title !== vuln.type && vuln.title.length > 3)
                      ? vuln.title : kb.title,
    description:    (vuln.description && !vuln.description.match(/^\w[\w_]+\s*—\s*[\d.]+%/) && vuln.description.length > 10)
                      ? vuln.description : kb.description,
    fix:            (vuln.fix && vuln.fix !== 'Corrigez la vulnérabilité.' && vuln.fix.length > 10)
                      ? vuln.fix : kb.fix,
    line:           lineNumber || '?',
    snippet:        snippet || '',
    vulnerableLines
  };
}

// ── Normalisation des types ML vers les types canoniques ──────────────
// Le service ML Python retourne des labels snake_case :
//   sql_injection, xss, exposed_secret, command_injection, path_traversal, safe
function normalizeVulnType(type) {
  if (!type) return 'UNKNOWN';
  const t = type.toUpperCase().replace(/[\s\-]/g, '_');
  const aliases = {
    // SQL Injection
    'SQL_INJECTION':         'SQL_INJECTION',
    'SQLI':                  'SQL_INJECTION',
    'SQLINJECTION':          'SQL_INJECTION',
    // Secrets — ML Python retourne "exposed_secret"
    'EXPOSED_SECRET':        'HARDCODED_SECRET',
    'HARDCODED_SECRET':      'HARDCODED_SECRET',
    'HARDCODED_SECRETS':     'HARDCODED_SECRET',
    'HARDCODED_PASSWORD':    'HARDCODED_SECRET',
    'HARDCODED_PASSWORDS':   'HARDCODED_SECRET',
    'SECRET':                'HARDCODED_SECRET',
    'SECRETS':               'HARDCODED_SECRET',
    'CREDENTIAL':            'HARDCODED_SECRET',
    'CREDENTIALS':           'HARDCODED_SECRET',
    // Command Injection
    'COMMAND_INJECTION':     'COMMAND_INJECTION',
    'CMD_INJECTION':         'COMMAND_INJECTION',
    'OS_COMMAND_INJECTION':  'COMMAND_INJECTION',
    // Hash faible (pas dans le ML Python, gardé pour compatibilité)
    'WEAK_HASH_ALGORITHM':   'WEAK_HASH_ALGORITHM',
    'WEAK_HASH':             'WEAK_HASH_ALGORITHM',
    'WEAK_CRYPTO':           'WEAK_HASH_ALGORITHM',
    'INSECURE_HASH':         'WEAK_HASH_ALGORITHM',
    // Path Traversal
    'PATH_TRAVERSAL':        'PATH_TRAVERSAL',
    'DIRECTORY_TRAVERSAL':   'PATH_TRAVERSAL',
    // XSS — ML Python retourne "xss"
    'XSS':                   'XSS',
    'CROSS_SITE_SCRIPTING':  'XSS',
  };
  return aliases[t] || t;
}

// ── Fusion des résultats ML + regex ──────────────────────────────────
// Le ML Python retourne :
//   { vulnerabilities: [{ type, severity, confidence, vulnerable_lines: [{line, code, explanation}] }] }
// On exploite vulnerable_lines directement pour avoir la ligne + snippet + explication.
function mergeSecurityResults(mlResult, regexVulns, code = '') {
  if (!mlResult) {
    return {
      score: computeSecurityScore(regexVulns),
      vulnerabilities: regexVulns,
      source: 'regex-only'
    };
  }

  const mlVulns = (mlResult.vulnerabilities || []).map((v, i) => {
    const normalizedType = normalizeVulnType(v.type || v.vulnerability_type || 'UNKNOWN');

    // ── Confidence ─────────────────────────────────────────────────
    let confidence = v.confidence;
    if (typeof confidence === 'number') {
      confidence = confidence <= 1
        ? `${(confidence * 100).toFixed(1)}%`
        : `${confidence.toFixed(2)}%`;
    } else {
      confidence = confidence || '?';
    }

    // ── Exploiter vulnerable_lines retournées par le ML Python ─────
    // Structure : [{line: N, code: "...", explanation: "..."}]
    const vulnLines = Array.isArray(v.vulnerable_lines) ? v.vulnerable_lines : [];
    const firstVulnLine = vulnLines[0] || null;

    // Construire vulnerableLines dans le format unifié
    const vulnerableLines = vulnLines.map(vl => ({
      line:        vl.line,
      code:        vl.code   || '',
      explanation: vl.explanation || ''
    }));

    const raw = {
      id:             `ML-${i + 1}`,
      type:           normalizedType,
      severity:       v.severity || 'medium',
      cwe:            v.cwe || '',
      title:          v.title || '',
      // Description : prendre l'explanation de la 1ère ligne vulnérable si dispo
      description:    firstVulnLine?.explanation || v.description || v.explanation || '',
      // Ligne : prendre du ML directement
      line:           firstVulnLine?.line || v.line || '?',
      // Snippet : code exact de la ligne vulnérable retourné par le ML
      snippet:        firstVulnLine?.code || v.snippet || '',
      fix:            v.fix || v.recommendation || '',
      confidence,
      vulnerableLines,
      source:         'ml'
    };

    // Enrichissement : compléter les champs encore vides avec la KB
    return enrichMlVuln(raw, code);
  });

  // ── Déduplication : regex prioritaire sur ML ─────────────────────
  const regexTypes = new Set(regexVulns.map(r => r.type));
  const filteredMl = mlVulns.filter(ml => !regexTypes.has(ml.type));

  const allVulns = [
    ...regexVulns,   // déjà taggées source:'regex' dans detectSecurityVulnsRegex
    ...filteredMl
  ];

  // Renumérotation propre
  allVulns.forEach((v, i) => {
    v.id = `VULN-${String(i + 1).padStart(3, '0')}`;
  });

  return {
    score: computeSecurityScore(allVulns),
    vulnerabilities: allVulns,
    source: 'merged'
  };
}

// ── Upload vers Cloudinary ────────────────────────────────────────────
function uploadToCloudinary(buffer, originalName) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'pdf-documents',
        resource_type: 'raw',
        public_id: `pdf_${Date.now()}`,
        format: 'pdf',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

// ── Handler principal ─────────────────────────────────────────────────
exports.analyzePDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier PDF reçu' });
    }

    const buffer = req.file.buffer;

    const [cloudinaryResult, pdfData] = await Promise.all([
      uploadToCloudinary(buffer, req.file.originalname),
      extractTextFromPDF(buffer)
    ]);

    const pdfUrl  = cloudinaryResult.secure_url;
    const rawText = pdfData.text;

    console.log('📄 PDF reçu:', req.file.originalname);
    console.log('📑 Pages:', pdfData.numpages);
    console.log('📝 Texte brut (300 chars):\n', rawText.substring(0, 300));

    if (!rawText?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'PDF vide ou scanné — aucun texte extractible',
        pdfUrl
      });
    }

    const codeBlocks = extractCodeBlocks(rawText);
    console.log('🔍 Blocs détectés:', codeBlocks.length);

    if (codeBlocks.length > 0) {
      console.log('💡 Aperçu bloc principal:\n', codeBlocks[0].code.substring(0, 200));
    }

    if (codeBlocks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun bloc de code détecté dans ce PDF',
        pdfUrl,
        pages: pdfData.numpages,
        hint: 'Le PDF doit contenir du code dans des blocs ``` ou indenté'
      });
    }

    const code     = codeBlocks.map(b => b.code).join('\n\n');
    const language = req.body.language || detectLanguage(code);

    console.log('💻 Langage:', language);
    console.log('📊 Bloc principal:', code.length, 'chars,', code.split('\n').length, 'lignes');

    // Analyses qualité + ML en parallèle
    const [qualityResult, securityMLResult] = await Promise.allSettled([
      analyzeCode(code, language),
      axios.post(`${ML_API_URL}/analyze`, { code, language }, { timeout: 30000 })
    ]);

    const quality = qualityResult.status === 'fulfilled'
      ? qualityResult.value
      : { qualityScore: 0, improvements: [], codeSmells: [] };

    const mlSecurity = securityMLResult.status === 'fulfilled'
      ? securityMLResult.value.data
      : null;

    // Analyse statique regex (toujours exécutée)
    const regexVulns = detectSecurityVulnsRegex(code, language);
    console.log('🛡️  Vulnérabilités regex:', regexVulns.length);
    console.log('🤖 Résultat ML:', mlSecurity ? 'OK' : 'échec/timeout');

    // Fusion ML + regex
    const security = mergeSecurityResults(mlSecurity, regexVulns, code);
    console.log('🔒 Score sécurité final:', security.score + '/100');
    console.log('🚨 Vulnérabilités totales:', security.vulnerabilities.length);

    const severityCount = security.vulnerabilities.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {});

    // Sauvegarde DB si utilisateur connecté
    const userId = req.user?.id || null;
    if (userId) {
      try {
        const projectResult = await pool.query(
          `INSERT INTO projects (user_id, name, is_guest) VALUES ($1, $2, false) RETURNING id`,
          [userId, req.file.originalname]
        );
        const projectId = projectResult.rows[0].id;
        await pool.query(
          `INSERT INTO code_versions (project_id, code, programming_language, file_name, version_number)
           VALUES ($1, $2, $3, $4, 1)`,
          [projectId, code, language, req.file.originalname]
        );
        console.log('💾 Sauvegardé en DB, project ID:', projectId);
      } catch (dbErr) {
        console.error('⚠️  Erreur DB (non bloquante):', dbErr.message);
      }
    }

    res.json({
      success: true,
      message: `${codeBlocks.length} bloc(s) détecté(s) — analyse du plus grand`,
      pdfUrl,
      pdfInfo: {
        pages:       pdfData.numpages,
        totalBlocks: codeBlocks.length,
        fileName:    req.file.originalname,
      },
      extractedCode: code,
      language,
      data: {
        qualityScore:  quality.qualityScore  ?? 0,
        improvements:  quality.improvements  || [],
        codeSmells:    quality.codeSmells    || [],
        documentation: quality.documentation || { coverage: 0, missingDocs: [] },
        metrics:       quality.metrics       || {},
      },
      security: {
        score:      security.score,
        source:     security.source,
        vulnerable: security.vulnerabilities.length > 0,
        summary: {
          total:    security.vulnerabilities.length,
          critical: severityCount.critical || 0,
          high:     severityCount.high     || 0,
          medium:   severityCount.medium   || 0,
          low:      severityCount.low      || 0,
        },
        // Chaque vulnérabilité contient maintenant :
        //   id, type, severity, cwe, title, description, line, snippet,
        //   vulnerableLines: [{line, code, explanation}], fix, confidence, source
        vulnerabilities: security.vulnerabilities,
      },
      allBlocks: codeBlocks.map((b, i) => ({
        index:    i,
        language: b.language || detectLanguage(b.code),
        lines:    b.code.split('\n').length,
        source:   b.source,
        preview:  b.code.substring(0, 80) + '...'
      }))
    });

  } catch (err) {
    console.error('❌ PDF analyze error:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur analyse PDF',
      error: err.message
    });
  }
};