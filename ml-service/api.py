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
        "http://localhost:5173",
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

SEVERITY_ORDER = {"critical": 0, "high": 1, "none": 2}

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

EXPLANATIONS = {
    "sql_injection": "Concaténation de variables dans une requête SQL permettant l'injection de code malveillant",
    "xss": "Insertion non sécurisée de contenu utilisateur dans le HTML",
    "exposed_secret": "Secret ou clé API écrit en dur dans le code source",
    "command_injection": "Exécution de commandes système avec des données utilisateur non validées",
    "path_traversal": "Accès non sécurisé au système de fichiers permettant la lecture de fichiers arbitraires"
}

def detect_vulnerable_lines(code, vulnerability_type):
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

# ── NOUVEAU : un objet par vulnérabilité détectée ──
class VulnerabilityDetail(BaseModel):
    type: str
    severity: str
    confidence: float
    vulnerable_lines: list[VulnerableLineDetail] = []

# ── NOUVEAU : réponse avec liste de vulnérabilités ──
class VulnerabilityResponse(BaseModel):
    success: bool
    vulnerable: bool
    language: str
    message: str
    total_vulnerabilities: int
    vulnerabilities: list[VulnerabilityDetail] = []

# ══════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {
        "message": "Security Analysis API",
        "status": "running",
        "model": "RoBERTa fine-tuned",
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
    try:
        # ── 1. Prédiction ML → récupérer les probabilités de TOUS les types ──
        inputs = tokenizer(
            request.code,
            padding='max_length',
            truncation=True,
            max_length=512,
            return_tensors='pt'
        ).to(device)

        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)[0]  # tensor de 6 scores

        # ── 2. Scanner TOUS les types de vulnérabilités avec les regex ──
        found_vulnerabilities = []

        for vuln_type in VULNERABILITY_PATTERNS.keys():
            detected_lines = detect_vulnerable_lines(request.code, vuln_type)

            if detected_lines:
                # Récupérer le score ML pour ce type spécifique
                label_index = next(k for k, v in LABELS.items() if v == vuln_type)
                confidence = round(probs[label_index].item() * 100, 2)

                vulnerable_lines = [
                    VulnerableLineDetail(
                        line=line_info["line"],
                        code=line_info["code"],
                        explanation=EXPLANATIONS.get(vuln_type, "Vulnérabilité détectée")
                    )
                    for line_info in detected_lines
                ]

                found_vulnerabilities.append(VulnerabilityDetail(
                    type=vuln_type,
                    severity=SEVERITY[vuln_type],
                    confidence=confidence,
                    vulnerable_lines=vulnerable_lines
                ))

        # ── 3. Trier par sévérité (critical → high) ──
        found_vulnerabilities.sort(key=lambda v: SEVERITY_ORDER[v.severity])

        is_vulnerable = len(found_vulnerabilities) > 0

        if is_vulnerable:
            types = ', '.join([v.type.replace('_', ' ').title() for v in found_vulnerabilities])
            message = f"{len(found_vulnerabilities)} vulnérabilité(s) détectée(s) : {types}"
        else:
            message = "Aucune vulnérabilité détectée"

        return VulnerabilityResponse(
            success=True,
            vulnerable=is_vulnerable,
            language=request.language,
            message=message,
            total_vulnerabilities=len(found_vulnerabilities),
            vulnerabilities=found_vulnerabilities
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