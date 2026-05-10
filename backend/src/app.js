const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const translationRoutes = require('./routes/translationRoutes');
const analysisRoutes = require('./routes/analysisRoutes'); 
const securityRoutes = require('./routes/securityRoutes');
const imageAnalysisRoutes = require('./routes/imageAnalysisRoutes');
const userRoutes = require('./routes/admindash/Userroutes'); 
const dashboardRoutes = require('./routes/admindash/dashboardRoutes');
const codeReviewsRoutes = require('./routes/admindash/codeReviewsRoutes');
const passport = require('./config/passport');
const chatRoutes = require('./routes/chatRoutes');

require('dotenv').config();

const app = express();

// Middlewares
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000', 
      'https://awake-illumination-production-b1f8.up.railway.app',  //urlfrontend
       process.env.FRONTEND_URL,          
      /^vscode-webview:\/\/.*/,          // Extension VS Code test add 
    ];
 
    // Autoriser les requêtes sans origin (curl, Postman, outils internes)
    if (!origin) {
      return callback(null, true);
    }
 
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      }
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
 
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS bloqué pour l'origine: ${origin}`);
      callback(new Error(`Origin ${origin} non autorisée par CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/translations', translationRoutes); 
app.use('/api/analyze', analysisRoutes); 
app.use('/api/security', securityRoutes);
app.use('/api/image', imageAnalysisRoutes);
app.use('/api/pdf', require('./routes/pdf'));
// Route de l'admin
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/code-reviews', codeReviewsRoutes);
app.use(passport.initialize());
app.use('/api/chat', chatRoutes);
// Route de test
app.get('/api', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      success: true,
      message: 'Backend OK', 
      time: result.rows[0].now 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Erreur de connexion à la base de données',
      error: error.message 
    });
  }
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({
    success: false,
    message: 'Erreur serveur interne'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📡 API disponible sur http://localhost:${PORT}/api`);
});

module.exports = app;