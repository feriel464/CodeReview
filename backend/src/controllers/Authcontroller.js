const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

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

module.exports = {
  signup,
  login,
  logout,
  verifyToken
};