from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import easyocr
import cv2
import numpy as np
from PIL import Image
import io
import re
import uvicorn

app = FastAPI(title="OCR Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════
# INITIALISATION OCR
# ══════════════════════════════════════════════════════════

print("🔧 Chargement du modèle EasyOCR...")
reader = easyocr.Reader(['en'], gpu=False)  # Mettre gpu=True si tu as CUDA
print("✅ Modèle OCR chargé")

# ══════════════════════════════════════════════════════════
# NETTOYAGE DU CODE
# ══════════════════════════════════════════════════════════

def clean_code(text, language):
    """
    Nettoie le texte extrait par OCR pour corriger les erreurs communes
    """
    # Corrections de caractères confondus par l'OCR
    corrections = {
        '|': 'I',
        '０': '0', 'Ｏ': 'O', '１': '1',
        'tmport': 'import',
        '@ysgl': 'mysql',
        'APTKEY': 'API_KEY',
        'OBYPASSWORD': 'DB_PASSWORD',
        'Ooo': '',
        'o@': '',
        '@o@': '',
        'lusermame': '(username',
        'cusoraexecute': 'cursor.execute',
        'Geturn': 'return',
        'cursoofetchone': 'cursor.fetchone',
        'Gleanup': 'cleanup',
        'twename': '(filename',
        'ososystem': 'os.system',
        '~t': '-rf',
    }
    
    for wrong, correct in corrections.items():
        text = text.replace(wrong, correct)
    
    # Supprimer les lignes qui sont juste des symboles
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # Ignorer les lignes qui sont juste @ ou @@ ou @@@ etc.
        if re.match(r'^[@\s]*$', line):
            continue
        # Ignorer les lignes avec moins de 3 caractères
        if len(line.strip()) < 3:
            continue
        cleaned_lines.append(line)
    
    text = '\n'.join(cleaned_lines)
    
    # Corrections spécifiques Python
    if language == 'python':
        # Corriger def functions
        text = re.sub(r'def\s+(\w+)\s*\(([^)]*)\)\s*[a-z]', r'def \1(\2):', text)
        # Corriger les imports
        text = re.sub(r'tmport\s+', 'import ', text)
        text = re.sub(r'import\s+@', 'import ', text)
        # Corriger les assignments
        text = re.sub(r'(\w+)\s+A\s+"', r'\1 = "', text)
        text = re.sub(r'(\w+)\s+E\s+"', r'\1 = "', text)
    
    # Supprimer les lignes vides multiples
    text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
    
    return text.strip()

# ══════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {
        "message": "OCR Service",
        "status": "running"
    }

@app.post("/extract-code")
async def extract_code(
    file: UploadFile = File(...),
    language: str = "python"
):
    """
    Extrait le code d'une image avec EasyOCR
    """
    try:
        # Lire l'image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Image invalide")
        
        # Prétraitement pour améliorer l'OCR
        # Convertir en niveaux de gris
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Augmenter le contraste
        gray = cv2.convertScaleAbs(gray, alpha=1.5, beta=0)
        
        # Appliquer un seuillage adaptatif
        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        # Débruitage
        denoised = cv2.fastNlMeansDenoising(binary, None, 10, 7, 21)
        
        # OCR avec EasyOCR
        print(f"📸 Extraction du texte...")
        results = reader.readtext(denoised)
        
        # Assembler le texte extrait
        extracted_text = '\n'.join([result[1] for result in results])
        
        if not extracted_text.strip():
            raise HTTPException(
                status_code=400, 
                detail="Aucun texte détecté dans l'image"
            )
        
        print(f"✅ Texte extrait : {len(extracted_text)} caractères")
        
        # Nettoyer le code
        cleaned_code = clean_code(extracted_text, language)
        
        # Calculer la confiance moyenne
        avg_confidence = np.mean([result[2] for result in results]) * 100
        
        return {
            "success": True,
            "code": cleaned_code,
            "raw_text": extracted_text,
            "confidence": round(avg_confidence, 2),
            "language": language,
            "lines_detected": len(results)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur OCR : {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ══════════════════════════════════════════════════════════
# LANCEMENT
# ══════════════════════════════════════════════════════════

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=5002,
        log_level="info"
    )