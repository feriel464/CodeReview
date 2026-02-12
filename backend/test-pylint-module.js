/**
 * Script de test pour le module pylintAnalyzer
 */

const { analyzePython } = require('./src/utils/pylintAnalyzer');

// Code Python de test avec erreurs volontaires
const testCode = `
import os

MyVariable = 42

def CalculateSum(FirstNumber, SecondNumber):
    result = FirstNumber + SecondNumber
    unusedVar = 10
    return result

def print_undefined():
    print(undefined_variable)

very_long_string = "This is a very very very very very very very very very very very very long string that exceeds 100 characters"

result = CalculateSum(5, 10)
print(result)
`;

console.log('🔬 Test du module pylintAnalyzer\n');
console.log('Code à analyser:');
console.log(testCode);
console.log('\n' + '='.repeat(60) + '\n');

// Analyser le code
analyzePython(testCode)
  .then(result => {
    console.log('📊 Résultats de l\'analyse:\n');
    
    console.log(`✅ Succès: ${result.success}`);
    console.log(`⭐ Score: ${result.score}/10`);
    console.log(`❌ Erreurs: ${result.errorCount}`);
    console.log(`⚠️  Warnings: ${result.warningCount}`);
    console.log(`📏 Conventions: ${result.conventionCount}`);
    console.log(`🔄 Refactors: ${result.refactorCount}`);
    console.log(`📝 Total problèmes: ${result.totalProblems}\n`);

    if (result.errors.length > 0) {
      console.log('🔴 ERREURS:');
      result.errors.forEach((err, index) => {
        console.log(`  ${index + 1}. Ligne ${err.line} - ${err.message}`);
        console.log(`     Symbole: ${err.symbol}`);
      });
      console.log('');
    }

    if (result.warnings.length > 0) {
      console.log('🟡 WARNINGS:');
      result.warnings.forEach((warn, index) => {
        console.log(`  ${index + 1}. Ligne ${warn.line} - ${warn.message}`);
        console.log(`     Symbole: ${warn.symbol}`);
      });
      console.log('');
    }

    if (result.conventions.length > 0) {
      console.log('📏 CONVENTIONS (PEP 8):');
      result.conventions.forEach((conv, index) => {
        console.log(`  ${index + 1}. Ligne ${conv.line} - ${conv.message}`);
        console.log(`     Symbole: ${conv.symbol}`);
      });
      console.log('');
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Test terminé! Score final: ${result.score}/10`);
  })
  .catch(error => {
    console.error('❌ Erreur lors du test:', error);
  });