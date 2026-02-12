/**
 * Script de test pour le module codeAnalyzer (module central)
 */

const { analyzeCode } = require('./src/utils/codeAnalyzer');

console.log('🔬 Test du module codeAnalyzer (module central)\n');
console.log('='.repeat(70) + '\n');

// Test 1 : JavaScript
const jsCode = `
const unusedVar = 42;
console.log(undefinedVar);
const greeting = "Hello"
`;

console.log('📜 TEST 1 : JavaScript');
console.log('Code:', jsCode);

analyzeCode(jsCode, 'javascript')
  .then(result => {
    console.log('\n📊 Résultats JavaScript:');
    console.log(`  ✅ Succès: ${result.success}`);
    console.log(`  ⭐ Score de qualité: ${result.qualityScore}/100`);
    console.log(`  ❌ Erreurs: ${result.errorCount}`);
    console.log(`  ⚠️  Warnings: ${result.warningCount}`);
    console.log('\n' + '='.repeat(70) + '\n');

    // Test 2 : Python
    const pyCode = `
import os

MyVariable = 42

def CalculateSum(a, b):
    return a + b
`;

    console.log('🐍 TEST 2 : Python');
    console.log('Code:', pyCode);

    return analyzeCode(pyCode, 'python');
  })
  .then(result => {
    console.log('\n📊 Résultats Python:');
    console.log(`  ✅ Succès: ${result.success}`);
    console.log(`  ⭐ Score de qualité: ${result.qualityScore}/100`);
    if (result.score !== undefined) {
      console.log(`  📈 Score Pylint: ${result.score}/10`);
    }
    console.log(`  ❌ Erreurs: ${result.errorCount}`);
    console.log(`  ⚠️  Warnings: ${result.warningCount}`);
    console.log(`  📏 Conventions: ${result.conventionCount || 0}`);
    console.log('\n' + '='.repeat(70) + '\n');

    // Test 3 : Langage non supporté
    const javaCode = `
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`;

    console.log('☕ TEST 3 : Java (non supporté)');
    console.log('Code:', javaCode);

    return analyzeCode(javaCode, 'java');
  })
  .then(result => {
    console.log('\n📊 Résultats Java:');
    console.log(`  ✅ Succès: ${result.success}`);
    console.log(`  ⚠️  Simulé: ${result.simulated}`);
    console.log(`  ⭐ Score de qualité: ${result.qualityScore}/100`);
    console.log('\n' + '='.repeat(70));
    console.log('✅ Tous les tests terminés!');
  })
  .catch(error => {
    console.error('❌ Erreur lors du test:', error);
  });