// aiAnalyzer.js
const axios = require('axios');

const SYSTEM_PROMPT = `Tu es un expert en révision de code. Analyse le code fourni et retourne UNIQUEMENT un JSON valide avec cette structure :
{
  "qualityScore": <nombre entre 0 et 100>,
  "errors": [{"line": <n>, "message": "...", "severity": "error"}],
  "warnings": [{"line": <n>, "message": "...", "severity": "warning"}],
  "improvements": [{"line": <n>, "message": "...", "suggestion": "...", "severity": "convention"}],
  "codeSmells": [{"line": <n>, "message": "...", "variable": "...", "severity": "error|warning|refactor"}],
  "metrics": {
    "totalLines": <n>,
    "functions": <n>,
    "classes": <n>,
    "complexity": "low|medium|high"
  },
  "summary": "Résumé de l'analyse en 1-2 phrases"
}
Sois précis, donne les numéros de ligne exacts, et explique chaque problème clairement.`;

async function analyzeWithAI(code, language) {
  try {
    // Appel à DeepSeek API (compatible OpenAI)
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-coder',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Langage: ${language}\n\nCode à analyser:\n\`\`\`${language}\n${code}\n\`\`\`` }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0].message.content;
    
    // Extraire le JSON de la réponse
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Réponse IA invalide');
    
    const result = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      qualityScore: result.qualityScore || 50,
      improvements: result.improvements || [],
      codeSmells: [...(result.errors || []), ...(result.codeSmells || [])],
      warnings: result.warnings || [],
      errorCount: (result.errors || []).length,
      warningCount: (result.warnings || []).length,
      metrics: {
        totalLines: code.split('\n').length,
        ...result.metrics,
      },
      summary: result.summary || '',
    };

  } catch (error) {
    console.error('❌ Erreur AI Analyzer:', error.message);
    return {
      success: false,
      error: error.message,
      qualityScore: 0,
      improvements: [],
      codeSmells: [],
      errorCount: 0,
      warningCount: 0,
    };
  }
}

module.exports = { analyzeWithAI };