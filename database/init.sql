-- ══════════════════════════════════════════
-- FONCTION update_updated_at
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ══════════════════════════════════════════
-- USERS
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    google_id VARCHAR(255),
    github_id VARCHAR(255),
    avatar VARCHAR(500),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP
);

-- ══════════════════════════════════════════
-- LANGUAGES (traductions)
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS languages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    flag VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO languages (code, name, flag) VALUES
('fr', 'Français', '🇫🇷'),
('en', 'English',  '🇬🇧'),
('ar', 'العربية',  '🇸🇦')
ON CONFLICT (code) DO NOTHING;
-- ══════════════════════════════════════════
-- TRANSLATION KEYS
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS translation_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(100) UNIQUE NOT NULL,
    section VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ══════════════════════════════════════════
-- TRANSLATIONS
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS translations (
    id SERIAL PRIMARY KEY,
    language_id INTEGER REFERENCES languages(id) ON DELETE CASCADE,
    translation_key_id INTEGER REFERENCES translation_keys(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(language_id, translation_key_id)
);

-- ══════════════════════════════════════════
-- PROGRAMMING LANGUAGES
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS programming_languages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- ══════════════════════════════════════════
-- PROJECTS
-- ══════════════════════════════════════════
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

-- ══════════════════════════════════════════
-- CODE VERSIONS
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS code_versions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    programming_language VARCHAR(50) NOT NULL,
    file_name VARCHAR(255),
    version_number INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ══════════════════════════════════════════
-- ANALYSIS RESULTS
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    code_version_id INTEGER REFERENCES code_versions(id) ON DELETE CASCADE,
    quality_score INTEGER,
    improvements JSONB,
    code_smells JSONB,
    documentation JSONB,
    metrics JSONB,
    vulnerabilities JSONB,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ══════════════════════════════════════════
-- ISSUES
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS issues (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER,
    type VARCHAR(50),
    severity VARCHAR(50),
    message TEXT,
    line_number INTEGER
);

-- ══════════════════════════════════════════
-- GUEST USAGE
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS guest_usage (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    analysis_count INTEGER DEFAULT 0,
    last_analysis_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ip_address)
);

-- ══════════════════════════════════════════
-- INDEX
-- ══════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_code_versions_project_id ON code_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_code_version_id ON analysis_results(code_version_id);
CREATE INDEX IF NOT EXISTS idx_guest_usage_ip ON guest_usage(ip_address);
CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language_id);
CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(translation_key_id);