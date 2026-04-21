"use strict";
/**
 * apiClient.ts
 * Couche d'accès HTTP vers le backend Express existant.
 * Réutilise exactement les routes définies dans analysisRoutes.js.
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
exports.analyzeCode = analyzeCode;
exports.applyCorrections = applyCorrections;
exports.documentCode = documentCode;
exports.getGuestStatus = getGuestStatus;
exports.getProgrammingLanguages = getProgrammingLanguages;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
function getConfig() {
    const cfg = vscode.workspace.getConfiguration('codeReview');
    return {
        backendUrl: (cfg.get('backendUrl') || 'http://localhost:5000').replace(/\/$/, ''),
        authToken: cfg.get('authToken') || '',
    };
}
/**
 * Effectue une requête HTTP/HTTPS sans dépendance externe (axios non disponible dans WebView).
 */
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
function buildHeaders(authToken) {
    const h = {};
    if (authToken) {
        h['Authorization'] = `Bearer ${authToken}`;
    }
    return h;
}
/**
 * POST /api/analyze
 * Envoie le code au backend et retourne les résultats d'analyse.
 */
async function analyzeCode(request) {
    const { backendUrl, authToken } = getConfig();
    const url = `${backendUrl}/api/analyze`;
    try {
        const result = await httpRequest(url, 'POST', request, buildHeaders(authToken));
        return result;
    }
    catch (error) {
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
async function applyCorrections(request) {
    const { backendUrl, authToken } = getConfig();
    const url = `${backendUrl}/api/analyze/apply-corrections`;
    try {
        const result = await httpRequest(url, 'POST', request, buildHeaders(authToken));
        return result;
    }
    catch (error) {
        throw new Error(`Erreur lors de l'application des corrections: ${error.message}`);
    }
}
/**
 * POST /api/analyze/document
 * Génère la documentation via DeepSeek.
 */
async function documentCode(code, language) {
    const { backendUrl, authToken } = getConfig();
    const url = `${backendUrl}/api/analyze/document`;
    try {
        return await httpRequest(url, 'POST', { code, language }, buildHeaders(authToken));
    }
    catch (error) {
        throw new Error(`Erreur documentation: ${error.message}`);
    }
}
/**
 * GET /api/analyze/guest-status
 * Vérifie le nombre d'analyses restantes pour un invité.
 */
async function getGuestStatus() {
    const { backendUrl, authToken } = getConfig();
    const url = `${backendUrl}/api/analyze/guest-status`;
    try {
        const result = await httpRequest(url, 'GET', null, buildHeaders(authToken));
        return result;
    }
    catch {
        return { remaining: 3, limit: 3, currentCount: 0 };
    }
}
/**
 * GET /api/analyze/programming-languages
 */
async function getProgrammingLanguages() {
    const { backendUrl } = getConfig();
    const url = `${backendUrl}/api/analyze/programming-languages`;
    try {
        const result = await httpRequest(url, 'GET', null, {});
        return result.languages || [];
    }
    catch {
        // Retourne une liste de secours si le backend n'est pas disponible
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
