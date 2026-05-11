import runpod
import ast
import os
import uuid
import chromadb
import torch
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForCausalLM

# Chemin du modèle dans le Network Volume
MODEL_PATH = "/runpod-volume/deepseek-model"

print("📥 Chargement tokenizer depuis Network Volume...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
tokenizer.pad_token = tokenizer.eos_token

print("📥 Chargement modèle depuis Network Volume...")
model = AutoModelForCausalLM.from_pretrained(
    MODEL_PATH,
    device_map="auto",
    torch_dtype=torch.float16
)
model.eval()
print("✅ Modèle prêt !")

print("📥 Chargement embedder...")
embedder      = SentenceTransformer("BAAI/bge-base-en-v1.5")
chroma_client = chromadb.Client()
sessions      = {}
print("✅ Pipeline prêt !")

def extract_chunks(source_code, filename="code.py"):
    chunks = []
    try:
        tree = ast.parse(source_code)
    except SyntaxError:
        return [{"name": filename, "code": source_code,
                 "type": "file", "file": filename,
                 "line_start": 0, "line_end": 0}]
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
            node_type = "function" if isinstance(node, ast.FunctionDef) else "class"
            lines = source_code.split("\n")[node.lineno - 1:node.end_lineno]
            chunks.append({"name": node.name, "code": "\n".join(lines),
                           "type": node_type, "file": filename,
                           "line_start": node.lineno, "line_end": node.end_lineno})
    if not chunks:
        chunks.append({"name": filename, "code": source_code,
                       "type": "file", "file": filename,
                       "line_start": 0, "line_end": 0})
    return chunks

def build_vector_store(chunks, session_id):
    collection_name = f"s_{session_id[:8]}"
    try:
        chroma_client.delete_collection(collection_name)
    except:
        pass
    collection = chroma_client.create_collection(
        name=collection_name, metadata={"hnsw:space": "cosine"})
    documents, metadatas, ids = [], [], []
    for i, chunk in enumerate(chunks):
        text = (f"Fichier: {chunk['file']}\nType: {chunk['type']}\n"
                f"Nom: {chunk['name']}\nCode:\n{chunk['code']}")
        documents.append(text)
        metadatas.append({"name": chunk["name"], "type": chunk["type"],
                          "file": chunk["file"],
                          "line_start": str(chunk.get("line_start", 0)),
                          "line_end": str(chunk.get("line_end", 0))})
        ids.append(f"chunk_{i}")
    embeddings = embedder.encode(documents, show_progress_bar=False).tolist()
    collection.add(documents=documents, embeddings=embeddings,
                   metadatas=metadatas, ids=ids)
    return collection

def retrieve_chunks(question, collection, top_k=3):
    q_emb = embedder.encode([question]).tolist()
    results = collection.query(query_embeddings=q_emb, n_results=top_k)
    return [{"document": results["documents"][0][i],
             "metadata": results["metadatas"][0][i],
             "distance": results["distances"][0][i]}
            for i in range(len(results["documents"][0]))]

def handler(job):
    job_input  = job["input"]
    action     = job_input.get("action")
    session_id = job_input.get("session_id", "")

    if action == "index":
        source_code = job_input.get("source_code", "")
        filename    = job_input.get("filename", "code.py")
        chunks      = extract_chunks(source_code, filename)
        session_id  = str(uuid.uuid4())
        collection  = build_vector_store(chunks, session_id)
        sessions[session_id] = collection
        return {
            "success":      True,
            "session_id":   session_id,
            "chunks_count": len(chunks),
            "functions":    [c["name"] for c in chunks if c["type"] == "function"],
            "classes":      [c["name"] for c in chunks if c["type"] == "class"]
        }

    if action == "chat":
        question   = job_input.get("question", "")
        max_tokens = job_input.get("max_tokens", 512)

        if session_id not in sessions:
            return {"success": False, "error": "Session non trouvée"}

        collection      = sessions[session_id]
        relevant_chunks = retrieve_chunks(question, collection, top_k=3)

        context = "\n\n".join([
            f"### [{c['metadata']['type'].upper()}] `{c['metadata']['name']}`\n"
            f"```python\n{c['document']}\n```"
            for c in relevant_chunks
        ])

        prompt = f"""### Instruction:
Tu es un expert en revue de code Python. Analyse uniquement le code fourni.

## Code :
{context}

## Question :
{question}

### Réponse:"""

        inputs = tokenizer(
            prompt, return_tensors="pt",
            truncation=True, max_length=2048
        ).to("cuda" if torch.cuda.is_available() else "cpu")

        input_length = inputs["input_ids"].shape[1]

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=0.7,
                do_sample=True,
                top_p=0.95,
                top_k=50,
                repetition_penalty=1.2,
                pad_token_id=tokenizer.eos_token_id
            )

        answer = tokenizer.decode(
            outputs[0][input_length:],
            skip_special_tokens=True
        ).strip()

        return {
            "success":     True,
            "answer":      answer,
            "chunks_used": [{"name": r["metadata"]["name"],
                             "file": r["metadata"]["file"],
                             "score": round(1 - r["distance"], 2)}
                            for r in relevant_chunks],
            "source":      "fine-tuned"
        }

    return {"success": False, "error": f"Action inconnue: {action}"}

runpod.serverless.start({"handler": handler})