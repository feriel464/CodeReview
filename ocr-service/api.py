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
import pytesseract 
app = FastAPI(title="OCR Service v3")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
pytesseract.pytesseract.tesseract_cmd = r'/usr/bin/tesseract'

print("🔧 Chargement EasyOCR...")
reader = easyocr.Reader(['en'], gpu=False)
print("✅ EasyOCR prêt")

# ══════════════════════════════════════════════════════════
# PRÉTRAITEMENT — VERSION CORRIGÉE (Otsu sur fond sombre)
# ══════════════════════════════════════════════════════════

def preprocess_image(img, scale=4):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    dark = np.mean(gray) < 128
    print(f"🎨 Thème : {'sombre' if dark else 'clair'} (mean={np.mean(gray):.1f})")

    # Inversion si fond sombre
    if dark:
        gray = cv2.bitwise_not(gray)

    # Upscale x4 avec Lanczos (meilleur que Cubic pour le texte)
    gray = cv2.resize(gray, None, fx=scale, fy=scale,
                      interpolation=cv2.INTER_LANCZOS4)

    # Débruitage léger (préserve les bords du texte)
    gray = cv2.fastNlMeansDenoising(gray, h=5)

    # ── CORRECTION PRINCIPALE : Otsu au lieu d'adaptatif ──
    # Otsu choisit le seuil global optimal → bien meilleur
    # sur les screenshots de code avec fond uniforme
    _, binary = cv2.threshold(
        gray, 0, 255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    return binary


def preprocess_image_adaptive(img, scale=4):
    """
    Variante adaptative — utilisée en fallback si Otsu échoue.
    Meilleure pour les images avec éclairage non-uniforme.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    dark = np.mean(gray) < 128
    if dark:
        gray = cv2.bitwise_not(gray)

    gray = cv2.resize(gray, None, fx=scale, fy=scale,
                      interpolation=cv2.INTER_LANCZOS4)

    kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
    gray = cv2.filter2D(gray, -1, kernel)

    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
    gray = clahe.apply(gray)

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
        x_left = min(xs)
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
# SCORE DE QUALITÉ
# ══════════════════════════════════════════════════════════

def score_code_quality(text: str) -> int:
    if not text.strip():
        return 0

    score = 0
    lines = [l for l in text.split('\n') if l.strip()]

    keywords = [
        'def ', 'class ', 'import ', 'from ', 'return ', 'if ', 'else:',
        'elif ', 'for ', 'while ', 'try:', 'except', 'with ', 'print(',
        'function', 'const ', 'let ', 'var ', 'public ', 'private ',
        'void ', 'int ', 'string ', 'bool', '=>', '->', '::', '/*', '//',
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'WHERE', 'os.', 'cursor.',
        'import ', 'mysql', 'connector', 'system('
    ]

    for line in lines:
        for kw in keywords:
            if kw in line:
                score += 3

        if line.startswith('    ') or line.startswith('\t'):
            score += 2

        score += line.count('(') + line.count(')')
        score += line.count(':') * 2
        score += line.count('=')

        # Bonus si la ligne ressemble à du vrai code (peu de symboles @ # parasites)
        noise_chars = sum(1 for c in line if c in '@#$&^%~')
        score -= noise_chars

        if len(line.strip()) < 3:
            score -= 2

    if 3 <= len(lines) <= 100:
        score += 10

    return score


# ══════════════════════════════════════════════════════════
# NETTOYAGE INTELLIGENT
# ══════════════════════════════════════════════════════════

def clean_code_intelligent(text: str, language: str) -> str:
    lines = text.split('\n')
    cleaned_lines = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append('')
            continue

        # Supprimer les lignes de bruit pur (pas de lettres/chiffres utiles)
        if re.match(r'^[^a-zA-Z0-9_#/\'"(){}\[\]]*$', stripped):
            continue
        if len(stripped) < 2:
            continue

        # ── Corrections caractères courants OCR ───────────
        line = re.sub(r'\b0S\b', 'os', line)
        line = re.sub(r'\b0s\b', 'os', line)
        line = re.sub(r'\b[lI]mport\b', 'import', line)
        line = re.sub(r'\b[lI]f\b', 'if', line)
        line = re.sub(r'\bdei\b', 'def', line)
        line = re.sub(r'\b[dD]ef\b', 'def', line)

        # Nettoyer les artefacts de fin de ligne (ex: "Ny" ou "ao" isolés)
        line = re.sub(r'\s+[A-Z][a-z]$', '', line)

        # ❌ SUPPRIMÉ : regex "search user" → transformait os.system en os_system
        # ❌ SUPPRIMÉ : correction indentation → cassait l'indentation Python
        # ❌ SUPPRIMÉ : espaces autour de = → modifiait les valeurs de strings

        # Corriger "rooti23" → "root123" (1 vs i)
        line = re.sub(r'rooti(\d)', r'root1\1', line)

        # ── Corrections Python ─────────────────────────────
        if language == 'python':
            line = re.sub(r'(def\s+\w+\s*\([^)]*\))\s+\w\s*$', r'\1:', line)
            line = re.sub(r'(class\s+\w+.*?)\s+\w\s*$', r'\1:', line)
            line = re.sub(r'(def\s+\w+\s*\([^)]*\))\s*\)', r'\1):', line)

        cleaned_lines.append(line)

    result = '\n'.join(cleaned_lines)
    result = re.sub(r'\n{3,}', '\n\n', result)
    return result.strip()
# ══════════════════════════════════════════════════════════
# DÉTECTION DU LANGAGE
# ══════════════════════════════════════════════════════════
def fix_ocr_artifacts(text: str) -> str:
    lines = text.split('\n')
    cleaned = []
    
    for line in lines:
        # Supprimer la ligne parasite "return go(f, seed, [])"
        if re.match(r'^\s*return\s+go\s*\(', line):
            continue
        # Supprimer toute ligne avec des tokens inconnus comme go(f, seed
        if re.search(r'\bgo\s*\(\s*f\s*,\s*seed', line):
            continue
            
        # Corriger les espaces parasites dans les parenthèses
        # "encode( )" → "encode()"
        line = re.sub(r'\(\s+\)', '()', line)
        # "execute(query )" → "execute(query)"
        line = re.sub(r'\(\s*(\w+)\s+\)', r'(\1)', line)
        # "( password)" → "(password)"
        line = re.sub(r'\(\s+(\w)', r'(\1', line)
        
        cleaned.append(line)
    
    return '\n'.join(cleaned)



    
def detect_language(code: str, hint: str = "python") -> str:
    try:
        lexer = guess_lexer(code)
        detected = lexer.name.lower()

        lang_map = {
            'python': 'python',
            'javascript': 'javascript',
            'typescript': 'typescript',
            'java': 'java',
            'c++': 'cpp',
            'c#': 'csharp',
            'go': 'go',
            'rust': 'rust',
            'php': 'php',
            'ruby': 'ruby',
            'sql': 'sql',
            'bash': 'bash',
            'text': hint,
        }

        for key, value in lang_map.items():
            if key in detected:
                print(f"🔍 Langage détecté : {value} (Pygments: {lexer.name})")
                return value

        return hint

    except ClassNotFound:
        print(f"⚠️ Langage non détecté, hint: {hint}")
        return hint


# ══════════════════════════════════════════════════════════
# PIPELINE HYBRIDE — OTSU EN PRIORITÉ
# ══════════════════════════════════════════════════════════

def extract_best_text(img) -> tuple[str, str, float]:
    h, w = img.shape[:2]
    
    # Scale adaptatif selon la taille de l'image
    scale = 2 if (w > 1000 or h > 800) else 4
    print(f"📐 Image {w}x{h} → scale x{scale}")

    binary_otsu  = preprocess_image(img, scale=scale)
    tess_otsu    = extract_tesseract(binary_otsu)
    score_otsu   = score_code_quality(tess_otsu)
    print(f"📊 Score Tesseract+Otsu: {score_otsu}")

    binary_adapt = preprocess_image_adaptive(img, scale=max(2, scale-1))
    tess_adapt   = extract_tesseract(binary_adapt)
    score_adapt  = score_code_quality(tess_adapt)
    print(f"📊 Score Tesseract+Adapt: {score_adapt}")

    easy_text  = extract_easyocr(binary_otsu)
    easy_score = score_code_quality(easy_text)
    print(f"📊 Score EasyOCR: {easy_score}")

    candidates = [
        (tess_otsu,  "tesseract+otsu",     score_otsu),
        (tess_adapt, "tesseract+adaptive", score_adapt),
        (easy_text,  "easyocr",            easy_score),
    ]
    best_text, best_method, best_score = max(candidates, key=lambda x: x[2])

    print(f"✅ Meilleur: {best_method} (score={best_score})")
    confidence = min(95.0, 70 + best_score * 0.1)
    return best_text, best_method, confidence


# ══════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {"message": "OCR Service v3", "status": "running"}

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "OCR Service v3",
        "uptime": True
    }

@app.post("/extract-code")
async def extract_code(
    file: UploadFile = File(...),
    language: str = "python"
):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Image invalide ou format non supporté")

        raw_text, method, confidence = extract_best_text(img)

        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Aucun texte détecté dans l'image")

        print(f"✅ Méthode: {method} | Confiance: {confidence:.1f}%")

        detected_language = detect_language(raw_text, hint=language)
        cleaned_code = clean_code_intelligent(raw_text, detected_language)

        return {
            "success": True,
            "code": cleaned_code,
            "raw_text": raw_text,
            "confidence": round(confidence, 2),
            "language": detected_language,
            "language_hint": language,
            "ocr_method": method,
            "lines_detected": len(raw_text.split('\n')),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5002, log_level="info")