// controllers/pdfController.js
const cloudinary = require('cloudinary').v2;
const PDFParser = require('pdf2json');
const axios = require('axios');
const { analyzeCode } = require('../utils/codeAnalyzer');
const pool = require('../config/db');

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';

// ── Extraction du texte depuis le buffer PDF ──────────────────────────
function extractTextFromPDF(buffer) {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, 1);

    parser.on('pdfParser_dataReady', (data) => {
      let text = '';
      data.Pages.forEach(page => {
        const textsByY = {};
        page.Texts.forEach(t => {
          const y = Math.round(t.y * 10);
          if (!textsByY[y]) textsByY[y] = [];
          textsByY[y].push(decodeURIComponent(t.R.map(r => r.T).join('')));
        });

        Object.keys(textsByY)
          .sort((a, b) => a - b)
          .forEach(y => {
            text += textsByY[y].join(' ') + '\n';
          });

        text += '\n';
      });

      resolve({ text, numpages: data.Pages.length });
    });

    parser.on('pdfParser_dataError', (err) => {
      reject(new Error(err.parserError || 'Erreur parsing PDF'));
    });

    parser.parseBuffer(buffer);
  });
}

// ── Nettoyage du code extrait par pdf2json ────────────────────────────
function cleanExtractedCode(code) {
  return code
    .replace(/   +/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Détection des blocs de code ───────────────────────────────────────
function extractCodeBlocks(rawText) {
  const blocks = [];

  // Cas 1 : blocs Markdown ```langage ... ```
  const fencePatterns = [
    /```(\w+)?\n([\s\S]*?)```/g,
    /```(\w+)?\s+([\s\S]*?)```/g,
  ];

  for (const regex of fencePatterns) {
    let match;
    while ((match = regex.exec(rawText)) !== null) {
      const code = match[2].trim();
      if (code.length > 30) {
        blocks.push({
          code: cleanExtractedCode(code),
          language: match[1] || null,
          source: 'fence'
        });
      }
    }
    if (blocks.length > 0) break;
  }

  // Cas 2 : lignes indentées
  if (blocks.length === 0) {
    const lines = rawText.split('\n');
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
        if (candidate.length > 50) {
          blocks.push({
            code: cleanExtractedCode(candidate),
            language: null,
            source: 'indentation'
          });
        }
        buf = [];
        inBlock = false;
      }
    }

    if (inBlock && buf.join('\n').trim().length > 50) {
      blocks.push({
        code: cleanExtractedCode(buf.join('\n').trim()),
        language: null,
        source: 'indentation'
      });
    }
  }

  return blocks;
}

// ── Détection automatique du langage ─────────────────────────────────
function detectLanguage(code) {
  if (/def\s+\w+\s*\(|import\s+\w+|print\s*\(/.test(code))  return 'python';
  if (/function\s+\w+|const\s+|let\s+|=>/.test(code))        return 'javascript';
  if (/public\s+(class|static|void)|System\.out/.test(code))  return 'java';
  if (/#include\s*<|int\s+main\s*\(/.test(code))             return 'cpp';
  if (/<\?php|echo\s+/.test(code))                            return 'php';
  if (/func\s+\w+.*{|:=/.test(code))                         return 'go';
  return 'javascript';
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
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier PDF reçu'
      });
    }

    const buffer = req.file.buffer;

    // Upload Cloudinary + extraction texte en parallèle
    const [cloudinaryResult, pdfData] = await Promise.all([
      uploadToCloudinary(buffer, req.file.originalname),
      extractTextFromPDF(buffer)
    ]);

    const pdfUrl = cloudinaryResult.secure_url;
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

    // Bloc le plus long
    const mainBlock = codeBlocks.reduce((a, b) =>
      a.code.length >= b.code.length ? a : b
    );

    const language = mainBlock.language
      || req.body.language
      || detectLanguage(mainBlock.code);

    const code = mainBlock.code;

    console.log('💻 Langage:', language);
    console.log('📊 Bloc principal:', code.length, 'chars,', code.split('\n').length, 'lignes');

    // Analyses qualité + sécurité en parallèle
    const [qualityResult, securityResult] = await Promise.allSettled([
      analyzeCode(code, language),
      axios.post(`${ML_API_URL}/analyze`, { code, language }, { timeout: 30000 })
    ]);

    const quality = qualityResult.status === 'fulfilled'
      ? qualityResult.value
      : { qualityScore: 0, improvements: [], codeSmells: [] };

    const security = securityResult.status === 'fulfilled'
      ? securityResult.value.data
      : null;

    // Sauvegarde DB si connecté
    const userId = req.user?.id || null;
    if (userId) {
      try {
        const projectResult = await pool.query(
          `INSERT INTO projects (user_id, name, is_guest)
           VALUES ($1, $2, false) RETURNING id`,
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
        console.error('⚠️ Erreur DB (non bloquante):', dbErr.message);
      }
    }

    res.json({
      success: true,
      message: `${codeBlocks.length} bloc(s) détecté(s) — analyse du plus grand`,
      pdfUrl,
      pdfInfo: {
        pages: pdfData.numpages,
        totalBlocks: codeBlocks.length,
        fileName: req.file.originalname,
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
      security,
      allBlocks: codeBlocks.map((b, i) => ({
        index:    i,
        language: b.language || detectLanguage(b.code),
        lines:    b.code.split('\n').length,
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