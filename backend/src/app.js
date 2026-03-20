const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const translationRoutes = require('./routes/translationRoutes');
const analysisRoutes = require('./routes/analysisRoutes'); 
const securityRoutes = require('./routes/securityRoutes');
const imageAnalysisRoutes = require('./routes/imageAnalysisRoutes');

require('dotenv').config();

const app = express();

// Middlewares
app.use(cors({
  origin: 'http://localhost:5173', // URL de votre frontend React
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/translations', translationRoutes); 
app.use('/api/analyze', analysisRoutes); 
app.use('/api/security', securityRoutes);
app.use('/api/image', imageAnalysisRoutes);
app.use('/api/pdf', require('./routes/pdf'));

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