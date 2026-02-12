// Configuration ESLint v10 (flat config)
module.exports = [
  {
    // Fichiers à analyser
    files: ['**/*.js'],
    
    // Variables globales disponibles
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        // Variables Node.js
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly'
      }
    },
    
    // Règles
    rules: {
      'no-unused-vars': 'warn',        // Variable non utilisée = warning
      'no-console': 'off',             // Autoriser console.log
      'no-undef': 'error',             // Variable non définie = erreur
      'semi': ['error', 'always'],     // Point-virgule obligatoire
      'quotes': ['warn', 'single']     // Préférer guillemets simples
    }
  }
];