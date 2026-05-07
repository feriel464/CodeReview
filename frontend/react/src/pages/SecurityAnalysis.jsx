import React, { useState } from 'react';
import axios from 'axios';
import './SecurityAnalysis.css';

const SecurityAnalysis = () => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeCode = async () => {
    if (!code.trim()) {
      alert('Veuillez entrer du code à analyser');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post('http://localhost:8000/analyze', {
        code,
        language
      });

      setResult(response.data);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'analyse');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  // Fonction pour afficher le code avec les lignes surlignées
  const renderCodeWithHighlights = () => {
    const lines = code.split('\n');
    const vulnerableLineNumbers = result?.vulnerable_lines?.map(vl => vl.line) || [];

    return (
      <div className="code-display">
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const isVulnerable = vulnerableLineNumbers.includes(lineNumber);
          
          return (
            <div 
              key={index} 
              className={`code-line ${isVulnerable ? 'vulnerable-line' : ''}`}
            >
              <span className="line-number">{lineNumber}</span>
              <pre className="line-code">{line || ' '}</pre>
              {isVulnerable && (
                <span className="vulnerability-marker">⚠️</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="security-analysis-container">
      <div className="header">
        <h1>🔒 Analyse de Sécurité IA</h1>
        <p>Détection de vulnérabilités avec Intelligence Artificielle</p>
      </div>

      <div className="analysis-form">
        <div className="form-group">
          <label>Langage</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="c">C/C++</option>
          </select>
        </div>

        <div className="form-group">
          <label>Code à analyser</label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Collez votre code ici..."
            rows={15}
            className="code-input"
          />
        </div>

        <button onClick={analyzeCode} disabled={loading} className="analyze-btn">
          {loading ? '⏳ Analyse en cours...' : '🔍 Analyser'}
        </button>
      </div>

      {result && (
        <div className={`result-card ${result.vulnerable ? 'vulnerable' : 'safe'}`}>
          <div className="result-header">
            <h2>
              {result.vulnerable ? '⚠️ Vulnérabilité Détectée' : '✅ Code Sécurisé'}
            </h2>
          </div>

          <div className="result-details">
            <div className="detail-row">
              <span className="label">Type :</span>
              <span className="value">{result.type.replace('_', ' ').toUpperCase()}</span>
            </div>

            <div className="detail-row">
              <span className="label">Sévérité :</span>
              <span 
                className="severity-badge"
                style={{ backgroundColor: getSeverityColor(result.severity) }}
              >
                {result.severity.toUpperCase()}
              </span>
            </div>

            <div className="detail-row">
              <span className="label">Confiance :</span>
              <span className="value">{result.confidence}%</span>
            </div>

            <div className="detail-row">
              <span className="label">Message :</span>
              <span className="value">{result.message}</span>
            </div>
          </div>

          {result.vulnerable_lines && result.vulnerable_lines.length > 0 && (
            <div className="vulnerable-lines-section">
              <h3>📍 Lignes Vulnérables Détectées</h3>
              <div className="vulnerable-lines-list">
                {result.vulnerable_lines.map((vl, index) => (
                  <div key={index} className="vulnerable-line-item">
                    <div className="line-header">
                      <span className="line-badge">Ligne {vl.line}</span>
                    </div>
                    <pre className="vulnerable-code">{vl.code}</pre>
                    <p className="line-explanation">
                      <strong>⚠️ Problème :</strong> {vl.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.vulnerable && (
            <div className="code-highlight-section">
              <h3>📝 Code avec surlignage des vulnérabilités</h3>
              {renderCodeWithHighlights()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SecurityAnalysis;
