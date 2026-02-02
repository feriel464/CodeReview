// backend/create-admin.js
// Script pour créer un utilisateur administrateur
require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'codereview_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function createAdmin() {
  try {
    console.log('\n👤 Création d\'un compte administrateur...\n');
    
    // Informations de l'admin
    const adminData = {
      name: 'Admin',
      email: 'admin@codereview.com',
      password: 'Admin123', // Changez ce mot de passe !
      role: 'admin'
    };
    
    console.log('📋 Informations du compte admin:');
    console.log('   Email:', adminData.email);
    console.log('   Mot de passe:', adminData.password);
    console.log('   ⚠️  IMPORTANT: Changez ce mot de passe après la première connexion!\n');
    
    // Vérifier si l'admin existe déjà
    console.log('🔍 Vérification si l\'admin existe déjà...');
    const existingAdmin = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [adminData.email]
    );
    
    if (existingAdmin.rows.length > 0) {
      console.log('⚠️  Un compte avec cet email existe déjà!');
      console.log('\n💡 Options:');
      console.log('   1. Supprimer l\'ancien compte et en créer un nouveau');
      console.log('   2. Utiliser un autre email\n');
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('Voulez-vous supprimer et recréer l\'admin? (oui/non): ', async (answer) => {
        if (answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'o') {
          await pool.query('DELETE FROM users WHERE email = $1', [adminData.email]);
          console.log('✅ Ancien compte supprimé');
          await insertAdmin(adminData);
        } else {
          console.log('❌ Opération annulée');
          await pool.end();
          process.exit(0);
        }
        readline.close();
      });
      return;
    }
    
    await insertAdmin(adminData);
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error('\n💡 Vérifiez:');
    console.error('   - PostgreSQL est démarré');
    console.error('   - La table users existe');
    console.error('   - Les identifiants dans .env sont corrects\n');
  }
}

async function insertAdmin(adminData) {
  try {
    // Hasher le mot de passe
    console.log('🔐 Hashage du mot de passe...');
    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    console.log('✅ Mot de passe hashé');
    
    // Insérer l'admin
    console.log('\n💾 Insertion dans la base de données...');
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email, role, created_at',
      [adminData.name, adminData.email, hashedPassword, adminData.role]
    );
    
    const newAdmin = result.rows[0];
    
    console.log('\n✅ Compte administrateur créé avec succès!\n');
    console.log('📋 Détails du compte:');
    console.log('   ' + '='.repeat(60));
    console.log('   ID:', newAdmin.id);
    console.log('   Nom:', newAdmin.name);
    console.log('   Email:', newAdmin.email);
    console.log('   Rôle:', newAdmin.role);
    console.log('   Créé le:', newAdmin.created_at);
    console.log('   ' + '='.repeat(60));
    
    console.log('\n🔑 Identifiants de connexion:');
    console.log('   ' + '='.repeat(60));
    console.log('   Email:     admin@codereview.com');
    console.log('   Password:  Admin@123456');
    console.log('   ' + '='.repeat(60));
    
    console.log('\n⚠️  SÉCURITÉ:');
    console.log('   Changez ce mot de passe après votre première connexion!\n');
    
    console.log('🚀 Prochaines étapes:');
    console.log('   1. Connectez-vous avec ces identifiants');
    console.log('   2. Vous serez redirigé vers /admin/dashboard');
    console.log('   3. Changez votre mot de passe dans les paramètres\n');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createAdmin();