// middleware/pdfUpload.js
const multer = require('multer');

// memoryStorage = le fichier reste en RAM sous forme de Buffer
// C'est ce qu'on passe à Cloudinary ET à pdf-parse
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Fichier PDF uniquement'), false);
    }
  }
});

module.exports = pdfUpload;