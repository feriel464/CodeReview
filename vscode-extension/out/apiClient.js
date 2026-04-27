"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setExtensionContext = setExtensionContext;
exports.ensureVSCodeJwt = ensureVSCodeJwt;
exports.analyzeCode = analyzeCode;
exports.applyCorrections = applyCorrections;
exports.documentCode = documentCode;
exports.getGuestStatus = getGuestStatus;
exports.getProgrammingLanguages = getProgrammingLanguages;
exports.hasValidJwt = hasValidJwt;
exports.resetAndReregister = resetAndReregister;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
// ─── Clé de stockage du JWT dans globalState ─────────────────
const JWT_STORAGE_KEY = 'codeReview.vscodeJwt';
// ─── Référence au contexte VS Code (injecté depuis extension.ts) ─
let _context = null;
/**
 * À appeler UNE SEULE FOIS dans extension.ts au démarrage.
 * Donne accès au globalState pour stocker/lire le JWT.
 */
function setExtensionContext(ctx) {
    _context = ctx;
}
// ─────────────────────────────────────────────────────────────
//  GESTION DU JWT
// ─────────────────────────────────────────────────────────────
/** Lit le JWT stocké localement. Retourne null si absent. */
function getStoredJwt() {
    return _context?.globalState.get(JWT_STORAGE_KEY) || null;
}
/** Sauvegarde le JWT dans le stockage persistant de VS Code. */
async function storeJwt(token) {
    await _context?.globalState.update(JWT_STORAGE_KEY, token);
}
/**
 * Enregistre l'extension sur le backend si pas encore fait.
 * Génère un UUID unique par installation et l'envoie au backend.
 * Le backend crée un compte automatique et retourne un JWT.
 * Appelé automatiquement au démarrage de l'extension.
 */
async function ensureVSCodeJwt() {
    const existing = getStoredJwt();
    if (existing) {
        console.log('✅ JWT VS Code déjà présent, pas de re-registration nécessaire');
        return;
    }
    const { backendUrl } = getConfig();
    const extensionId = generateInstallationId();
    console.log('🔑 Première utilisation — enregistrement de l\'extension VS Code...');
    try {
        const result = await httpRequest(`${backendUrl}/api/auth/vscode-register`, 'POST', { extensionId }, {});
        if (result.success && result.token) {
            await storeJwt(result.token);
            console.log('✅ JWT VS Code obtenu et stocké avec succès');
        }
        else {
            console.error('❌ Échec enregistrement VS Code:', result.message);
        }
    }
    catch (err) {
        console.warn('⚠️ Enregistrement VS Code échoué (backend indisponible?):', err.message);
    }
}
/**
 * Génère un identifiant unique et stable pour cette installation VS Code.
 * vscode.env.machineId est unique par machine — parfait pour nous.
 */
function generateInstallationId() {
    const machineId = vscode.env.machineId || 'unknown';
    return `vscode-${machineId}`.substring(0, 80);
}
// ─────────────────────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────────────────────
function getConfig() {
    const cfg = vscode.workspace.getConfiguration('codeReview');
    return {
        backendUrl: (cfg.get('backendUrl') || 'http://localhost:5000').replace(/\/$/, ''),
        authToken: cfg.get('authToken') || '',
    };
}
// ─────────────────────────────────────────────────────────────
//  CONSTRUCTION DES HEADERS
// ─────────────────────────────────────────────────────────────
/**
 * Priorité : 1) token manuel configuré par l'utilisateur
 *            2) JWT automatique de l'extension
 */
function buildHeaders() {
    const { authToken } = getConfig();
    const h = {};
    if (authToken) {
        h['Authorization'] = `Bearer ${authToken}`;
    }
    else {
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
function httpRequest(url, method, body, headers) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const isHttps = parsed.protocol === 'https:';
        const lib = isHttps ? https : http;
        const bodyStr = body ? JSON.stringify(body) : '';
        const reqHeaders = {
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
                }
                catch {
                    reject(new Error(`Réponse non-JSON: ${data.substring(0, 200)}`));
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
// ─────────────────────────────────────────────────────────────
//  FONCTIONS API
// ─────────────────────────────────────────────────────────────
/** POST /api/analyze — JWT envoyé automatiquement → illimité */
async function analyzeCode(request) {
    const { backendUrl } = getConfig();
    try {
        return await httpRequest(`${backendUrl}/api/analyze`, 'POST', request, buildHeaders());
    }
    catch (error) {
        if (error.message?.includes('ECONNREFUSED')) {
            throw new Error(`Impossible de contacter le backend à ${backendUrl}. Vérifiez que votre serveur Express est démarré.`);
        }
        throw new Error(`Erreur API: ${error.message}`);
    }
}
/** POST /api/analyze/apply-corrections */
async function applyCorrections(request) {
    const { backendUrl } = getConfig();
    try {
        return await httpRequest(`${backendUrl}/api/analyze/apply-corrections`, 'POST', request, buildHeaders());
    }
    catch (error) {
        throw new Error(`Erreur corrections: ${error.message}`);
    }
}
/** POST /api/analyze/document */
async function documentCode(code, language) {
    const { backendUrl } = getConfig();
    try {
        return await httpRequest(`${backendUrl}/api/analyze/document`, 'POST', { code, language }, buildHeaders());
    }
    catch (error) {
        throw new Error(`Erreur documentation: ${error.message}`);
    }
}
/** GET /api/analyze/guest-status — avec JWT retourne illimité */
async function getGuestStatus() {
    const { backendUrl } = getConfig();
    try {
        return await httpRequest(`${backendUrl}/api/analyze/guest-status`, 'GET', null, buildHeaders());
    }
    catch {
        return { remaining: null, limit: null, currentCount: 0 };
    }
}
/** GET /api/analyze/programming-languages */
async function getProgrammingLanguages() {
    const { backendUrl } = getConfig();
    try {
        const result = await httpRequest(`${backendUrl}/api/analyze/programming-languages`, 'GET', null, {});
        return result.languages || [];
    }
    catch {
        return [
            { code: 'javascript', name: 'JavaScript' },
            { code: 'typescript', name: 'TypeScript' },
            { code: 'python', name: 'Python' },
            { code: 'java', name: 'Java' },
            { code: 'php', name: 'PHP' },
            { code: 'cpp', name: 'C++' },
            { code: 'csharp', name: 'C#' },
            { code: 'go', name: 'Go' },
            { code: 'rust', name: 'Rust' },
            { code: 'ruby', name: 'Ruby' },
        ];
    }
}
/** Indique si un JWT est disponible (pour debug) */
function hasValidJwt() {
    return !!getStoredJwt();
}
/** Force un re-enregistrement si le JWT a expiré */
async function resetAndReregister() {
    await _context?.globalState.update(JWT_STORAGE_KEY, undefined);
    await ensureVSCodeJwt();
}
