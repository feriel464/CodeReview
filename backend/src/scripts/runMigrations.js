const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

async function runMigrations() {
  try {
    console.log('🚀 Début des migrations...\n');

    // Migration 1
    const migration1 = fs.readFileSync(
      path.join(__dirname, '../migrations/create_translations_tables.sql'),
      'utf8'
    );
    await pool.query(migration1);
    console.log('✅ Migration 1: Tables créées');

    // Migration 2
    const migration2 = fs.readFileSync(
      path.join(__dirname, '../migrations/seed_initial_data.sql'),
      'utf8'
    );
    await pool.query(migration2);
    console.log('✅ Migration 2: Données insérées');

// Migration 3 - Tables d'analyse de code
const migration3 = fs.readFileSync(
  path.join(__dirname, '../migrations/create_analysis_tables.sql'),
  'utf8'
);
await pool.query(migration3);
console.log('✅ Migration 3: Tables d’analyse créées');

    console.log('\n🎉 Migrations terminées avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors des migrations:', error);
    process.exit(1);
  }
}

runMigrations();