import runpod
import os

print("🚀 Handler démarré — test minimal")

HF_TOKEN = os.getenv("HF_TOKEN", "")
print(f"HF_TOKEN présent: {bool(HF_TOKEN)}")

# Test 1 — imports de base
try:
    import torch
    print(f"✅ torch importé — CUDA: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"✅ GPU: {torch.cuda.get_device_name(0)}")
        print(f"✅ VRAM disponible: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
except Exception as e:
    print(f"❌ torch erreur: {e}")

# Test 2 — sentence transformers
try:
    from sentence_transformers import SentenceTransformer
    print("✅ sentence_transformers importé")
    embedder = SentenceTransformer("BAAI/bge-base-en-v1.5")
    print("✅ embedder chargé")
except Exception as e:
    print(f"❌ sentence_transformers erreur: {e}")

# Test 3 — chromadb
try:
    import chromadb
    chroma_client = chromadb.Client()
    print("✅ chromadb chargé")
except Exception as e:
    print(f"❌ chromadb erreur: {e}")

# Test 4 — huggingface login
try:
    from huggingface_hub import login
    login(token=HF_TOKEN)
    print("✅ HuggingFace login réussi")
except Exception as e:
    print(f"❌ HuggingFace login erreur: {e}")

# Test 5 — chargement tokenizer seulement
try:
    from transformers import AutoTokenizer
    print("📥 Chargement tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained("REMADI/deepseek-code-review-4bit")
    tokenizer.pad_token = tokenizer.eos_token
    print("✅ Tokenizer chargé")
except Exception as e:
    print(f"❌ Tokenizer erreur: {e}")

# Test 6 — chargement modèle
try:
    from transformers import AutoModelForCausalLM
    print("📥 Chargement modèle 4-bit...")
    import torch
    model = AutoModelForCausalLM.from_pretrained(
        "REMADI/deepseek-code-review-4bit",
        device_map="auto",
        torch_dtype=torch.float16
    )
    model.eval()
    print("✅ Modèle chargé !")
except Exception as e:
    print(f"❌ Modèle erreur: {e}")

print("✅ Tous les tests terminés — handler prêt")

def handler(job):
    job_input = job["input"]
    action    = job_input.get("action", "test")

    if action == "test":
        return {
            "success": True,
            "message": "RunPod fonctionne !",
            "cuda": torch.cuda.is_available() if 'torch' in dir() else False
        }

    return {"success": False, "error": f"Action inconnue: {action}"}

runpod.serverless.start({"handler": handler})