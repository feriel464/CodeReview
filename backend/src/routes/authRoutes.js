const express = require('express');
const router = express.Router();
const authController = require('../controllers/Authcontroller');
const { authMiddleware } = require('../middleware/authMiddleware');

// Route d'inscription
router.post('/signup', authController.signup);

// Route de connexion
router.post('/login', authController.login);

// Route de déconnexion (protégée)
router.post('/logout', authMiddleware, authController.logout);

// Route pour vérifier le token (protégée)
router.get('/verify', authMiddleware, authController.verifyToken);

module.exports = router;