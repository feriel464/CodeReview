const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');
const FormData = require('form-data');
const streamifier = require('streamifier');

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

const OCR_SERVICE_URL  = process.env.OCR_SERVICE_URL  || 'http://localhost:5002';
const ML_SERVICE_URL   = process.env.ML_SERVICE_URL   || 'http://localhost:5001';
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
    line = line.replace(
      /WHERE name = (\w+)$/,
      "WHERE name = '\" + $1 + \"'"
    );
    line = line.replace(/cursor\.\s+fetchone\s*\(\s*\)/, 'cursor.fetchone()');
    line = line.replace(/"rm -rf \w+\s*\+/, '"rm -rf " +');
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
        line.includes('=') && (line.includes('"') || line.includes("'"))) {
      improvements.push({
        line: i + 1,
        message: 'Secret/credential hardcodé dans le code',
        suggestion: "Utilisez des variables d'environnement (.env)",
        severity: 'error'
      });
    }

    if (lower.includes('select') && lower.includes('where') &&
        (line.includes('+') || lower.includes('username') || lower.includes('input'))) {
      improvements.push({
        line: i + 1,
        message: 'Injection SQL possible — concaténation de chaîne dans une requête',
        suggestion: 'Utilisez des requêtes préparées avec des paramètres (?)',
        severity: 'error'
      });
    }

    if ((lower.includes('os.system') || lower.includes('os system')) &&
        (line.includes('+') || line.includes('filename') || line.includes('input'))) {
      improvements.push({
        line: i + 1,
        message: 'Injection de commande possible avec os.system()',
        suggestion: 'Utilisez subprocess.run() avec une liste d\'arguments',
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
  const score = Math.max(0, 100 - errorCount * 20 - warningCount * 5 - codeSmells.length * 3);
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
      message: 'Service ML indisponible (localhost:5001)',
      vulnerable_lines: []
    };
  }
}

// ════════════════════════════════════════════════════
// Contrôleur principal
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

    const extractedCode = ocrData.code;
    const ocrConfidence = ocrData.confidence;
    const ocrMethod     = ocrData.ocr_method;

    console.log(`✅ OCR OK — ${extractedCode.length} chars | méthode: ${ocrMethod} | confiance: ${ocrConfidence}%`);

    if (!extractedCode.trim()) {
      return res.status(400).json({
        success: false,
        message: "Aucun code détecté dans l'image",
        imageUrl,
        ocrConfidence
      });
    }

    // ── 3. Analyse qualité puis sécurité ─────────────────
    console.log('🤖 Analyse qualité & sécurité...');
    const deepseekAnalysis = await analyzeWithDeepSeek(extractedCode, language || 'python');

    const codeForML = reconstructCleanCode(deepseekAnalysis.correctedCode || extractedCode);
    console.log('🧹 Code reconstruit pour ML:\n', codeForML);

    const securityAnalysis = await analyzeSecurityML(codeForML, language || 'python');

    // ── 4. Réponse finale ────────────────────────────────
    const finalResult = {
      success: true,
      imageUrl,
      ocrConfidence,
      ocrMethod,
      extractedCode,
      correctedCode:  deepseekAnalysis.correctedCode || extractedCode,
      language:       language || 'python',
      analysisSource: deepseekAnalysis.source,
      analysis: {
        score:        deepseekAnalysis.score,
        improvements: deepseekAnalysis.improvements || [],
        codeSmells:   deepseekAnalysis.codeSmells   || [],
        summary:      deepseekAnalysis.summary       || '',
        security:     securityAnalysis
      }
    };

    console.log(`✅ Analyse terminée — Score: ${deepseekAnalysis.score} | Source: ${deepseekAnalysis.source} | Sécurité: ${securityAnalysis.type}`);
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