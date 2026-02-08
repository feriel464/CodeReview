-- Table pour stocker les projets/analyses
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    description TEXT,
    is_guest BOOLEAN DEFAULT false,
    guest_ip VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les versions de code
CREATE TABLE IF NOT EXISTS code_versions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    programming_language VARCHAR(50) NOT NULL,  -- Renommé pour éviter confusion
    file_name VARCHAR(255),
    version_number INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les résultats d'analyse
CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    code_version_id INTEGER REFERENCES code_versions(id) ON DELETE CASCADE,
    quality_score INTEGER,
    improvements JSONB,
    code_smells JSONB,
    documentation JSONB,
    metrics JSONB,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour suivre l'usage des invités
CREATE TABLE IF NOT EXISTS guest_usage (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    analysis_count INTEGER DEFAULT 0,
    last_analysis_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ip_address)
);

-- Table pour les langages de PROGRAMMATION supportés (différente de la table languages pour les traductions)
CREATE TABLE IF NOT EXISTS programming_languages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des langages de programmation supportés
INSERT INTO programming_languages (code, name, icon) VALUES
('python', 'Python', '🐍'),
('javascript', 'JavaScript', '📜'),
('typescript', 'TypeScript', '💠'),
('java', 'Java', '☕'),
('cpp', 'C++', '⚡'),
('csharp', 'C#', '#️⃣'),
('go', 'Go', '🔷'),
('rust', 'Rust', '🦀'),
('php', 'PHP', '🐘'),
('ruby', 'Ruby', '💎'),
('swift', 'Swift', '🕊️'),
('kotlin', 'Kotlin', '🟣'),
('c', 'C', '⚙️'),
('r', 'R', '📊'),
('sql', 'SQL', '🗄️'),
('html', 'HTML', '🌐'),
('css', 'CSS', '🎨'),
('bash', 'Bash', '💻'),
('perl', 'Perl', '🐪'),
('scala', 'Scala', '🔺')
ON CONFLICT (code) DO NOTHING;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_code_versions_project_id ON code_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_code_version_id ON analysis_results(code_version_id);
CREATE INDEX IF NOT EXISTS idx_guest_usage_ip ON guest_usage(ip_address);

-- Triggers
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();