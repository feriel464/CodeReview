from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import easyocr
import pytesseract
from PIL import Image
import cv2
import numpy as np
import io
import re
import uvicorn
from pygments.lexers import guess_lexer
from pygments.util import ClassNotFound

app = FastAPI(title="OCR Service v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("🔧 Chargement EasyOCR...")
reader = easyocr.Reader(['en'], gpu=False)
print("✅ EasyOCR prêt")

# ══════════════════════════════════════════════════════════
# PRÉTRAITEMENT OPENCV AMÉLIORÉ
# ══════════════════════════════════════════════════════════

def preprocess_image(img, scale=3):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Détecter thème sombre
    dark = np.mean(gray) < 128
    print(f"🎨 Thème : {'sombre' if dark else 'clair'}")
    if dark:
        gray = cv2.bitwise_not(gray)
    
    # Agrandir x3
    gray = cv2.resize(gray, None, fx=scale, fy=scale, 
                      interpolation=cv2.INTER_CUBIC)
    
    # Sharpening
    kernel = np.array([[-1,-1,-1],[-1,9,-1],[-1,-1,-1]])
    gray = cv2.filter2D(gray, -1, kernel)
    
    # CLAHE
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4,4))
    gray = clahe.apply(gray)
    
    # Seuillage adaptatif
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=11, C=2
    )
    
    return binary

# ══════════════════════════════════════════════════════════
# EXTRACTION TESSERACT
# ══════════════════════════════════════════════════════════

def extract_tesseract(binary_img) -> str:
    try:
        pil_img = Image.fromarray(binary_img)
        config = '--oem 3 --psm 6 -c preserve_interword_spaces=1'
        text = pytesseract.image_to_string(pil_img, config=config)
        return text
    except Exception as e:
        print(f"⚠️ Tesseract error: {e}")
        return ""

# ══════════════════════════════════════════════════════════
# EXTRACTION EASYOCR + ASSEMBLAGE LIGNES
# ══════════════════════════════════════════════════════════

def extract_easyocr(binary_img) -> str:
    results = reader.readtext(
        binary_img,
        detail=1,
        paragraph=False,
        width_ths=0.7,
        height_ths=0.7,
    )
    if not results:
        return ""
    return assemble_lines(results)

def assemble_lines(results, y_tolerance=15) -> str:
    if not results:
        return ""
    items = []
    for (bbox, text, conf) in results:
        ys = [pt[1] for pt in bbox]
        xs = [pt[0] for pt in bbox]
        y_center = (min(ys) + max(ys)) / 2
        x_left   = min(xs)
        items.append((y_center, x_left, text))
    
    items.sort(key=lambda t: t[0])
    lines = []
    current_line = [items[0]]
    
    for item in items[1:]:
        if abs(item[0] - current_line[-1][0]) <= y_tolerance:
            current_line.append(item)
        else:
            lines.append(current_line)
            current_line = [item]
    lines.append(current_line)
    
    text_lines = []
    for line in lines:
        line.sort(key=lambda t: t[1])
        text_lines.append(" ".join(t[2] for t in line))
    
    return "\n".join(text_lines)

# ══════════════════════════════════════════════════════════
# SCORE DE QUALITÉ D'UN TEXTE (pour choisir le meilleur)
# ══════════════════════════════════════════════════════════

def score_code_quality(text: str) -> int:
    """
    Donne un score au texte extrait.
    Plus le score est élevé, plus le texte ressemble à du code.
    """
    if not text.strip():
        return 0
    
    score = 0
    lines = [l for l in text.split('\n') if l.strip()]
    
    # Mots-clés de programmation
    keywords = [
        'def ', 'class ', 'import ', 'from ', 'return ', 'if ', 'else:',
        'elif ', 'for ', 'while ', 'try:', 'except', 'with ', 'print(',
        'function', 'const ', 'let ', 'var ', 'public ', 'private ',
        'void ', 'int ', 'string ', 'bool', '=>', '->', '::', '/*', '//',
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'WHERE'
    ]
    
    for line in lines:
        # Bonus pour chaque mot-clé trouvé
        for kw in keywords:
            if kw in line:
                score += 3
        
        # Bonus pour indentation (signe de code structuré)
        if line.startswith('    ') or line.startswith('\t'):
            score += 2
        
        # Bonus pour ponctuation de code
        score += line.count('(') + line.count(')')
        score += line.count(':') * 2
        score += line.count('=')
        
        # Pénalité pour lignes trop courtes (bruit OCR)
        if len(line.strip()) < 3:
            score -= 2
    
    # Bonus pour nombre de lignes raisonnable
    if 3 <= len(lines) <= 100:
        score += 10
    
    return score

# ══════════════════════════════════════════════════════════
# NETTOYAGE INTELLIGENT
# ══════════════════════════════════════════════════════════

def clean_code_intelligent(text: str, language: str) -> str:
    """
    Corrections OCR basées sur des règles regex intelligentes
    plutôt qu'un dictionnaire statique.
    """
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # Supprimer les lignes de bruit pur
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append('')
            continue
        if re.match(r'^[^a-zA-Z0-9_#/\'"(){}\[\]]*$', stripped):
            continue
        if len(stripped) < 2:
            continue
        
        # ── Corrections caractères ─────────────────────────
        # 0 vs O au début des mots (import, os, etc.)
        line = re.sub(r'\b0S\b', 'os', line)
        line = re.sub(r'\b0s\b', 'os', line)
        
        # l/I vs i au début des mots-clés
        line = re.sub(r'\b[lI]mport\b', 'import', line)
        line = re.sub(r'\b[lI]f\b', 'if', line)
        line = re.sub(r'\bdei\b', 'def', line)
        line = re.sub(r'\b[dD]ef\b', 'def', line)
        
        # Corrections fréquentes OCR
        line = re.sub(r'\bGearch\b', 'search', line)
        line = re.sub(r'\bGeturn\b', 'return', line)
        line = re.sub(r'\bGleanup\b', 'cleanup', line)
        line = re.sub(r'\b[Gg]ecrets?\b', '# Secrets', line)
        
        # Espaces autour des opérateurs
        line = re.sub(r'([a-zA-Z0-9_])\s*=\s*([a-zA-Z0-9_\'"])', r'\1 = \2', line)
        
        # Corriger l'indentation (remplacer 2 espaces par 4)
        leading_spaces = len(line) - len(line.lstrip())
        if leading_spaces % 2 == 0 and leading_spaces > 0:
            indent_level = leading_spaces // 2
            line = '    ' * indent_level + line.lstrip()
        
        # ── Corrections spécifiques Python ─────────────────
        if language == 'python':
            # def foo(args) [lettre] → def foo(args):
            line = re.sub(r'(def\s+\w+\s*\([^)]*\))\s+\w\s*$', r'\1:', line)
            # class Foo [lettre] → class Foo:
            line = re.sub(r'(class\s+\w+.*?)\s+\w\s*$', r'\1:', line)
        
        cleaned_lines.append(line)
    
    result = '\n'.join(cleaned_lines)
    # Réduire les lignes vides multiples
    result = re.sub(r'\n{3,}', '\n\n', result)
    return result.strip()

# ══════════════════════════════════════════════════════════
# DÉTECTION DU LANGAGE AVEC PYGMENTS
# ══════════════════════════════════════════════════════════

def detect_language(code: str, hint: str = "python") -> str:
    """
    Détecte automatiquement le langage avec Pygments.
    Si la confiance est faible, on garde le hint utilisateur.
    """
    try:
        lexer = guess_lexer(code)
        detected = lexer.name.lower()
        
        # Mapper vers tes noms de langages
        lang_map = {
            'python':     'python',
            'javascript': 'javascript',
            'typescript': 'typescript',
            'java':       'java',
            'c++':        'cpp',
            'c#':         'csharp',
            'go':         'go',
            'rust':       'rust',
            'php':        'php',
            'ruby':       'ruby',
            'sql':        'sql',
            'bash':       'bash',
            'text':       hint,  # Pygments pas sûr → garder le hint
        }
        
        for key, value in lang_map.items():
            if key in detected:
                print(f"🔍 Langage détecté : {value} (Pygments: {lexer.name})")
                return value
        
        return hint
        
    except ClassNotFound:
        print(f"⚠️ Langage non détecté, utilisation du hint: {hint}")
        return hint

# ══════════════════════════════════════════════════════════
# PIPELINE HYBRIDE PRINCIPAL
# ══════════════════════════════════════════════════════════

def extract_best_text(img) -> tuple[str, str, float]:
    """
    Lance Tesseract + EasyOCR en parallèle,
    retourne (meilleur_texte, méthode_utilisée, confiance)
    """
    binary = preprocess_image(img)
    
    # Lancer les deux OCR
    tess_text  = extract_tesseract(binary)
    easy_text  = extract_easyocr(binary)
    
    tess_score = score_code_quality(tess_text)
    easy_score = score_code_quality(easy_text)
    
    print(f"📊 Score Tesseract: {tess_score} | Score EasyOCR: {easy_score}")
    
    if tess_score >= easy_score:
        return tess_text, "tesseract", min(95.0, 70 + tess_score * 0.1)
    else:
        return easy_text, "easyocr",   min(95.0, 70 + easy_score * 0.1)

# ══════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {"message": "OCR Service v2", "status": "running"}


@app.post("/extract-code")
async def extract_code(
    file: UploadFile = File(...),
    language: str = "python"
):
    try:
        contents = await file.read()
        nparr    = np.frombuffer(contents, np.uint8)
        img      = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Image invalide")

        # 1. Extraire le meilleur texte (hybride)
        raw_text, method, confidence = extract_best_text(img)
        
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Aucun texte détecté")

        print(f"✅ Méthode utilisée : {method}")

        # 2. Détecter le langage
        detected_language = detect_language(raw_text, hint=language)

        # 3. Nettoyer intelligemment
        cleaned_code = clean_code_intelligent(raw_text, detected_language)

        return {
            "success":          True,
            "code":             cleaned_code,
            "raw_text":         raw_text,
            "confidence":       round(confidence, 2),
            "language":         detected_language,
            "language_hint":    language,
            "ocr_method":       method,
            "lines_detected":   len(raw_text.split('\n')),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5002, log_level="info")