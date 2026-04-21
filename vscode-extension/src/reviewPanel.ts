/**
 * reviewPanel.ts
 * Panel WebView principal — orchestre l'affichage, la communication,
 * et les appels API depuis l'extension VS Code.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { filterCode, extensionToLanguage } from './codeFilter';
import * as api from './apiClient';

export class ReviewPanel {
  public static currentPanel: ReviewPanel | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  // État courant
  private _currentCode    = '';
  private _currentLanguage = '';
  private _currentAnalysis: any = null;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel       = panel;
    this._extensionUri = extensionUri;

    this._panel.webview.html = this._getHtmlContent();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Écoute les messages envoyés depuis la WebView (panel.js)
    this._panel.webview.onDidReceiveMessage(
      (message) => this._handleWebViewMessage(message),
      null,
      this._disposables
    );
  }

  // ── Factory ───────────────────────────────────────────────
  public static createOrShow(extensionUri: vscode.Uri, initialCode?: string, initialLang?: string) {
    const column = vscode.ViewColumn.Beside;

    if (ReviewPanel.currentPanel) {
      ReviewPanel.currentPanel._panel.reveal(column);
      if (initialCode) {
        ReviewPanel.currentPanel._injectCode(initialCode, initialLang);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'codeReview',
      '🔍 Code Review Assistant',
      column,
      {
        enableScripts:         true,
        retainContextWhenHidden: true,
        localResourceRoots:    [vscode.Uri.joinPath(extensionUri, 'media')],
      }
    );

    ReviewPanel.currentPanel = new ReviewPanel(panel, extensionUri);

    if (initialCode) {
      setTimeout(() => ReviewPanel.currentPanel?._injectCode(initialCode, initialLang), 500);
    }
  }

  // ── Injection de code depuis l'éditeur ────────────────────
  private _injectCode(code: string, lang?: string) {
    this._panel.webview.postMessage({
      type:     'injectCode',
      code,
      language: lang || '',
    });
  }

  public injectCodeFromEditor(code: string, lang?: string) {
    this._injectCode(code, lang);
  }

  // ── Gestion des messages WebView → Extension ──────────────
  private async _handleWebViewMessage(message: any) {
    switch (message.type) {

      // L'utilisateur clique sur "Analyser"
      case 'analyze': {
        const { code, language } = message;

        // 1. Filtre strict : code uniquement
        const filter = filterCode(code);
        if (!filter.isCode) {
          this._sendToWebView({
            type:    'filterError',
            message: filter.reason,
          });
          return;
        }

        this._currentCode     = code;
        this._currentLanguage = language || filter.detectedLanguage || 'javascript';

        // 2. Envoyer état "chargement"
        this._sendToWebView({ type: 'loading', message: 'Analyse en cours...' });

        // 3. Appel API
        try {
          const result = await api.analyzeCode({
            code:     this._currentCode,
            language: this._currentLanguage,
            fileName: `vscode_analysis.${this._currentLanguage}`,
          });

          if (!result.success) {
            // Mismatch de langage
            if (result.languageMismatch) {
              this._sendToWebView({
                type:                'languageMismatch',
                message:             result.message,
                detectedLanguage:    result.detectedLanguage,
                detectedLanguageName: result.detectedLanguageName,
              });
              return;
            }
            throw new Error(result.message || 'Erreur inconnue');
          }

          this._currentAnalysis = result.data;
          this._sendToWebView({
            type:     'analysisResult',
            data:     result.data,
            isGuest:  result.isGuest,
            remaining: result.remainingAnalyses,
          });

        } catch (err: any) {
          this._sendToWebView({ type: 'error', message: err.message });
        }
        break;
      }

      // L'utilisateur clique sur "Appliquer les corrections"
      case 'applyCorrections': {
        if (!this._currentCode || !this._currentAnalysis) {
          return;
        }

        this._sendToWebView({ type: 'loading', message: 'Application des corrections via DeepSeek...' });

        try {
          const result = await api.applyCorrections({
            code:           this._currentCode,
            language:       this._currentLanguage,
            improvements:   this._currentAnalysis.improvements   || [],
            codeSmells:     this._currentAnalysis.codeSmells     || [],
            vulnerabilities: this._currentAnalysis.vulnerabilities || [],
          });

          if (!result.success) {
            throw new Error(result.message || 'Correction échouée');
          }

          this._sendToWebView({
            type:          'correctionsApplied',
            correctedCode:  result.correctedCode,
            appliedFixes:   result.appliedFixes,
            summary:        result.summary,
          });

        } catch (err: any) {
          this._sendToWebView({ type: 'error', message: err.message });
        }
        break;
      }

      // L'utilisateur clique sur "Générer la documentation"
      case 'generateDocs': {
        if (!this._currentCode) { return; }

        this._sendToWebView({ type: 'loading', message: 'Génération de la documentation...' });

        try {
          const result = await api.documentCode(this._currentCode, this._currentLanguage);
          this._sendToWebView({ type: 'docsGenerated', data: result });
        } catch (err: any) {
          this._sendToWebView({ type: 'error', message: err.message });
        }
        break;
      }

      // L'utilisateur veut coller le code corrigé dans l'éditeur actif
      case 'replaceInEditor': {
        const { code } = message;
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showWarningMessage('Aucun éditeur actif. Ouvrez un fichier d\'abord.');
          return;
        }
        await editor.edit(editBuilder => {
          const fullRange = new vscode.Range(
            editor.document.positionAt(0),
            editor.document.positionAt(editor.document.getText().length)
          );
          editBuilder.replace(fullRange, code);
        });
        vscode.window.showInformationMessage('✅ Code corrigé appliqué dans l\'éditeur !');
        break;
      }

      // Charger les langages depuis le backend
      case 'getLanguages': {
        const languages = await api.getProgrammingLanguages();
        this._sendToWebView({ type: 'languages', data: languages });
        break;
      }

      // Statut invité
      case 'getGuestStatus': {
        const status = await api.getGuestStatus();
        this._sendToWebView({ type: 'guestStatus', data: status });
        break;
      }

      // Copier dans le presse-papiers
      case 'copyToClipboard': {
        await vscode.env.clipboard.writeText(message.text);
        vscode.window.showInformationMessage('Copié dans le presse-papiers !');
        break;
      }
    }
  }

  private _sendToWebView(message: object) {
    this._panel.webview.postMessage(message);
  }

  // ── Génération du HTML ────────────────────────────────────
  private _getHtmlContent(): string {
    const webview = this._panel.webview;

    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'panel.css')
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'panel.js')
    );

    // Nonce pour la CSP
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             style-src ${webview.cspSource} 'unsafe-inline';
             script-src 'nonce-${nonce}';
             font-src ${webview.cspSource} https://fonts.gstatic.com;
             connect-src https://fonts.googleapis.com;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${cssUri}" />
  <title>Code Review Assistant</title>
</head>
<body>

<!-- ══════════════ HEADER ══════════════ -->
<div class="header">
  <div class="header-left">
    <span class="logo">⬡</span>
    <div>
      <div class="header-title">Code Review Assistant</div>
      <div class="header-sub">Analyse IA · DeepSeek · Sécurité</div>
    </div>
  </div>
  <div class="guest-badge" id="guestBadge">
    <span class="dot"></span>
    <span id="guestLabel">Chargement...</span>
  </div>
</div>

<!-- ══════════════ ZONE DE SAISIE ══════════════ -->
<div class="input-section">
  <div class="input-toolbar">
    <div class="lang-select-wrap">
      <select id="languageSelect">
        <option value="">⚡ Détection automatique</option>
      </select>
    </div>
    <div class="input-actions">
      <button class="btn-secondary" id="clearBtn" title="Effacer le code">✕ Effacer</button>
      <button class="btn-primary" id="analyzeBtn">
        <span class="btn-icon">▶</span> Analyser
      </button>
    </div>
  </div>

  <div id="filterError" class="filter-error hidden">
    <span class="filter-icon">⚠</span>
    <span id="filterErrorMsg"></span>
  </div>

  <div class="editor-wrap">
    <textarea
      id="codeInput"
      class="code-input"
      placeholder="Collez votre code source ici...&#10;&#10;Langages supportés : JavaScript, TypeScript, Python, Java, PHP, C++, C#, Go, Rust, Ruby&#10;&#10;Seul du code source est accepté."
      spellcheck="false"
    ></textarea>
    <div class="editor-footer">
      <span id="lineCount">0 lignes</span>
      <span id="charCount">0 caractères</span>
      <span id="detectedLang" class="detected-lang"></span>
    </div>
  </div>
</div>

<!-- ══════════════ ZONE DE RÉSULTATS ══════════════ -->
<div id="resultsArea" class="results-area hidden">

  <!-- Score principal -->
  <div class="score-card" id="scoreCard">
    <div class="score-ring-wrap">
      <svg class="score-ring" viewBox="0 0 120 120">
        <circle class="ring-bg" cx="60" cy="60" r="50"/>
        <circle class="ring-fill" id="ringFill" cx="60" cy="60" r="50"
          stroke-dasharray="314" stroke-dashoffset="314"/>
      </svg>
      <div class="score-center">
        <div class="score-number" id="scoreNumber">--</div>
        <div class="score-label">/100</div>
      </div>
    </div>
    <div class="score-meta">
      <div class="score-summary" id="scoreSummary">Analyse en cours...</div>
      <div class="score-stats" id="scoreStats"></div>
      <div class="score-actions">
        <button class="btn-action" id="applyFixesBtn">
          <span>⚡</span> Appliquer les corrections
        </button>
        <button class="btn-action btn-action-outline" id="generateDocsBtn">
          <span>📄</span> Générer la documentation
        </button>
      </div>
    </div>
  </div>

  <!-- Onglets -->
  <div class="tabs">
    <button class="tab active" data-tab="improvements">Améliorations <span class="badge" id="improvBadge">0</span></button>
    <button class="tab" data-tab="smells">Code Smells <span class="badge" id="smellBadge">0</span></button>
    <button class="tab" data-tab="vulnerabilities">Sécurité <span class="badge badge-red" id="vulnBadge">0</span></button>
    <button class="tab" data-tab="metrics">Métriques</button>
    <button class="tab" data-tab="documentation">Documentation</button>
  </div>

  <!-- Contenu des onglets -->
  <div class="tab-content active" id="tab-improvements">
    <div id="improvementsList" class="issue-list"></div>
  </div>
  <div class="tab-content" id="tab-smells">
    <div id="smellsList" class="issue-list"></div>
  </div>
  <div class="tab-content" id="tab-vulnerabilities">
    <div id="vulnList" class="issue-list"></div>
  </div>
  <div class="tab-content" id="tab-metrics">
    <div id="metricsList" class="metrics-grid"></div>
  </div>
  <div class="tab-content" id="tab-documentation">
    <div id="docsList" class="docs-list"></div>
  </div>

</div>

<!-- ══════════════ CODE CORRIGÉ ══════════════ -->
<div id="correctedSection" class="corrected-section hidden">
  <div class="corrected-header">
    <span>✅ Code corrigé</span>
    <div class="corrected-actions">
      <button class="btn-secondary" id="copyCorrectedBtn">📋 Copier</button>
      <button class="btn-primary" id="applyToEditorBtn">→ Appliquer dans l'éditeur</button>
    </div>
  </div>
  <div class="corrected-summary" id="correctedSummary"></div>
  <pre class="corrected-code" id="correctedCode"></pre>
  <div class="applied-fixes" id="appliedFixesList"></div>
</div>

<!-- ══════════════ LOADER ══════════════ -->
<div id="loader" class="loader hidden">
  <div class="loader-ring"></div>
  <div class="loader-msg" id="loaderMsg">Analyse en cours...</div>
</div>

<!-- ══════════════ SNACKBAR ══════════════ -->
<div id="snackbar" class="snackbar hidden"></div>

<script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
  }

  public dispose() {
    ReviewPanel.currentPanel = undefined;
    this._panel.dispose();
    this._disposables.forEach(d => d.dispose());
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}