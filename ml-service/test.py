import requests
import json

# URL de l'API
API_URL = "http://localhost:5001/analyze"

# Exemples de test
test_cases = [
    {
        "code": "query = 'SELECT * FROM users WHERE id = ' + user_id",
        "language": "python",
        "expected": "sql_injection"
    },
    {
        "code": "document.getElementById('output').innerHTML = userInput",
        "language": "javascript",
        "expected": "xss"
    },
    {
        "code": "API_KEY = 'sk-1234567890'",
        "language": "python",
        "expected": "exposed_secret"
    },
    {
        "code": "query = 'SELECT * FROM users WHERE id = ?'\ndb.execute(query, [user_id])",
        "language": "python",
        "expected": "safe"
    }
]

print("🧪 TEST DE L'API\n" + "="*60 + "\n")

for i, test in enumerate(test_cases, 1):
    response = requests.post(API_URL, json=test)
    result = response.json()
    
    status = "✅" if result['type'] == test['expected'] else "❌"
    
    print(f"{status} Test {i}")
    print(f"   Code     : {test['code'][:50]}...")
    print(f"   Attendu  : {test['expected']}")
    print(f"   Détecté  : {result['type']}")
    print(f"   Confiance: {result['confidence']}%\n")