# Fichier de test pour Pylint - VERSION CORRIGÉE

# Import supprimé car non utilisé

# Variable globale avec bon nommage (UPPER_CASE pour constante)
MY_GLOBAL_VARIABLE = 42


# Fonction avec bon nommage
def calculate_sum(first_number, second_number):
    """Calcule la somme de deux nombres."""
    total = first_number + second_number
    # Variable 'unusedVar' supprimée
    return total


# Fonction corrigée
def print_value():
    """Affiche la valeur de la variable globale."""
    print(MY_GLOBAL_VARIABLE)  # Variable définie


# Ligne divisée pour respecter la limite de 100 caractères
very_long_string = (
    "This is a very very very very very very very very "
    "very very very very long string"
)


# Code correct
def calculate_average(numbers):
    """Calcule la moyenne d'une liste de nombres."""
    total = sum(numbers)
    count = len(numbers)
    if count == 0:
        return 0
    return total / count


# Tests
sum_result = calculate_sum(5, 10)
print(sum_result)

average = calculate_average([1, 2, 3, 4, 5])
print(average)

print_value()

