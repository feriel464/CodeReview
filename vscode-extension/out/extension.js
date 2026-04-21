"use strict";
/**
 * extension.ts
 * Point d'entrée de l'extension VS Code.
 * Déclare les 3 commandes disponibles.
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const reviewPanel_1 = require("./reviewPanel");
const codeFilter_1 = require("./codeFilter");
function activate(context) {
    console.log('✅ Code Review Assistant activé');
    // ── Commande 1 : Ouvrir le panel (vide) ──────────────────
    const openPanel = vscode.commands.registerCommand('codeReview.openPanel', () => {
        reviewPanel_1.ReviewPanel.createOrShow(context.extensionUri);
    });
    // ── Commande 2 : Analyser la sélection courante ───────────
    const analyzeSelection = vscode.commands.registerCommand('codeReview.analyzeSelection', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Aucun fichier ouvert.');
            return;
        }
        const selection = editor.selection;
        const code = selection.isEmpty
            ? editor.document.getText() // tout le fichier si rien de sélectionné
            : editor.document.getText(selection); // seulement la sélection
        if (!code.trim()) {
            vscode.window.showWarningMessage('Le fichier est vide.');
            return;
        }
        const ext = editor.document.fileName.split('.').pop() || '';
        const lang = (0, codeFilter_1.extensionToLanguage)(ext);
        reviewPanel_1.ReviewPanel.createOrShow(context.extensionUri, code, lang);
    });
    // ── Commande 3 : Analyser le fichier entier ───────────────
    const analyzeFile = vscode.commands.registerCommand('codeReview.analyzeFile', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Aucun fichier ouvert.');
            return;
        }
        const code = editor.document.getText();
        if (!code.trim()) {
            vscode.window.showWarningMessage('Le fichier est vide.');
            return;
        }
        const ext = editor.document.fileName.split('.').pop() || '';
        const lang = (0, codeFilter_1.extensionToLanguage)(ext);
        reviewPanel_1.ReviewPanel.createOrShow(context.extensionUri, code, lang);
    });
    context.subscriptions.push(openPanel, analyzeSelection, analyzeFile);
}
function deactivate() {
    console.log('Code Review Assistant désactivé');
}
