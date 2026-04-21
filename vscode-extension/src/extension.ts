/**
 * extension.ts
 * Point d'entrée de l'extension VS Code.
 * Déclare les 3 commandes disponibles.
 */

import * as vscode from 'vscode';
import { ReviewPanel } from './reviewPanel';
import { extensionToLanguage } from './codeFilter';

export function activate(context: vscode.ExtensionContext) {
  console.log('✅ Code Review Assistant activé');

  // ── Commande 1 : Ouvrir le panel (vide) ──────────────────
  const openPanel = vscode.commands.registerCommand('codeReview.openPanel', () => {
    ReviewPanel.createOrShow(context.extensionUri);
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
      ? editor.document.getText()          // tout le fichier si rien de sélectionné
      : editor.document.getText(selection); // seulement la sélection

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

  context.subscriptions.push(openPanel, analyzeSelection, analyzeFile);
}

export function deactivate() {
  console.log('Code Review Assistant désactivé');
}