// backend/routes/chatRoutes.js

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const chatController = require('../controllers/chatController');

// Multer en mémoire pour les fichiers .py et .zip
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.originalname.endsWith('.py') || 
            file.originalname.endsWith('.zip')) {
            cb(null, true);
        } else {
            cb(new Error('Seuls les fichiers .py et .zip sont acceptés'));
        }
    },
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

router.post('/index', upload.single('file'), chatController.indexFile);
router.post('/ask',                          chatController.askQuestion);
router.delete('/session/:session_id',        chatController.deleteSession);

module.exports = router;
