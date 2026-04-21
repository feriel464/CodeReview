/**
 * apiClient.ts
 * Couche d'accès HTTP vers le backend Express existant.
 * Réutilise exactement les routes définies dans analysisRoutes.js.
 */

import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';

export interface AnalysisRequest {
  code: string;
  language: string;
  fileName?: string;
}

export interface AnalysisResponse {
  success: boolean;
  data?: {
    qualityScore: number;
    improvements: any[];
    codeSmells: any[];
    documentation: any;
    metrics: any;
    analyzedAt: string;
    analysisId?: string;
  };
  isGuest?: boolean;
  remainingAnalyses?: number;
  languageDetection?: any;
  message?: string;
  languageMismatch?: boolean;
  detectedLanguage?: string;
  detectedLanguageName?: string;
}

export interface CorrectionsRequest {
  code: string;
  language: string;
  improvements: any[];
  codeSmells: any[];
  vulnerabilities: any[];
}

export interface CorrectionsResponse {
  success: boolean;
  correctedCode?: string;
  appliedFixes?: any[];
  summary?: string;
  message?: string;
}

function getConfig() {
  const cfg = vscode.workspace.getConfiguration('codeReview');
  return {
    backendUrl: (cfg.get<string>('backendUrl') || 'http://localhost:5000').replace(/\/$/, ''),
    authToken:  cfg.get<string>('authToken') || '',
  };
}

/**
 * Effectue une requête HTTP/HTTPS sans dépendance externe (axios non disponible dans WebView).
 */
function httpRequest(
  url: string,
  method: 'GET' | 'POST' | 'DELETE',
  body: object | null,
  headers: Record<string, string>
): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const bodyStr = body ? JSON.stringify(body) : '';
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr).toString(),
      ...headers,
    };

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: reqHeaders,
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Réponse non-JSON du serveur: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(90000, () => { req.destroy(new Error('Timeout (90s)')); });

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

function buildHeaders(authToken: string): Record<string, string> {
  const h: Record<string, string> = {};
  if (authToken) {
    h['Authorization'] = `Bearer ${authToken}`;
  }
  return h;
}

/**
 * POST /api/analyze
 * Envoie le code au backend et retourne les résultats d'analyse.
 */
export async function analyzeCode(request: AnalysisRequest): Promise<AnalysisResponse> {
  const { backendUrl, authToken } = getConfig();
  const url = `${backendUrl}/api/analyze`;

  try {
    const result = await httpRequest(url, 'POST', request, buildHeaders(authToken));
    return result as AnalysisResponse;
  } catch (error: any) {
    const msg = error.message || 'Erreur réseau inconnue';
    if (msg.includes('ECONNREFUSED')) {
      throw new Error(`Impossible de contacter le backend à ${backendUrl}. Vérifiez que votre serveur Express est démarré.`);
    }
    throw new Error(`Erreur API: ${msg}`);
  }
}

/**
 * POST /api/analyze/apply-corrections
 * Applique les corrections suggérées via DeepSeek.
 */
export async function applyCorrections(request: CorrectionsRequest): Promise<CorrectionsResponse> {
  const { backendUrl, authToken } = getConfig();
  const url = `${backendUrl}/api/analyze/apply-corrections`;

  try {
    const result = await httpRequest(url, 'POST', request, buildHeaders(authToken));
    return result as CorrectionsResponse;
  } catch (error: any) {
    throw new Error(`Erreur lors de l'application des corrections: ${error.message}`);
  }
}

/**
 * POST /api/analyze/document
 * Génère la documentation via DeepSeek.
 */
export async function documentCode(code: string, language: string): Promise<any> {
  const { backendUrl, authToken } = getConfig();
  const url = `${backendUrl}/api/analyze/document`;

  try {
    return await httpRequest(url, 'POST', { code, language }, buildHeaders(authToken));
  } catch (error: any) {
    throw new Error(`Erreur documentation: ${error.message}`);
  }
}

/**
 * GET /api/analyze/guest-status
 * Vérifie le nombre d'analyses restantes pour un invité.
 */
export async function getGuestStatus(): Promise<{ remaining: number; limit: number; currentCount: number }> {
  const { backendUrl, authToken } = getConfig();
  const url = `${backendUrl}/api/analyze/guest-status`;

  try {
    const result = await httpRequest(url, 'GET', null, buildHeaders(authToken));
    return result;
  } catch {
    return { remaining: 3, limit: 3, currentCount: 0 };
  }
}

/**
 * GET /api/analyze/programming-languages
 */
export async function getProgrammingLanguages(): Promise<{ code: string; name: string }[]> {
  const { backendUrl } = getConfig();
  const url = `${backendUrl}/api/analyze/programming-languages`;

  try {
    const result = await httpRequest(url, 'GET', null, {});
    return result.languages || [];
  } catch {
    // Retourne une liste de secours si le backend n'est pas disponible
    return [
      { code: 'javascript', name: 'JavaScript' },
      { code: 'typescript', name: 'TypeScript' },
      { code: 'python',     name: 'Python' },
      { code: 'java',       name: 'Java' },
      { code: 'php',        name: 'PHP' },
      { code: 'cpp',        name: 'C++' },
      { code: 'csharp',     name: 'C#' },
      { code: 'go',         name: 'Go' },
      { code: 'rust',       name: 'Rust' },
      { code: 'ruby',       name: 'Ruby' },
    ];
  }
}