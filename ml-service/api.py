from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import RobertaForSequenceClassification, AutoTokenizer
import torch
import uvicorn

# ══════════════════════════════════════════════════════════
# CONFIGURATION
# ══════════════════════════════════════════════════════════

app = FastAPI(title="Security Analysis API")

# CORS pour permettre les requêtes depuis le frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend React
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

# Charger le modèle et le tokenizer
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = RobertaForSequenceClassification.from_pretrained(MODEL_PATH)
model = model.to(device)
model.eval()

print(f"✅ Modèle chargé sur {device}")

# Labels des vulnérabilités
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
# MODÈLE DE DONNÉES
# ══════════════════════════════════════════════════════════

class CodeRequest(BaseModel):
    code: str
    language: str

class VulnerabilityResponse(BaseModel):
    success: bool
    vulnerable: bool
    type: str
    severity: str
    confidence: float
    language: str
    message: str

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
    Analyse du code pour détecter les vulnérabilités
    """
    try:
        # Tokeniser le code
        inputs = tokenizer(
            request.code,
            padding='max_length',
            truncation=True,
            max_length=512,
            return_tensors='pt'
        ).to(device)
        
        # Prédiction
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)
            predicted_class = torch.argmax(probs, dim=-1).item()
            confidence = probs[0][predicted_class].item()
        
        vulnerability_type = LABELS[predicted_class]
        is_vulnerable = vulnerability_type != "safe"
        severity = SEVERITY[vulnerability_type]
        
        # Message personnalisé
        if is_vulnerable:
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
            message=message
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