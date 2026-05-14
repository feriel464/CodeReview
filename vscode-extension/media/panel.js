/**
 * panel.js
 * Script côté WebView — tourne dans le navigateur intégré de VS Code.
 * Communique avec reviewPanel.ts via acquireVsCodeApi().
 */

(function () {
  'use strict';

  const vscode = acquireVsCodeApi();

  // ── Refs DOM ──────────────────────────────────────────────
  const codeInput        = document.getElementById('codeInput');
  const analyzeBtn       = document.getElementById('analyzeBtn');
  const clearBtn         = document.getElementById('clearBtn');
  const languageSelect   = document.getElementById('languageSelect');
  const lineCount        = document.getElementById('lineCount');
  const charCount        = document.getElementById('charCount');
  const detectedLang     = document.getElementById('detectedLang');
  const filterError      = document.getElementById('filterError');
  const filterErrorMsg   = document.getElementById('filterErrorMsg');
  const resultsArea      = document.getElementById('resultsArea');
  const loader           = document.getElementById('loader');
  const loaderMsg        = document.getElementById('loaderMsg');
  const snackbar         = document.getElementById('snackbar');
  const guestLabel       = document.getElementById('guestLabel');
  const scoreNumber      = document.getElementById('scoreNumber');
  const ringFill         = document.getElementById('ringFill');
  const scoreSummary     = document.getElementById('scoreSummary');
  const scoreStats       = document.getElementById('scoreStats');
  const improvBadge      = document.getElementById('improvBadge');
  const smellBadge       = document.getElementById('smellBadge');
  const vulnBadge        = document.getElementById('vulnBadge');
  const improvementsList = document.getElementById('improvementsList');
  const smellsList       = document.getElementById('smellsList');
  const vulnList         = document.getElementById('vulnList');
  const metricsList      = document.getElementById('metricsList');
  const docsList         = document.getElementById('docsList');
  const applyFixesBtn    = document.getElementById('applyFixesBtn');
  const generateDocsBtn  = document.getElementById('generateDocsBtn');
  const correctedSection = document.getElementById('correctedSection');
  const correctedSummary = document.getElementById('correctedSummary');
  const correctedCode    = document.getElementById('correctedCode');
  const appliedFixesList = document.getElementById('appliedFixesList');
  const copyCorrectedBtn = document.getElementById('copyCorrectedBtn');
  const applyToEditorBtn = document.getElementById('applyToEditorBtn');

  // ── Init ──────────────────────────────────────────────────
  vscode.postMessage({ type: 'getLanguages' });
  vscode.postMessage({ type: 'getGuestStatus' });

  // ── Compteur de lignes/chars ──────────────────────────────
  codeInput.addEventListener('input', () => {
    const code  = codeInput.value;
    const lines = code.split('\n').length;
    const chars = code.length;
    lineCount.textContent = `${lines} ligne${lines > 1 ? 's' : ''}`;
    charCount.textContent = `${chars} caractère${chars > 1 ? 's' : ''}`;

    // Masquer l'erreur filtre lors de la modification
    filterError.classList.add('hidden');
  });

  // ── Analyser ──────────────────────────────────────────────
  analyzeBtn.addEventListener('click', () => {
    const code     = codeInput.value.trim();
    const language = languageSelect.value;

    if (!code) {
      showFilterError('Veuillez coller du code source avant de lancer l\'analyse.');
      return;
    }

    filterError.classList.add('hidden');
    vscode.postMessage({ type: 'analyze', code, language });
  });

  // ── Effacer ───────────────────────────────────────────────
  clearBtn.addEventListener('click', () => {
    codeInput.value = '';
    lineCount.textContent   = '0 lignes';
    charCount.textContent   = '0 caractères';
    detectedLang.textContent = '';
    filterError.classList.add('hidden');
    resultsArea.classList.add('hidden');
    correctedSection.classList.add('hidden');
  });

  // ── Appliquer les corrections ─────────────────────────────
  applyFixesBtn.addEventListener('click', () => {
    vscode.postMessage({ type: 'applyCorrections' });
  });

  // ── Générer la documentation ──────────────────────────────
  generateDocsBtn.addEventListener('click', () => {
    vscode.postMessage({ type: 'generateDocs' });
  });

  // ── Copier le code corrigé ────────────────────────────────
  copyCorrectedBtn.addEventListener('click', () => {
    vscode.postMessage({ type: 'copyToClipboard', text: correctedCode.textContent });
  });

  // ── Appliquer dans l'éditeur ──────────────────────────────
  applyToEditorBtn.addEventListener('click', () => {
    vscode.postMessage({ type: 'replaceInEditor', code: correctedCode.textContent });
  });

  // ── Onglets ───────────────────────────────────────────────
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${target}`).classList.add('active');
    });
  });

  // ══════════ RÉCEPTION DES MESSAGES DE L'EXTENSION ══════════
  window.addEventListener('message', (event) => {
    const msg = event.data;

    switch (msg.type) {

      case 'languages':
        renderLanguages(msg.data);
        break;

      case 'guestStatus':
        renderGuestStatus(msg.data);
        break;

      case 'loading':
        showLoader(msg.message);
        break;

      case 'filterError':
        hideLoader();
        showFilterError(msg.message);
        break;

      case 'languageMismatch':
        hideLoader();
        showFilterError(msg.message);
        break;

      case 'analysisResult':
        hideLoader();
        renderAnalysisResult(msg.data, msg.remaining);
        break;

      case 'correctionsApplied':
        hideLoader();
        renderCorrectedCode(msg.correctedCode, msg.appliedFixes, msg.summary);
        break;

      case 'docsGenerated':
        hideLoader();
        if (msg.data && msg.data.functions) {
          renderDocumentation(msg.data.functions);
          // Switch to docs tab
          document.querySelector('[data-tab="documentation"]').click();
        }
        break;

      case 'error':
        hideLoader();
        showSnackbar(`❌ ${msg.message}`, 5000);
        break;

      case 'injectCode':
        codeInput.value = msg.code;
        if (msg.language) {
          const opt = [...languageSelect.options].find(o => o.value === msg.language);
          if (opt) { languageSelect.value = msg.language; }
        }
        codeInput.dispatchEvent(new Event('input'));
        break;
    }
  });

  // ── Rendu langages ────────────────────────────────────────
  function renderLanguages(languages) {
    languages.forEach(lang => {
      const opt   = document.createElement('option');
      opt.value   = lang.code;
      opt.textContent = lang.name;
      languageSelect.appendChild(opt);
    });
  }

  // ── Statut invité ─────────────────────────────────────────
function renderGuestStatus(data) {
    guestLabel.textContent = 'Connecté';
    document.querySelector('.dot').style.background = 'var(--green)';
  }

  // ── Affichage du résultat ─────────────────────────────────
  function renderAnalysisResult(data, remaining) {
    if (!data) { return; }

    resultsArea.classList.remove('hidden');
    correctedSection.classList.add('hidden');

    // Score
    const score = data.qualityScore || 0;
    animateScore(score);

    // Résumé
    scoreSummary.textContent = extractSummary(data);

    // Stats
    const improvements   = data.improvements   || [];
    const codeSmells     = data.codeSmells     || [];
    const vulnerabilities = data.vulnerabilities || [];
    scoreStats.innerHTML = `
      <span class="stat-item"><strong>${improvements.length}</strong> améliorations</span>
      <span class="stat-item"><strong>${codeSmells.length}</strong> code smells</span>
      <span class="stat-item"><strong style="color:var(--red)">${vulnerabilities.length}</strong> vulnérabilités</span>
    `;

    // Badges
    improvBadge.textContent = improvements.length;
    smellBadge.textContent  = codeSmells.length;
    vulnBadge.textContent   = vulnerabilities.length;

    // Listes
    renderIssueList(improvementsList, improvements, 'improvement');
    renderIssueList(smellsList, codeSmells, 'smell');
    renderVulnerabilities(vulnList, vulnerabilities);
    renderMetrics(metricsList, data.metrics);

    // Documentation déjà disponible ?
    if (data.documentation && data.documentation.functions && data.documentation.functions.length) {
      renderDocumentation(data.documentation.functions);
    }

    // Mise à jour statut invité
    if (remaining !== undefined) {
      guestLabel.textContent = `${remaining} analyse${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`;
    }

    // Scroll vers les résultats
    resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function extractSummary(data) {
    if (data.summary && data.summary.length > 5) { return data.summary; }
    const score = data.qualityScore || 0;
    if (score >= 90) { return 'Code de très haute qualité. Quelques améliorations mineures possibles.'; }
    if (score >= 75) { return 'Bon code avec quelques points à améliorer.'; }
    if (score >= 55) { return 'Code fonctionnel mais avec des améliorations notables à apporter.'; }
    if (score >= 35) { return 'Code avec plusieurs problèmes importants à corriger.'; }
    return 'Code avec de nombreuses erreurs critiques. Corrections nécessaires.';
  }

  // ── Animation du score ────────────────────────────────────
  function animateScore(score) {
    const circumference = 2 * Math.PI * 50; // r=50
    const offset = circumference - (score / 100) * circumference;

    scoreNumber.textContent = score;
    ringFill.style.strokeDashoffset = offset;

    // Couleur selon score
    let color = 'var(--red)';
    if (score >= 80) { color = 'var(--green)'; }
    else if (score >= 60) { color = 'var(--yellow)'; }
    else if (score >= 40) { color = 'var(--yellow)'; }
    ringFill.style.stroke = color;
    scoreNumber.style.color = color;
  }

  // ── Rendu liste d'issues ──────────────────────────────────
  function renderIssueList(container, items, type) {
    container.innerHTML = '';

    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          Aucun problème détecté dans cette catégorie.
        </div>`;
      return;
    }

    items.forEach(item => {
      const sev = (item.severity || 'info').toLowerCase();
      const div = document.createElement('div');
      div.className = `issue-item severity-${sev}`;
      div.innerHTML = `
        <div class="issue-header">
          <span class="issue-severity sev-${sev}">${sev}</span>
          ${item.line ? `<span class="issue-line">Ligne ${item.line}</span>` : ''}
        </div>
        <div class="issue-message">${escHtml(item.message || '')}</div>
        ${item.suggestion ? `<div class="issue-suggestion">💡 ${escHtml(item.suggestion)}</div>` : ''}
        ${item.variable   ? `<div class="issue-suggestion">📌 Règle: ${escHtml(item.variable)}</div>` : ''}
      `;
      container.appendChild(div);
    });
  }

  // ── Rendu vulnérabilités ──────────────────────────────────
  function renderVulnerabilities(container, items) {
    container.innerHTML = '';

    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🛡️</div>
          Aucune vulnérabilité de sécurité détectée.
        </div>`;
      return;
    }

    items.forEach(vuln => {
      const div = document.createElement('div');
      div.className = 'vuln-item';

      const linesHtml = (vuln.lines || []).map(l =>
        `<div class="issue-suggestion">Ligne ${l.line}: <code>${escHtml(l.code || '')}</code>${l.explanation ? ` — ${escHtml(l.explanation)}` : ''}</div>`
      ).join('');

      div.innerHTML = `
        <div class="vuln-header">
          <span class="issue-severity sev-${(vuln.severity || 'high').toLowerCase()}">${vuln.severity || 'HIGH'}</span>
          <span class="vuln-title">${escHtml(vuln.title || '')}</span>
          ${vuln.cwe ? `<span class="vuln-cwe">${escHtml(vuln.cwe)}</span>` : ''}
        </div>
        <div class="vuln-body">${escHtml(vuln.description || '')}</div>
        ${linesHtml}
        ${vuln.fix ? `<div class="vuln-fix">🔧 ${escHtml(vuln.fix)}</div>` : ''}
      `;
      container.appendChild(div);
    });
  }

  // ── Rendu métriques ───────────────────────────────────────
  function renderMetrics(container, metrics) {
    container.innerHTML = '';
    if (!metrics) { return; }

    const items = [
      { label: 'Lignes totales',   value: metrics.totalLines   || 0 },
      { label: 'Lignes de code',   value: metrics.codeLines    || metrics.totalLines || 0 },
      { label: 'Fonctions',        value: metrics.functions    || 0 },
      { label: 'Classes',          value: metrics.classes      || 0 },
      { label: 'Complexité',       value: metrics.complexity   || 'N/A' },
      { label: 'Ratio commentaires', value: (metrics.commentRatio || 0) + '%' },
      { label: 'Docstrings',       value: metrics.docstrings   || 0 },
      { label: 'Lignes vides',     value: metrics.emptyLines   || 0 },
    ];

    items.forEach(({ label, value }) => {
      const card = document.createElement('div');
      card.className = 'metric-card';
      card.innerHTML = `
        <div class="metric-value">${value}</div>
        <div class="metric-label">${label}</div>
      `;
      container.appendChild(card);
    });
  }

  // ── Rendu documentation ───────────────────────────────────
  function renderDocumentation(functions) {
    docsList.innerHTML = '';

    if (!functions || functions.length === 0) {
      docsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📄</div>
          Aucune fonction documentée trouvée. Cliquez sur "Générer la documentation" pour en créer une.
        </div>`;
      return;
    }

    functions.forEach(fn => {
      const card = document.createElement('div');
      card.className = 'doc-card';

      const paramsHtml = (fn.params || []).map(p =>
        `<div class="doc-param-item">→ <strong>${escHtml(p.name)}</strong> (${escHtml(p.type || 'any')}): ${escHtml(p.description || '')}</div>`
      ).join('');

      card.innerHTML = `
        <div class="doc-name">${escHtml(fn.name || 'unknown')}</div>
        <div class="doc-type">${escHtml(fn.type || 'function')}</div>
        <div class="doc-desc">${escHtml(fn.description || '')}</div>
        ${paramsHtml ? `<div class="doc-params"><strong style="font-size:11px;color:var(--text3)">PARAMÈTRES</strong>${paramsHtml}</div>` : ''}
        ${fn.returns ? `<div class="doc-returns">↩ ${escHtml(fn.returns)}</div>` : ''}
        ${fn.example ? `<div class="doc-example">${escHtml(fn.example)}</div>` : ''}
      `;
      docsList.appendChild(card);
    });
  }

  // ── Code corrigé ─────────────────────────────────────────
  function renderCorrectedCode(code, fixes, summary) {
    correctedCode.textContent = code || '';
    correctedSummary.textContent = summary || '';

    appliedFixesList.innerHTML = '';
    (fixes || []).slice(0, 20).forEach(fix => {
      const div = document.createElement('div');
      div.className = 'fix-item';
      div.innerHTML = `
        <code>Ligne ${fix.line}: ${escHtml((fix.original || '').substring(0, 60))} → ${escHtml((fix.fixed || '').substring(0, 60))}</code>
        <div class="fix-reason">${escHtml(fix.reason || '')}</div>
      `;
      appliedFixesList.appendChild(div);
    });

    correctedSection.classList.remove('hidden');
    correctedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Loader ────────────────────────────────────────────────
  function showLoader(msg) {
    loaderMsg.textContent = msg || 'Chargement...';
    loader.classList.remove('hidden');
    analyzeBtn.disabled = true;
  }

  function hideLoader() {
    loader.classList.add('hidden');
    analyzeBtn.disabled = false;
  }

  // ── Filtre error ──────────────────────────────────────────
  function showFilterError(msg) {
    filterErrorMsg.textContent = msg;
    filterError.classList.remove('hidden');
  }

  // ── Snackbar ──────────────────────────────────────────────
  function showSnackbar(msg, duration = 3000) {
    snackbar.textContent = msg;
    snackbar.classList.remove('hidden');
    setTimeout(() => snackbar.classList.add('hidden'), duration);
  }

  // ── Escape HTML ───────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();