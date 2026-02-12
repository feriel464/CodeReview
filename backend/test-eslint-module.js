/**
 * Script de test pour le module eslintAnalyzer
 */

const { analyzeJavaScript } = require('./src/utils/eslintAnalyzer');

// Code de test avec erreurs volontaires
const testCode = `
const unusedVariable = 42;

console.log(undefinedVariable);

const greeting = "Hello"

function test() {
  const x = 5
  return x
}
`;

console.log('🔬 Test du module eslintAnalyzer\n');
console.log('Code à analyser:');
console.log(testCode);
console.log('\n' + '='.repeat(50) + '\n');

// Analyser le code
analyzeJavaScript(testCode)
  .then(result => {
    console.log('📊 Résultats de l\'analyse:\n');
    
    console.log(`✅ Succès: ${result.success}`);
    console.log(`❌ Erreurs: ${result.errorCount}`);
    console.log(`⚠️  Warnings: ${result.warningCount}`);
    console.log(`🔧 Corrections possibles: ${result.fixableErrorCount + result.fixableWarningCount}`);
    console.log(`📝 Total problèmes: ${result.totalProblems}\n`);

    if (result.errors.length > 0) {
      console.log('🔴 ERREURS:');
      result.errors.forEach((err, index) => {
        console.log(`  ${index + 1}. Ligne ${err.line}:${err.column} - ${err.message} (${err.ruleId})`);
      });
      console.log('');
    }

    if (result.warnings.length > 0) {
      console.log('🟡 WARNINGS:');
      result.warnings.forEach((warn, index) => {
        console.log(`  ${index + 1}. Ligne ${warn.line}:${warn.column} - ${warn.message} (${warn.ruleId})`);
      });
      console.log('');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Test terminé avec succès!');
  })
  .catch(error => {
    console.error('❌ Erreur lors du test:', error);
  });