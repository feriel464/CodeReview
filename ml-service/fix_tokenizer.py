# fix_tokenizer.py - Régénérer le tokenizer
from transformers import AutoTokenizer
import os

print("🔧 Régénération du tokenizer...")

# Télécharger le tokenizer original de UniXcoder
print("📥 Téléchargement depuis HuggingFace...")
tokenizer = AutoTokenizer.from_pretrained("microsoft/unixcoder-base")

# Sauvegarder dans final_model
output_path = "./final_model"
print(f"💾 Sauvegarde dans {output_path}...")
tokenizer.save_pretrained(output_path)

print("✅ Tokenizer régénéré avec succès !")
print("\nFichiers créés :")
for file in os.listdir(output_path):
    if 'tokenizer' in file.lower():
        print(f"   ✅ {file}")