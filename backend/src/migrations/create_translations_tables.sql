-- Table pour les langues supportées
CREATE TABLE IF NOT EXISTS languages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    flag VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les clés de traduction
CREATE TABLE IF NOT EXISTS translation_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(100) UNIQUE NOT NULL,
    section VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les traductions
CREATE TABLE IF NOT EXISTS translations (
    id SERIAL PRIMARY KEY,
    language_id INTEGER REFERENCES languages(id) ON DELETE CASCADE,
    translation_key_id INTEGER REFERENCES translation_keys(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(language_id, translation_key_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language_id);
CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(translation_key_id);
CREATE INDEX IF NOT EXISTS idx_translation_keys_section ON translation_keys(section);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
DROP TRIGGER IF EXISTS update_languages_updated_at ON languages;
CREATE TRIGGER update_languages_updated_at 
    BEFORE UPDATE ON languages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_translation_keys_updated_at ON translation_keys;
CREATE TRIGGER update_translation_keys_updated_at 
    BEFORE UPDATE ON translation_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_translations_updated_at ON translations;
CREATE TRIGGER update_translations_updated_at 
    BEFORE UPDATE ON translations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();