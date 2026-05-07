const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');
const FormData = require('form-data');
const streamifier = require('streamifier');
const { performCodeAnalysis } = require('../controllers/analysisController');

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Seules les images sont acceptées'));
    }
    cb(null, true);
  }
});

const OCR_SERVICE_URL  = process.env.OCR_SERVICE_URL  || 'http://ocr-service:8001';
const ML_SERVICE_URL   = process.env.ML_SERVICE_URL   || 'http://ml-service:8000';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// ════════════════════════════════════════════════════
// Upload Cloudinary
// ════════════════════════════════════════════════════
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'code-images',
        resource_type: 'image',
        transformation: [{ quality: 'auto' }, { fetch_format: 'auto' }]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// ════════════════════════════════════════════════════
// Reconstruction code propre pour ML (OCR-resilient)
// ════════════════════════════════════════════════════
function reconstructCleanCode(ocrCode) {
  const lines = ocrCode.split('\n');
  const cleaned = lines.map(line => {
    line = line.replace(/\bAPI\s+KEY\b/,    'API_KEY');
    line = line.replace(/\bDB\s+PASS\w+\b/, 'DB_PASSWORD');
    line = line.replace(/os\.\s+system\s*\(/, 'os.system(');
    line = line.replace(/"SELECT\s+FROM/,   '"SELECT * FROM');
    line = line.replace(/WHERE name = (\w+)$/, "WHERE name = '\" + $1 + \"'");
    line = line.replace(/cursor\.\s+fetchone\s*\(\s*\)/, 'cursor.fetchone()');
    line = line.replace(/"rm -rf \w+\s*\+/, '"rm -rf " +');
    line = line.replace(
      /\b(const|let|var)\s+(\w+)\s+(?!=\s*)([0-9"'`\[{(])/,
      '$1 $2 = $3'
    );
    line = line.replace(
      /\b(const|let|var)\s+(\w+)\s*=\s*(\w+)\s+(\w+)\s*$/,
      '$1 $2 = $3 * $4'
    );
    line = line.replace(/console\s*\.\s*log\s*\(/, 'console.log(');
    line = line.replace(/\s+I\s*$/, '');
    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) line = line + '"';
    return line;
  });
  return cleaned.join('\n');
}

// ════════════════════════════════════════════════════
// Analyse locale (fallback si DeepSeek KO)
// ════════════════════════════════════════════════════
function analyzeCodeLocally(code, language) {
  const lines = code.split('\n');
  const improvements = [];
  const codeSmells = [];

  const secretKeywords = ['api_key', 'api key', 'password', 'db_password',
                          'secret', 'token', 'passwd'];

  lines.forEach((line, i) => {
    const lower = line.toLowerCase();

    if (secretKeywords.some(k => lower.includes(k)) &&
        (line.includes('"') || line.includes("'"))) {
      improvements.push({
        line: i + 1,
        message: 'Secret/credential hardcodé dans le code',
        suggestion: "Utilisez des variables d'environnement (.env)",
        severity: 'error'
      });
    }

    if (/\bvar\s+\w+/.test(line)) {
      improvements.push({
        line: i + 1,
        message: 'Utilisation de var (déprécié)',
        suggestion: 'Remplacer par let ou const',
        severity: 'warning'
      });
    }

    const unusedMatch = line.match(/\b(?:const|let|var)\s+(\w+)/);
    if (unusedMatch) {
      const varName = unusedMatch[1];
      const usedElsewhere = lines.some((l, j) => j !== i && l.includes(varName));
      if (!usedElsewhere) {
        codeSmells.push({
          line: i + 1,
          message: `Variable '${varName}' déclarée mais jamais utilisée`,
          severity: 'warning'
        });
      }
    }

    const funcMatch = line.match(/function\s+\w+\s*\(([^)]+)\)/);
    if (funcMatch) {
      const params = funcMatch[1].split(',').length;
      if (params > 4) {
        improvements.push({
          line: i + 1,
          message: `Fonction avec ${params} paramètres (trop)`,
          suggestion: 'Regrouper les paramètres dans un objet',
          severity: 'warning'
        });
      }
    }

    const consoleMatch = line.match(/console\s*\.\s*log\s*\(\s*(\w+)\s*\)/);
    if (consoleMatch) {
      const loggedVar = consoleMatch[1];
      const isDeclared = lines.some(l =>
        new RegExp(`\\b(?:const|let|var|function)\\s+${loggedVar}\\b`).test(l)
      );
      if (!isDeclared && loggedVar !== 'result' && loggedVar.length > 3) {
        improvements.push({
          line: i + 1,
          message: `console.log d'une variable non déclarée : '${loggedVar}'`,
          suggestion: 'Vérifiez que la variable est bien définie',
          severity: 'error'
        });
      }
    }

    const depth = (line.match(/if\s*\(/g) || []).length;
    if (depth >= 3) {
      codeSmells.push({
        line: i + 1,
        message: 'Imbrication de conditions trop profonde',
        severity: 'warning'
      });
    }

    if (lower.includes('select') && lower.includes('where') &&
        (line.includes('+') || lower.includes('input'))) {
      improvements.push({
        line: i + 1,
        message: 'Injection SQL possible',
        suggestion: 'Utilisez des requêtes préparées',
        severity: 'error'
      });
    }

    if ((lower.includes('os.system') || lower.includes('os system')) &&
        (line.includes('+') || line.includes('filename'))) {
      improvements.push({
        line: i + 1,
        message: 'Injection de commande possible avec os.system()',
        suggestion: "Utilisez subprocess.run() avec une liste d'arguments",
        severity: 'error'
      });
    }

    if (/except\s*:/.test(line)) {
      codeSmells.push({ line: i + 1, message: 'Exception générique (bare except)', severity: 'warning' });
    }
    if (/print\s*\(/.test(line)) {
      codeSmells.push({ line: i + 1, message: 'print() en production', severity: 'info' });
    }
  });

  const errorCount   = improvements.filter(i => i.severity === 'error').length;
  const warningCount = improvements.filter(i => i.severity === 'warning').length;
  const score = Math.max(5, 100 - errorCount * 20 - warningCount * 8 - codeSmells.length * 4);

  const summary = improvements.length > 0
    ? `${improvements.length} problème(s) détecté(s) : ${improvements.map(i => i.message).join(', ')}`
    : 'Aucun problème détecté (analyse locale)';

  return { score, improvements, codeSmells, correctedCode: code, summary };
}

// ════════════════════════════════════════════════════
// Analyse DeepSeek
// ════════════════════════════════════════════════════
async function analyzeWithDeepSeek(code, language) {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.warn('⚠️  DEEPSEEK_API_KEY manquante — analyse locale');
    return { ...analyzeCodeLocally(code, language), source: 'local' };
  }
  try {
    const deepseekResponse = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en analyse de code. Retourne UNIQUEMENT un JSON valide :
{
  "score": <0-100>,
  "improvements": [{"line": <n>, "message": "...", "suggestion": "...", "severity": "error|warning|info"}],
  "codeSmells": [{"line": <n>, "message": "...", "severity": "error|warning|refactor"}],
  "correctedCode": "<code corrigé>",
  "summary": "..."
}`
          },
          {
            role: 'user',
            content: `Analyse ce code ${language} (extrait par OCR, peut contenir des erreurs) :\n\n${code}`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    const content   = deepseekResponse.data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed    = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    console.log(`✅ DeepSeek OK — Score ${parsed.score}/100`);
    return { ...parsed, source: 'deepseek' };
  } catch (err) {
    console.warn('⚠️  DeepSeek indisponible :', err.message, '→ analyse locale');
    return { ...analyzeCodeLocally(code, language), source: 'local' };
  }
}

// ════════════════════════════════════════════════════
// Analyse sécurité ML
// ════════════════════════════════════════════════════
async function analyzeSecurityML(code, language) {
  try {
    const res  = await axios.post(
      `${ML_SERVICE_URL}/analyze`,
      { code, language },
      { timeout: 30000 }
    );
    const data = res.data;
    console.log(`✅ Sécurité ML : ${data.vulnerable ? data.type || data.vulnerabilities?.[0]?.type : 'safe'}`);
    return {
      ...data,
      type:     data.type     || data.vulnerabilities?.[0]?.type     || 'safe',
      severity: data.severity || data.vulnerabilities?.[0]?.severity || 'none',
    };
  } catch (err) {
    console.warn('⚠️  Service ML indisponible :', err.message);
    return {
      success: false, vulnerable: false, type: 'safe',
      severity: 'none', confidence: 0,
      message: 'Service ML indisponible (ml-service:8000)',
      vulnerable_lines: []
    };
  }
}

// ════════════════════════════════════════════════════
// Contrôleur principal — analyzeFromImage
// ════════════════════════════════════════════════════
exports.analyzeFromImage = async (req, res) => {
  try {
    const { language } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucune image fournie' });
    }

    const imageBuffer = req.file.buffer;
    console.log('📸 Analyse image démarrée...');
    console.log('📁 Taille:', (imageBuffer.length / 1024).toFixed(2), 'KB');

    // ── 1. Upload Cloudinary ─────────────────────────────
    let imageUrl = null;
    try {
      console.log('☁️  Upload Cloudinary...');
      const cloudinaryResult = await uploadToCloudinary(imageBuffer);
      imageUrl = cloudinaryResult.secure_url;
      console.log(`✅ Cloudinary : ${imageUrl}`);
    } catch (cloudErr) {
      console.error('⚠️  Cloudinary indisponible :', cloudErr.message);
    }

    // ── 2. Extraction OCR ────────────────────────────────
    console.log('🔍 Extraction OCR...');
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    formData.append('language', language || 'python');

    let ocrData;
    try {
      const ocrResponse = await axios.post(
        `${OCR_SERVICE_URL}/extract-code`,
        formData,
        {
          headers: { ...formData.getHeaders() },
          timeout: 120000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        }
      );
      ocrData = ocrResponse.data;
    } catch (ocrError) {
      console.error('❌ OCR Service error:', ocrError.message);
      const msg = ocrError.code === 'ECONNREFUSED'
        ? 'Service OCR indisponible. Lancez le service Python sur le port 5002.'
        : `Erreur OCR : ${ocrError.response?.data?.detail || ocrError.message}`;
      return res.status(503).json({
        success: false, message: msg, imageUrl,
        hint: 'Vérifiez que le service OCR Python tourne sur le port 5002'
      });
    }

    const extractedCode   = ocrData.code;
    const ocrConfidence   = ocrData.confidence;
    const ocrMethod       = ocrData.ocr_method;

    console.log(`✅ OCR OK — ${extractedCode.length} chars | méthode: ${ocrMethod} | confiance: ${ocrConfidence}%`);

    if (!extractedCode.trim()) {
      return res.status(400).json({
        success: false,
        message: "Aucun code détecté dans l'image",
        imageUrl,
        ocrConfidence
      });
    }

    // ── 3. Analyse complète (qualité + documentation + métriques) ──
    console.log('🤖 Analyse qualité, documentation & sécurité...');
    const fullAnalysis = await performCodeAnalysis(extractedCode, language || 'python');

    const codeForML = reconstructCleanCode(fullAnalysis.correctedCode || extractedCode);
    console.log('🧹 Code reconstruit pour ML:\n', codeForML);

    const securityAnalysis = await analyzeSecurityML(codeForML, language || 'python');

    // ── 4. Réponse finale ────────────────────────────────
    const finalResult = {
      success: true,
      imageUrl,
      ocrConfidence,
      ocrMethod,
      extractedCode,
      correctedCode:  fullAnalysis.correctedCode || extractedCode,
      language:       language || 'python',
      analysisSource: 'performCodeAnalysis',
      analysis: {
        score:        fullAnalysis.qualityScore,
        improvements: fullAnalysis.improvements || [],
        codeSmells:   fullAnalysis.codeSmells   || [],
        summary:      fullAnalysis.summary       || '',
        security:     securityAnalysis
      }
    };

    console.log('👤 req.user =', req.user);

    // ── 5. Sauvegarde DB ─────────────────────────────────
    if (req.user) {
      try {
        const pool = require('../config/db');

        // ── Normalisation des vulnérabilités ──────────────
        let vulnerabilitiesToSave = [];
        if (Array.isArray(securityAnalysis.vulnerabilities) && securityAnalysis.vulnerabilities.length > 0) {
          vulnerabilitiesToSave = securityAnalysis.vulnerabilities;
        } else if (securityAnalysis.vulnerable) {
          vulnerabilitiesToSave = [{
            type:             securityAnalysis.type     || 'unknown',
            severity:         securityAnalysis.severity || 'medium',
            confidence:       securityAnalysis.confidence ?? 0,
            vulnerable_lines: securityAnalysis.vulnerable_lines || [],
          }];
        }

        // ── Documentation complète ─────────────────────────
        const documentationToSave = {
          coverage:    fullAnalysis.documentation?.coverage    ?? null,
          functions:   fullAnalysis.documentation?.functions   ?? [],
          missingDocs: fullAnalysis.documentation?.missingDocs ?? [],
        };

        // ── Métriques enrichies (réelles + métadonnées OCR) ──
        const metricsToSave = {
          ...fullAnalysis.metrics,           // lines, codeLines, functions, classes, etc.
          analysisSource: 'image',
          ocrConfidence:  ocrConfidence,
          ocrMethod:      ocrMethod,
          imageUrl:       imageUrl || null,
          securityType:   securityAnalysis.type || 'safe',
          securityScore:  securityAnalysis.vulnerable
            ? Math.max(0, 100 - (vulnerabilitiesToSave.length * 20))
            : 100,
        };

        console.log('🔐 Vulnérabilités à sauvegarder :', JSON.stringify(vulnerabilitiesToSave, null, 2));

        // 1. Créer un projet
        const projectResult = await pool.query(
          `INSERT INTO projects (user_id, name, created_at)
           VALUES ($1, $2, NOW())
           RETURNING id`,
          [
            req.user.id,
            req.file?.originalname || `Image Analysis ${new Date().toLocaleDateString('fr-FR')}`,
          ]
        );
        const projectId = projectResult.rows[0].id;
        console.log('✅ Projet créé, id =', projectId);

        // 2. Insérer dans code_versions
        const versionResult = await pool.query(
          `INSERT INTO code_versions (project_id, code, programming_language, file_name, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING id`,
          [
            projectId,
            extractedCode,
            language || 'python',
            req.file?.originalname || null,
          ]
        );
        const codeVersionId = versionResult.rows[0].id;
        console.log('✅ code_versions inséré, id =', codeVersionId);

        // 3. Insérer dans analysis_results — structure identique à analyzeCode
        await pool.query(
          `INSERT INTO analysis_results
            (code_version_id, quality_score, improvements, code_smells, documentation, metrics, vulnerabilities, analyzed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            codeVersionId,
            fullAnalysis.qualityScore,
            JSON.stringify(fullAnalysis.improvements || []),
            JSON.stringify(fullAnalysis.codeSmells   || []),
            JSON.stringify(documentationToSave),
            JSON.stringify(metricsToSave),
            JSON.stringify(vulnerabilitiesToSave),
          ]
        );

        console.log('✅ Projet + code_version + analysis_results sauvegardés');
      } catch (dbErr) {
        console.error('❌ Erreur sauvegarde DB :', dbErr.message);
        console.error('❌ Stack :', dbErr.stack);
      }
    } else {
      console.warn('⚠️  req.user absent — analyse non sauvegardée');
    }

    console.log(`✅ Analyse terminée — Score: ${fullAnalysis.qualityScore} | Sécurité: ${securityAnalysis.type}`);
    return res.json(finalResult);

  } catch (error) {
    console.error('❌ Erreur inattendue analyzeFromImage:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.uploadImage = upload.single('image');

// ════════════════════════════════════════════════════
// Fix code intelligent via DeepSeek
// ════════════════════════════════════════════════════
exports.fixCode = async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        success: false,
        message: 'Code et langage requis'
      });
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'DEEPSEEK_API_KEY manquante'
      });
    }

    const prompt = `
Tu es un expert senior en qualité de code.

MISSION :
Analyse ET corrige le code ${language} suivant comme le ferait SonarQube + ESLint + sécurité OWASP.

═══════════════════════════════════════
CODE À ANALYSER :
═══════════════════════════════════════
\`\`\`${language}
${code}
\`\`\`

═══════════════════════════════════════
OBJECTIFS :
═══════════════════════════════════════
1. Détecter :
   - erreurs
   - code smells
   - problèmes de performance
   - vulnérabilités de sécurité
   - mauvaises pratiques

2. Corriger TOUT :
   - appliquer les standards du langage
   - améliorer lisibilité
   - ajouter commentaires/docstrings
   - corriger noms de variables
   - supprimer code inutile
   - ajouter gestion d'erreurs

3. Produire un code PARFAIT :
   - score 100/100 (SonarQube / ESLint)
   - zéro warning, zéro vulnérabilité

═══════════════════════════════════════
FORMAT DE SORTIE OBLIGATOIRE (JSON) :
═══════════════════════════════════════
{
  "correctedCode": "<code corrigé complet>",
  "appliedFixes": [
    {
      "line": <ligne>,
      "issue": "<problème détecté>",
      "fix": "<correction appliquée>",
      "type": "bug | smell | security | performance"
    }
  ],
  "summary": "<résumé global des corrections>"
}
`;

    console.log(`🤖 DeepSeek fixCode intelligent (${language})`);

    const response = await axios.post(
      process.env.ML_API_URL || 'http://ml-service:8000',
      {
        model: 'deepseek-coder',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 4000,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const content = response.data.choices[0].message.content;
    const cleaned = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Réponse DeepSeek invalide');

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error('JSON mal formé');
    }

    if (!parsed.correctedCode) throw new Error('Pas de code corrigé retourné');

    console.log(`✅ Fix intelligent — ${parsed.appliedFixes?.length || 0} corrections`);

    res.json({
      success: true,
      correctedCode: parsed.correctedCode,
      appliedFixes: parsed.appliedFixes || [],
      summary: parsed.summary || 'Code corrigé intelligemment'
    });

  } catch (error) {
    console.error('❌ fixCode:', error.message);

    if (error.response?.status === 401) {
      return res.status(500).json({ success: false, message: 'Clé API invalide' });
    }
    if (error.response?.status === 429) {
      return res.status(429).json({ success: false, message: 'Limite atteinte, réessayez plus tard' });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors du fix intelligent',
      error: error.message
    });
  }
};
