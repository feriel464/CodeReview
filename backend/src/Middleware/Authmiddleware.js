const jwt = require('jsonwebtoken');

// Middleware de base pour vérifier le token
const authMiddleware = (req, res, next) => {
  try {
    // Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    // Extraire le token
    const token = authHeader.split(' ')[1];

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ajouter les infos utilisateur à la requête
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.user = decoded; // ✅ Ajouté pour cohérence avec optionalAuth

    // Passer au middleware suivant
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré'
      });
    }

    console.error('Erreur d\'authentification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// Middleware pour vérifier si l'utilisateur est admin
const isAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé. Droits administrateur requis.'
    });
  }
  next();
};

// Middleware pour vérifier si l'utilisateur est admin ou c'est son propre profil
const isAdminOrOwner = (req, res, next) => {
  const targetUserId = parseInt(req.params.userId || req.params.id);
  
  if (req.userRole === 'admin' || req.userId === targetUserId) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé.'
    });
  }
};

/**
 * Middleware d'authentification optionnelle
 * Permet l'accès aux utilisateurs connectés ET non connectés
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      // Pas de token = invité
      req.user = null;
      req.userId = null;
      req.userRole = null;
      return next();
    }

    // Token présent = vérifier
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    // Token invalide = traiter comme invité
    req.user = null;
    req.userId = null;
    req.userRole = null;
    next();
  }
};

// ✅ EXPORT CORRIGÉ
module.exports = {
  authMiddleware,
  isAdmin,
  isAdminOrOwner,
  optionalAuth  // ✅ Ajouté ici
};