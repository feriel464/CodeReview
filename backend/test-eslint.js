// Fichier de test pour ESLint - VERSION CORRIGÉE

// ✅ Variable définie et utilisée
const definedVariable = 42;
console.log(definedVariable);  // Utilise une variable qui existe

// ✅ Code correct
const greeting = 'Hello';
console.log(greeting);  // Maintenant utilisé

const name = 'Alice';
console.log(name);  // Maintenant utilisé

const age = 30;
console.log(age);

// ✅ Fonction sans variable inutile
function calculateSum(a, b) {
  const result = a + b;
  // Variable 'unused' supprimée car pas utilisée
  return result;
}

// Appel de la fonction
const sum = calculateSum(5, 3);
console.log(sum);