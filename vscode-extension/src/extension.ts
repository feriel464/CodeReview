/**
 * extension.ts
 * Point d'entrée de l'extension VS Code.
 *
 * NOUVEAUTÉ JWT :
 * Au démarrage, on appelle ensureVSCodeJwt() qui vérifie si un JWT
 * est déjà stocké. Si non → enregistrement automatique sur le backend.
 * Tout ça se fait en arrière-plan, invisible pour l'utilisateur.
 */

import * as vscode from 'vscode';
import { ReviewPanel } from './reviewPanel';
import { extensionToLanguage } from './codeFilter';
import { setExtensionContext, ensureVSCodeJwt, resetAndReregister } from './apiClient';

export function activate(context: vscode.ExtensionContext) {
  console.log('✅ Code Review Assistant activé');

  // ── Étape 1 : Donner accès au globalState à apiClient ────
  // Sans ça, apiClient ne peut pas stocker/lire le JWT
  setExtensionContext(context);

  // ── Étape 2 : Enregistrement JWT en arrière-plan ─────────
  // Ne bloque pas le démarrage — se fait silencieusement
  ensureVSCodeJwt().catch(err => {
    console.warn('⚠️ JWT auto-registration échoué au démarrage:', err.message);
  });

  // ── Commande 1 : Ouvrir le panel (vide) ──────────────────
  const openPanel = vscode.commands.registerCommand('codeReview.openPanel', () => {
    ReviewPanel.createOrShow(context.extensionUri);
  });

  // ── Commande 2 : Analyser la sélection ───────────────────
  const analyzeSelection = vscode.commands.registerCommand('codeReview.analyzeSelection', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('Aucun fichier ouvert.');
      return;
    }

    const selection = editor.selection;
    const code = selection.isEmpty
      ? editor.document.getText()
      : editor.document.getText(selection);

    if (!code.trim()) {
      vscode.window.showWarningMessage('Le fichier est vide.');
      return;
    }

    const ext  = editor.document.fileName.split('.').pop() || '';
    const lang = extensionToLanguage(ext);
    ReviewPanel.createOrShow(context.extensionUri, code, lang);
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

    const ext  = editor.document.fileName.split('.').pop() || '';
    const lang = extensionToLanguage(ext);
    ReviewPanel.createOrShow(context.extensionUri, code, lang);
  });

  // ── Commande 4 : Re-enregistrer (si JWT expiré) ───────────
  // Accessible via Ctrl+Shift+P → "Code Review: Réinitialiser la session"
  const resetSession = vscode.commands.registerCommand('codeReview.resetSession', async () => {
    await resetAndReregister();
    vscode.window.showInformationMessage('✅ Session VS Code réinitialisée avec succès.');
  });

  context.subscriptions.push(openPanel, analyzeSelection, analyzeFile, resetSession);
}

export function deactivate() {
  console.log('Code Review Assistant désactivé');
}