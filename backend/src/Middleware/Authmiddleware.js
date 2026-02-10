const jwt = require('jsonwebtoken');

// Middleware de base pour vérifier le token (STRICT - token obligatoire)
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
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      email: decoded.email,
      username: decoded.username
    };

    console.log('✅ authMiddleware: Utilisateur authentifié', req.user);

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

    console.error('❌ Erreur d\'authentification:', error);
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
 * ✅ MIDDLEWARE D'AUTHENTIFICATION OPTIONNELLE
 * Permet l'accès aux utilisateurs connectés ET non connectés (invités)
 * 
 * Usage: Pour les routes qui acceptent à la fois les utilisateurs connectés et invités
 * Exemple: Analyse de code avec limite pour les invités
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('🔐 optionalAuth: Authorization header:', authHeader);

    // Pas de token = mode invité
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('👤 optionalAuth: Mode INVITÉ (pas de token)');
      req.user = null;
      req.userId = null;
      req.userRole = null;
      return next();
    }

    // Extraire le token
    const token = authHeader.split(' ')[1];
    
    // Token présent = vérifier et décoder
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      email: decoded.email,
      username: decoded.username
    };
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    
    console.log('✅ optionalAuth: Utilisateur CONNECTÉ', req.user);
    next();
    
  } catch (error) {
    // Token invalide ou expiré = traiter comme invité
    console.log('⚠️ optionalAuth: Token invalide, mode INVITÉ');
    req.user = null;
    req.userId = null;
    req.userRole = null;
    next();
  }
};

module.exports = {
  authMiddleware,
  isAdmin,
  isAdminOrOwner,
  optionalAuth  // ✅ Export du nouveau middleware
};