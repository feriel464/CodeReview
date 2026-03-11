from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import RobertaForSequenceClassification, AutoTokenizer
import torch
import uvicorn
import re

# ══════════════════════════════════════════════════════════
# CONFIGURATION
# ══════════════════════════════════════════════════════════

app = FastAPI(title="Security Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",  # ← AJOUTE CETTE LIGNE (Vite)
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════
# CHARGEMENT DU MODÈLE
# ══════════════════════════════════════════════════════════

print("🔧 Chargement du modèle...")

MODEL_PATH = "./final_model"
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = RobertaForSequenceClassification.from_pretrained(MODEL_PATH)
model = model.to(device)
model.eval()

print(f"✅ Modèle chargé sur {device}")

LABELS = {
    0: "safe",
    1: "sql_injection",
    2: "xss",
    3: "exposed_secret",
    4: "command_injection",
    5: "path_traversal"
}

SEVERITY = {
    "safe": "none",
    "sql_injection": "critical",
    "xss": "high",
    "exposed_secret": "critical",
    "command_injection": "critical",
    "path_traversal": "high"
}

# ══════════════════════════════════════════════════════════
# PATTERNS DE DÉTECTION PAR LIGNE
# ══════════════════════════════════════════════════════════

VULNERABILITY_PATTERNS = {
    "sql_injection": [
        r"SELECT.*\+.*",
        r"INSERT.*\+.*",
        r"UPDATE.*\+.*",
        r"DELETE.*\+.*",
        r"query\s*=\s*['\"].*\+",
        r"f['\"]SELECT.*\{.*\}",
        r"\.execute\(['\"].*\+",
    ],
    "xss": [
        r"innerHTML\s*=",
        r"dangerouslySetInnerHTML",
        r"document\.write\(",
        r"res\.send\(.*\+.*\)",
        r"<.*\+.*>",
    ],
    "exposed_secret": [
        r"API_KEY\s*=\s*['\"][^$]",
        r"SECRET\s*=\s*['\"][^$]",
        r"PASSWORD\s*=\s*['\"][^$]",
        r"TOKEN\s*=\s*['\"][^$]",
        r"sk-[a-zA-Z0-9]{20,}",
        r"AKIA[A-Z0-9]{16}",
    ],
    "command_injection": [
        r"os\.system\(.*\+",
        r"exec\(.*\+",
        r"eval\(",
        r"subprocess.*shell\s*=\s*True",
        r"child_process.*exec",
    ],
    "path_traversal": [
        r"open\(.*\+",
        r"sendFile\(.*\+",
        r"readFile\(.*\+",
        r"/.*\+.*filename",
    ]
}

def detect_vulnerable_lines(code, vulnerability_type):
    """
    Détecte les lignes spécifiques contenant la vulnérabilité
    """
    if vulnerability_type not in VULNERABILITY_PATTERNS:
        return []
    
    patterns = VULNERABILITY_PATTERNS[vulnerability_type]
    vulnerable_lines = []
    
    lines = code.split('\n')
    for line_num, line in enumerate(lines, 1):
        for pattern in patterns:
            if re.search(pattern, line, re.IGNORECASE):
                vulnerable_lines.append({
                    "line": line_num,
                    "code": line.strip(),
                    "pattern": pattern
                })
                break
    
    return vulnerable_lines

# ══════════════════════════════════════════════════════════
# MODÈLES DE DONNÉES
# ══════════════════════════════════════════════════════════

class CodeRequest(BaseModel):
    code: str
    language: str

class VulnerableLineDetail(BaseModel):
    line: int
    code: str
    explanation: str

class VulnerabilityResponse(BaseModel):
    success: bool
    vulnerable: bool
    type: str
    severity: str
    confidence: float
    language: str
    message: str
    vulnerable_lines: list[VulnerableLineDetail] = []
    recommendation: str = ""

# ══════════════════════════════════════════════════════════
# RECOMMANDATIONS PAR TYPE
# ══════════════════════════════════════════════════════════

RECOMMENDATIONS = {
    "sql_injection": "Utilisez des requêtes préparées (parameterized queries) avec des placeholders (?, %s) au lieu de concaténer les variables directement dans la requête SQL.",
    "xss": "Échappez toutes les données utilisateur avant de les afficher dans le HTML. Utilisez des bibliothèques comme DOMPurify ou escape-html.",
    "exposed_secret": "Stockez les secrets dans des variables d'environnement (process.env, os.environ) ou un gestionnaire de secrets (AWS Secrets Manager, Azure Key Vault).",
    "command_injection": "Utilisez des listes de paramètres au lieu de chaînes shell (subprocess.run(['cmd', arg]) au lieu de os.system('cmd ' + arg)). Évitez eval() et exec().",
    "path_traversal": "Validez et sanitizez les chemins de fichiers. Utilisez os.path.basename() ou path.basename() pour extraire seulement le nom du fichier."
}

EXPLANATIONS = {
    "sql_injection": "Concaténation de variables dans une requête SQL permettant l'injection de code malveillant",
    "xss": "Insertion non sécurisée de contenu utilisateur dans le HTML",
    "exposed_secret": "Secret ou clé API écrit en dur dans le code source",
    "command_injection": "Exécution de commandes système avec des données utilisateur non validées",
    "path_traversal": "Accès non sécurisé au système de fichiers permettant la lecture de fichiers arbitraires"
}

# ══════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {
        "message": "Security Analysis API",
        "status": "running",
        "model": "UniXcoder fine-tuned",
        "device": str(device)
    }

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": True,
        "device": str(device)
    }

@app.post("/analyze", response_model=VulnerabilityResponse)
async def analyze_code(request: CodeRequest):
    """
    Analyse du code pour détecter les vulnérabilités avec détection ligne par ligne
    """
    try:
        # Tokeniser le code complet
        inputs = tokenizer(
            request.code,
            padding='max_length',
            truncation=True,
            max_length=512,
            return_tensors='pt'
        ).to(device)
        
        # Prédiction globale
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)
            predicted_class = torch.argmax(probs, dim=-1).item()
            confidence = probs[0][predicted_class].item()
        
        vulnerability_type = LABELS[predicted_class]
        is_vulnerable = vulnerability_type != "safe"
        severity = SEVERITY[vulnerability_type]
        
        # Détecter les lignes vulnérables
        vulnerable_lines = []
        if is_vulnerable:
            detected_lines = detect_vulnerable_lines(request.code, vulnerability_type)
            
            for line_info in detected_lines:
                vulnerable_lines.append(VulnerableLineDetail(
                    line=line_info["line"],
                    code=line_info["code"],
                    explanation=EXPLANATIONS.get(vulnerability_type, "Vulnérabilité détectée")
                ))
        
        # Message personnalisé
        if is_vulnerable:
            if vulnerable_lines:
                line_numbers = ', '.join([str(vl.line) for vl in vulnerable_lines])
                message = f"{vulnerability_type.replace('_', ' ').title()} détectée aux lignes {line_numbers} ({confidence*100:.1f}% de confiance)"
            else:
                message = f"{vulnerability_type.replace('_', ' ').title()} détectée avec {confidence*100:.1f}% de confiance"
        else:
            message = "Aucune vulnérabilité détectée"
        
        return VulnerabilityResponse(
            success=True,
            vulnerable=is_vulnerable,
            type=vulnerability_type,
            severity=severity,
            confidence=round(confidence * 100, 2),
            language=request.language,
            message=message,
            vulnerable_lines=vulnerable_lines,
            recommendation=RECOMMENDATIONS.get(vulnerability_type, "") if is_vulnerable else ""
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ══════════════════════════════════════════════════════════
# LANCEMENT
# ══════════════════════════════════════════════════════════

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=5001,
        log_level="info"
    )