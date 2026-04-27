const express = require('express');
const router = express.Router();
const authController = require('../controllers/Authcontroller');
const { authMiddleware } = require('../middleware/Authmiddleware'); 
const passport = require('../config/passport');
;

// Route d'inscription
router.post('/signup', authController.signup);

// Route de connexion
router.post('/login', authController.login);

// Route de déconnexion (protégée)
router.post('/logout', authMiddleware, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/vscode-register', authController.vsCodeRegister);

// Route pour vérifier le token (protégée)
router.get('/verify', authMiddleware, authController.verifyToken);
// ─── GOOGLE ────────────────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'], 
    session: false 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed` }),
  (req, res) => {
    const { token, user } = req.user;
    // Encoder les infos user en base64 pour les passer dans l'URL
    const userEncoded = Buffer.from(JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    })).toString('base64');
    
    res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?token=${token}&user=${userEncoded}`);
  }
);

// ─── GITHUB ────────────────────────────────────────────────────
router.get('/github',
  passport.authenticate('github', { 
    scope: ['user:email'], 
    session: false 
  })
);

router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=github_failed` }),
  (req, res) => {
    const { token, user } = req.user;
    const userEncoded = Buffer.from(JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    })).toString('base64');
    
    res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?token=${token}&user=${userEncoded}`);
  }
);

module.exports = router;