const express = require('express');
const router = express.Router();
const translationController = require('../controllers/translationController');

// Récupérer toutes les traductions
router.get('/', translationController.getAllTranslations);

// Récupérer les langues disponibles
router.get('/languages', translationController.getLanguages);

// Récupérer les sections
router.get('/sections', translationController.getSections);

// Récupérer les traductions d'une langue
router.get('/:languageCode', translationController.getTranslationsByLanguage);

// Mettre à jour plusieurs traductions (bulk)
router.put('/bulk', translationController.updateBulkTranslations);

// Mettre à jour une traduction
router.put('/:languageCode/:keyName', translationController.updateTranslation);

module.exports = router;
