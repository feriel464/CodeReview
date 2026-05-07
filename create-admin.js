const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pool = new Pool({host:'postgres', port:5432, database:'code_db', user:'postgres', password:'admin'});
bcrypt.hash('Admin123', 10).then(hash => {
  pool.query('INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET password_hash=$3, role=$4', 
  ['Admin', 'admin@codereview.com', hash, 'admin']).then(() => { 
    console.log('Done'); 
    pool.end(); 
  });
});