/**
 * apiClient.ts
 * Couche d'accès HTTP vers le backend Express existant.
 *
 * ACCÈS ILLIMITÉ VS CODE — Système JWT automatique :
 *   1. Au premier lancement, l'extension s'enregistre sur le backend
 *      via POST /api/auth/vscode-register
 *   2. Le backend crée un compte automatique et retourne un JWT
 *   3. Ce JWT est stocké dans vscode.globalState (persiste entre sessions)
 *   4. Toutes les requêtes suivantes envoient ce JWT en Authorization header
 *   5. Le backend traite l'extension comme un utilisateur connecté → illimité
 */

import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';

// ─── Clé de stockage du JWT dans globalState ─────────────────
const JWT_STORAGE_KEY = 'codeReview.vscodeJwt';

// ─── Référence au contexte VS Code (injecté depuis extension.ts) ─
let _context: vscode.ExtensionContext | null = null;

/**
 * À appeler UNE SEULE FOIS dans extension.ts au démarrage.
 * Donne accès au globalState pour stocker/lire le JWT.
 */
export function setExtensionContext(ctx: vscode.ExtensionContext) {
  _context = ctx;
}

// ─────────────────────────────────────────────────────────────
//  GESTION DU JWT
// ─────────────────────────────────────────────────────────────

/** Lit le JWT stocké localement. Retourne null si absent. */
function getStoredJwt(): string | null {
  return _context?.globalState.get<string>(JWT_STORAGE_KEY) || null;
}

/** Sauvegarde le JWT dans le stockage persistant de VS Code. */
async function storeJwt(token: string): Promise<void> {
  await _context?.globalState.update(JWT_STORAGE_KEY, token);
}

/**
 * Enregistre l'extension sur le backend si pas encore fait.
 * Génère un UUID unique par installation et l'envoie au backend.
 * Le backend crée un compte automatique et retourne un JWT.
 * Appelé automatiquement au démarrage de l'extension.
 */
export async function ensureVSCodeJwt(): Promise<void> {
  const existing = getStoredJwt();
  if (existing) {
    console.log('✅ JWT VS Code déjà présent, pas de re-registration nécessaire');
    return;
  }

  const { backendUrl } = getConfig();
  const extensionId = generateInstallationId();

  console.log('🔑 Première utilisation — enregistrement de l\'extension VS Code...');

  try {
    const result = await httpRequest(
      `${backendUrl}/api/auth/vscode-register`,
      'POST',
      { extensionId },
      {}
    );

    if (result.success && result.token) {
      await storeJwt(result.token);
      console.log('✅ JWT VS Code obtenu et stocké avec succès');
    } else {
      console.error('❌ Échec enregistrement VS Code:', result.message);
    }
  } catch (err: any) {
    console.warn('⚠️ Enregistrement VS Code échoué (backend indisponible?):', err.message);
  }
}

/**
 * Génère un identifiant unique et stable pour cette installation VS Code.
 * vscode.env.machineId est unique par machine — parfait pour nous.
 */
function generateInstallationId(): string {
  const machineId = vscode.env.machineId || 'unknown';
  return `vscode-${machineId}`.substring(0, 80);
}

// ─────────────────────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────────────────────

function getConfig() {
  const cfg = vscode.workspace.getConfiguration('codeReview');
  return {
    backendUrl: (cfg.get<string>('backendUrl') || 'http://localhost:5000').replace(/\/$/, ''),
    authToken:  cfg.get<string>('authToken') || '',
  };
}

// ─────────────────────────────────────────────────────────────
//  CONSTRUCTION DES HEADERS
// ─────────────────────────────────────────────────────────────

/**
 * Priorité : 1) token manuel configuré par l'utilisateur
 *            2) JWT automatique de l'extension
 */
function buildHeaders(): Record<string, string> {
  const { authToken } = getConfig();
  const h: Record<string, string> = {};

  if (authToken) {
    h['Authorization'] = `Bearer ${authToken}`;
  } else {
    const jwt = getStoredJwt();
    if (jwt) {
      h['Authorization'] = `Bearer ${jwt}`;
    }
  }

  return h;
}

// ─────────────────────────────────────────────────────────────
//  HTTP CLIENT NATIF
// ─────────────────────────────────────────────────────────────

function httpRequest(
  url: string,
  method: 'GET' | 'POST' | 'DELETE',
  body: object | null,
  headers: Record<string, string>
): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib     = isHttps ? https : http;

    const bodyStr = body ? JSON.stringify(body) : '';
    const reqHeaders: Record<string, string> = {
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(bodyStr).toString(),
      ...headers,
    };

    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (isHttps ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method,
      headers:  reqHeaders,
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Réponse non-JSON: ${data.substring(0, 200)}`)); }
      });
    });

    req.on('error', reject);
    req.setTimeout(90000, () => { req.destroy(new Error('Timeout (90s)')); });
    if (bodyStr) { req.write(bodyStr); }
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────
//  INTERFACES
// ─────────────────────────────────────────────────────────────

export interface AnalysisRequest {
  code: string;
  language: string;
  fileName?: string;
}

export interface AnalysisResponse {
  success: boolean;
  data?: {
    qualityScore:    number;
    improvements:    any[];
    codeSmells:      any[];
    vulnerabilities: any[];   // ✅ AJOUTÉ — était absent, causait l'affichage "0 vulnérabilités"
    documentation:   any;
    metrics:         any;
    analyzedAt:      string;
    analysisId?:     string;
  };
  isGuest?:              boolean;
  remainingAnalyses?:    number;
  languageDetection?:    any;
  message?:              string;
  languageMismatch?:     boolean;
  detectedLanguage?:     string;
  detectedLanguageName?: string;
}

export interface CorrectionsRequest {
  code:            string;
  language:        string;
  improvements:    any[];
  codeSmells:      any[];
  vulnerabilities: any[];
}

export interface CorrectionsResponse {
  success:        boolean;
  correctedCode?: string;
  appliedFixes?:  any[];
  summary?:       string;
  message?:       string;
}

// ─────────────────────────────────────────────────────────────
//  FONCTIONS API
// ─────────────────────────────────────────────────────────────

/** POST /api/analyze — JWT envoyé automatiquement → illimité */
export async function analyzeCode(request: AnalysisRequest): Promise<AnalysisResponse> {
  const { backendUrl } = getConfig();
  try {
    return await httpRequest(`${backendUrl}/api/analyze`, 'POST', request, buildHeaders());
  } catch (error: any) {
    if (error.message?.includes('ECONNREFUSED')) {
      throw new Error(`Impossible de contacter le backend à ${backendUrl}. Vérifiez que votre serveur Express est démarré.`);
    }
    throw new Error(`Erreur API: ${error.message}`);
  }
}

/** POST /api/analyze/apply-corrections */
export async function applyCorrections(request: CorrectionsRequest): Promise<CorrectionsResponse> {
  const { backendUrl } = getConfig();
  try {
    return await httpRequest(`${backendUrl}/api/analyze/apply-corrections`, 'POST', request, buildHeaders());
  } catch (error: any) {
    throw new Error(`Erreur corrections: ${error.message}`);
  }
}

/** POST /api/analyze/document */
export async function documentCode(code: string, language: string): Promise<any> {
  const { backendUrl } = getConfig();
  try {
    return await httpRequest(`${backendUrl}/api/analyze/document`, 'POST', { code, language }, buildHeaders());
  } catch (error: any) {
    throw new Error(`Erreur documentation: ${error.message}`);
  }
}

/** GET /api/analyze/guest-status — avec JWT retourne illimité */
export async function getGuestStatus(): Promise<{ remaining: number | null; limit: number | null; currentCount: number }> {
  const { backendUrl } = getConfig();
  try {
    return await httpRequest(`${backendUrl}/api/analyze/guest-status`, 'GET', null, buildHeaders());
  } catch {
    return { remaining: null, limit: null, currentCount: 0 };
  }
}

/** GET /api/analyze/programming-languages */
export async function getProgrammingLanguages(): Promise<{ code: string; name: string }[]> {
  const { backendUrl } = getConfig();
  try {
    const result = await httpRequest(`${backendUrl}/api/analyze/programming-languages`, 'GET', null, {});
    return result.languages || [];
  } catch {
    return [
      { code: 'javascript', name: 'JavaScript' },
      { code: 'typescript', name: 'TypeScript' },
      { code: 'python',     name: 'Python'     },
      { code: 'java',       name: 'Java'       },
      { code: 'php',        name: 'PHP'        },
      { code: 'cpp',        name: 'C++'        },
      { code: 'csharp',     name: 'C#'         },
      { code: 'go',         name: 'Go'         },
      { code: 'rust',       name: 'Rust'       },
      { code: 'ruby',       name: 'Ruby'       },
    ];
  }
}

/** Indique si un JWT est disponible (pour debug) */
export function hasValidJwt(): boolean {
  return !!getStoredJwt();
}

/** Force un re-enregistrement si le JWT a expiré */
export async function resetAndReregister(): Promise<void> {
  await _context?.globalState.update(JWT_STORAGE_KEY, undefined);
  await ensureVSCodeJwt();
}