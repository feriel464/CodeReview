const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'code_db',
  port: process.env.DB_PORT || 5432,
});

// Test de connexion
pool.on('connect', () => {
  console.log('✅ Connexion à la base de données PostgreSQL réussie');
});

pool.on('error', (err) => {
  console.error('❌ Erreur de connexion à la base de données:', err);
});

module.exports = pool;