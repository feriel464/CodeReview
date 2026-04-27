const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
// Fonction pour générer un token JWT
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Inscription (Sign Up)
const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Validation des données
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir tous les champs requis'
      });
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email invalide'
      });
    }

    // Validation du mot de passe (minimum 8 caractères)
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 8 caractères'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userExists.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Hacher le mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insérer le nouvel utilisateur (role par défaut: 'user')
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email, role, created_at',
      [name, email.toLowerCase(), hashedPassword, 'user']
    );

    const newUser = result.rows[0];

    // Générer le token JWT avec le rôle
    const token = generateToken(newUser.id, newUser.role);

    // Retourner la réponse
    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.created_at
        },
        token
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'inscription'
    });
  }
};

// Connexion (Login)
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validation des données
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir l\'email et le mot de passe'
      });
    }

    // Rechercher l'utilisateur
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const user = result.rows[0];

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Générer le token JWT avec le rôle
    const token = generateToken(user.id, user.role);

    // Mettre à jour la dernière connexion (optionnel)


    // Retourner la réponse
    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.created_at
        },
        token
      }
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la connexion'
    });
  }
};

// Déconnexion (Logout) 
const logout = async (req, res) => {
  try {
    // La déconnexion avec JWT est principalement gérée côté client
    // Le serveur confirme simplement la demande de déconnexion

    if (req.userId) {
      console.log(`Utilisateur ${req.userId} s'est déconnecté à ${new Date().toISOString()}`);
      

    }

    // réponse de succès
    res.status(200).json({
      success: true,
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la déconnexion'
    });
  }
};

// Vérifier le token (pour les routes protégées)
const verifyToken = async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.rows[0]
      }
    });

  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};
// Transporter email (configure avec ton service)
// ✅ Après (avec tes variables .env existantes)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // false pour le port 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Mot de passe oublié
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requis' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Toujours retourner 200 pour ne pas révéler si l'email existe
    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé.'
      });
    }

    const user = result.rows[0];

    // Générer le token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Sauvegarder en DB
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [hashedToken, expires, user.id]
    );

    // Lien de reset
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Envoyer l'email
    await transporter.sendMail({
      from: `"CodeReview" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>Réinitialisation du mot de passe</h2>
          <p>Bonjour ${user.name},</p>
          <p>Vous avez demandé une réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous (valable 15 minutes) :</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#7C3AED;color:white;border-radius:8px;text-decoration:none;">
            Réinitialiser mon mot de passe
          </a>
          <p style="margin-top:16px;color:#666;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        </div>
      `
    });

    res.status(200).json({
      success: true,
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé.'
    });

  } catch (error) {
    console.error('Erreur forgotPassword:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Réinitialiser le mot de passe
const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token et mot de passe requis' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    // Hasher le token reçu pour comparer avec la DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [hashedToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Token invalide ou expiré' });
    }

    const user = result.rows[0];
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Mettre à jour le mot de passe et effacer le token
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.status(200).json({ success: true, message: 'Mot de passe réinitialisé avec succès' });

  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
const vsCodeRegister = async (req, res) => {
  try {
    const { extensionId } = req.body;
 
    // Validation basique
    if (!extensionId || typeof extensionId !== 'string' || extensionId.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'extensionId invalide ou manquant',
      });
    }
 
    // Email fictif unique par installation — ne peut pas se connecter depuis le web
    const fakeEmail = `vscode_${extensionId}@vscode.local`;
    const fakeName  = `VSCode-${extensionId.substring(8, 20)}`;
 
    // Vérifie si ce compte VS Code existe déjà (re-lancement ou réinstallation)
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [fakeEmail]
    );
 
    let userId;
 
    if (existing.rows.length > 0) {
      // Installation déjà connue → on récupère juste l'userId
      userId = existing.rows[0].id;
      console.log(`🖥️  VS Code reconnect — userId: ${userId}`);
    } else {
      // Toute première installation → on crée le compte automatiquement
      const newUser = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id`,
        [
          fakeName,
          fakeEmail,
          'NO_PASSWORD_VSCODE_ACCOUNT', // pas de vrai mot de passe
          'vscode_user',                // rôle distinct des vrais utilisateurs
        ]
      );
      userId = newUser.rows[0].id;
      console.log(`🖥️  VS Code register — nouveau compte créé, userId: ${userId}`);
    }
 
    // JWT valide 30 jours — même format que les JWT normaux de ton système
    // Le middleware optionalAuth va décoder ce token et mettre req.user.id
    // → isGuest = false → aucune limite d'analyses
    const token = jwt.sign(
      { userId, role: 'vscode_user' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
 
    return res.status(200).json({
      success: true,
      token,
      message: 'Extension VS Code enregistrée avec succès',
    });
 
  } catch (error) {
    console.error('❌ vsCodeRegister:', error);
    res.status(500).json({
      success:  false,
      message:  'Erreur lors de l\'enregistrement de l\'extension',
      error:    error.message,
    });
  }
};

module.exports = {
  signup,
  login,
  logout,
  verifyToken, 
  forgotPassword,   
  resetPassword , 
   vsCodeRegister
};