import requests

API_URL = "http://ml-service:8000/analyze"

test_cases = [
    {
        "name": "SQL Injection seule",
        "code": "query = 'SELECT * FROM users WHERE id = ' + user_id",
        "language": "python",
    },
    {
        "name": "XSS seul",
        "code": "document.getElementById('output').innerHTML = userInput",
        "language": "javascript",
    },
    {
        "name": "Multi-vulnérabilités (SQL + Secret)",
        "code": "API_KEY = 'sk-1234567890'\nquery = 'SELECT * FROM users WHERE id = ' + user_id",
        "language": "python",
    },
    {
        "name": "Code safe",
        "code": "query = 'SELECT * FROM users WHERE id = ?'\ndb.execute(query, [user_id])",
        "language": "python",
    }
]

print("🧪 TEST MULTI-VULNÉRABILITÉS\n" + "="*60 + "\n")

for test in test_cases:
    response = requests.post(API_URL, json={"code": test["code"], "language": test["language"]})
    result = response.json()

    print(f"📋 {test['name']}")
    print(f"   Vulnérable       : {result['vulnerable']}")
    print(f"   Total détectées  : {result['total_vulnerabilities']}")
    print(f"   Message          : {result['message']}")

    for vuln in result['vulnerabilities']:
        print(f"\n   🔴 [{vuln['severity'].upper()}] {vuln['type']} — {vuln['confidence']}%")
        for line in vuln['vulnerable_lines']:
            print(f"      Ligne {line['line']}: {line['code']}")

    print()