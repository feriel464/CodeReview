import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, Eye, Trash2, Download, Clock, Code, FileCode,
  CheckCircle, GitBranch, Activity, Zap, ArrowUp, ArrowDown,
  X, Bug, AlertCircle, FileText, Shield, ChevronLeft, ChevronRight,
  Loader2
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

// ── Couleurs langages ────────────────────────────────────────
const getLangColor = (lang) => {
  const map = {
    Python:     'bg-blue-100 text-blue-700',
    JavaScript: 'bg-yellow-100 text-yellow-700',
    TypeScript: 'bg-cyan-100 text-cyan-700',
    Go:         'bg-indigo-100 text-indigo-700',
    Java:       'bg-red-100 text-red-700',
    'C++':      'bg-purple-100 text-purple-700',
    Rust:       'bg-orange-100 text-orange-700',
    PHP:        'bg-violet-100 text-violet-700',
  };
  return map[lang] || 'bg-gray-100 text-gray-700';
};

const formatDate = (d) => {
  const date = new Date(d);
  const diff = Math.floor((Date.now() - date) / 60000);
  if (diff < 60)   return `Il y a ${diff} min`;
  if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`;
  if (diff < 10080) return `Il y a ${Math.floor(diff / 1440)}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const severityBadge = (sev) => {
  const s = (sev || '').toLowerCase();
  if (s === 'error' || s === 'critical')
    return 'bg-red-100 text-red-700 border border-red-200';
  if (s === 'warning')
    return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
  return 'bg-blue-100 text-blue-700 border border-blue-200';
};

// ── Génération PDF ───────────────────────────────────────────
const generatePDF = (review) => {
  const improvements  = Array.isArray(review.improvements)   ? review.improvements   : [];
  const codeSmells    = Array.isArray(review.code_smells)    ? review.code_smells    : [];
  const vulnerabilities = Array.isArray(review.vulnerabilities) ? review.vulnerabilities : [];
  const missingDocs   = Array.isArray(review.documentation?.missingDocs) ? review.documentation.missingDocs : [];
  const metrics       = review.metrics || {};

  const escape = (s) => String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color:#1a1a2e; background:#fff; padding:40px; }
  .header { background: linear-gradient(135deg,#7c3aed,#ec4899); color:#fff; padding:32px; border-radius:16px; margin-bottom:32px; }
  .header h1 { font-size:26px; font-weight:800; margin-bottom:6px; }
  .header p  { font-size:13px; opacity:.85; }
  .score-badge { display:inline-block; background:rgba(255,255,255,.2); border-radius:50px; padding:8px 20px; font-size:28px; font-weight:900; margin-top:12px; }
  .section { margin-bottom:28px; }
  .section h2 { font-size:16px; font-weight:700; color:#7c3aed; border-bottom:2px solid #ede9fe; padding-bottom:8px; margin-bottom:14px; display:flex; align-items:center; gap:6px; }
  .meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .meta-item { background:#f8f7ff; border-radius:10px; padding:12px 16px; border-left:3px solid #7c3aed; }
  .meta-item label { font-size:11px; color:#888; text-transform:uppercase; font-weight:600; }
  .meta-item p { font-size:14px; font-weight:700; color:#1a1a2e; margin-top:2px; }
  .item-card { border-radius:10px; padding:12px 14px; margin-bottom:8px; border:1px solid #e5e7eb; }
  .item-card.bug   { border-left:4px solid #ef4444; background:#fef2f2; }
  .item-card.warn  { border-left:4px solid #f59e0b; background:#fffbeb; }
  .item-card.info  { border-left:4px solid #3b82f6; background:#eff6ff; }
  .item-card.smell { border-left:4px solid #f97316; background:#fff7ed; }
  .item-card.vuln  { border-left:4px solid #8b5cf6; background:#f5f3ff; }
  .item-card.doc   { border-left:4px solid #0ea5e9; background:#f0f9ff; }
  .item-title { font-size:13px; font-weight:700; margin-bottom:4px; }
  .item-meta  { font-size:11px; color:#666; }
  .item-sugg  { font-size:12px; color:#444; margin-top:6px; font-style:italic; }
  .code-block { background:#0f172a; color:#e2e8f0; padding:20px; border-radius:12px; font-family:'Courier New',monospace; font-size:11px; line-height:1.7; white-space:pre-wrap; word-break:break-all; max-height:400px; overflow:hidden; }
  .metrics-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .metric-box { background:#f8f7ff; border-radius:10px; padding:14px; text-align:center; border:1px solid #ede9fe; }
  .metric-box .val { font-size:22px; font-weight:900; color:#7c3aed; }
  .metric-box .lbl { font-size:11px; color:#888; margin-top:2px; }
  .badge { display:inline-block; padding:2px 8px; border-radius:50px; font-size:10px; font-weight:700; }
  .footer { text-align:center; color:#aaa; font-size:11px; margin-top:40px; border-top:1px solid #eee; padding-top:20px; }
  .empty { color:#999; font-style:italic; font-size:13px; padding:10px 0; }
  @media print { body { padding:20px; } }
</style>
</head>
<body>

<div class="header">
  <h1>📋 Rapport d'Analyse — ${escape(review.file_name)}</h1>
  <p>Projet : ${escape(review.project_name)} &nbsp;|&nbsp; Analysé par : ${escape(review.user)} &nbsp;|&nbsp; ${new Date(review.analyzed_at).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
  <div class="score-badge">Score : ${review.score}/100</div>
</div>

<!-- META -->
<div class="section">
  <h2>ℹ️ Informations générales</h2>
  <div class="meta-grid">
    <div class="meta-item"><label>Projet</label><p>${escape(review.project_name)}</p></div>
    <div class="meta-item"><label>Fichier</label><p>${escape(review.file_name)}</p></div>
    <div class="meta-item"><label>Langage</label><p>${escape(review.language)}</p></div>
    <div class="meta-item"><label>Analysé par</label><p>${escape(review.user)}</p></div>
    <div class="meta-item"><label>Score qualité</label><p>${review.score}/100</p></div>
    <div class="meta-item"><label>Date d'analyse</label><p>${new Date(review.analyzed_at).toLocaleDateString('fr-FR')}</p></div>
  </div>
</div>

<!-- METRICS -->
${Object.keys(metrics).length > 0 ? `
<div class="section">
  <h2>📊 Métriques</h2>
  <div class="metrics-grid">
    ${metrics.lines         !== undefined ? `<div class="metric-box"><div class="val">${metrics.lines}</div><div class="lbl">Lignes totales</div></div>` : ''}
    ${metrics.codeLines     !== undefined ? `<div class="metric-box"><div class="val">${metrics.codeLines}</div><div class="lbl">Lignes de code</div></div>` : ''}
    ${metrics.functions     !== undefined ? `<div class="metric-box"><div class="val">${metrics.functions}</div><div class="lbl">Fonctions</div></div>` : ''}
    ${metrics.classes       !== undefined ? `<div class="metric-box"><div class="val">${metrics.classes}</div><div class="lbl">Classes</div></div>` : ''}
    ${metrics.emptyLines    !== undefined ? `<div class="metric-box"><div class="val">${metrics.emptyLines}</div><div class="lbl">Lignes vides</div></div>` : ''}
    ${metrics.characters    !== undefined ? `<div class="metric-box"><div class="val">${metrics.characters}</div><div class="lbl">Caractères</div></div>` : ''}
  </div>
</div>` : ''}

<!-- IMPROVEMENTS -->
<div class="section">
  <h2>⚡ Améliorations proposées (${improvements.length})</h2>
  ${improvements.length === 0 ? '<p class="empty">Aucune amélioration détectée</p>' :
    improvements.map(i => {
      const sev = (i.severity||'').toLowerCase();
      const cls = (sev==='error'||sev==='critical') ? 'bug' : sev==='warning' ? 'warn' : 'info';
      return `<div class="item-card ${cls}">
        <div class="item-title">${escape(i.message)}</div>
        <div class="item-meta">Ligne ${i.line || '?'} &nbsp;·&nbsp; Sévérité : ${escape(i.severity || 'info')} &nbsp;·&nbsp; Type : ${escape(i.type || '-')}</div>
        ${i.suggestion ? `<div class="item-sugg">💡 ${escape(i.suggestion)}</div>` : ''}
      </div>`;
    }).join('')}
</div>

<!-- CODE SMELLS -->
<div class="section">
  <h2>🔴 Code Smells (${codeSmells.length})</h2>
  ${codeSmells.length === 0 ? '<p class="empty">Aucun code smell détecté</p>' :
    codeSmells.map(s => `<div class="item-card smell">
      <div class="item-title">${escape(s.message)}</div>
      <div class="item-meta">Ligne ${s.line || '?'} &nbsp;·&nbsp; ${escape(s.severity || 'warning')}</div>
      ${s.suggestion ? `<div class="item-sugg">💡 ${escape(s.suggestion)}</div>` : ''}
    </div>`).join('')}
</div>

<!-- VULNERABILITÉS -->
<div class="section">
  <h2>🛡️ Vulnérabilités (${vulnerabilities.length})</h2>
  ${vulnerabilities.length === 0 ? '<p class="empty">Aucune vulnérabilité détectée</p>' :
    vulnerabilities.map(v => `<div class="item-card vuln">
      <div class="item-title">${escape(v.title || v.message)}</div>
      <div class="item-meta">${escape(v.severity || 'high')} ${v.cwe ? `&nbsp;·&nbsp; ${escape(v.cwe)}` : ''}</div>
      ${v.description ? `<div class="item-sugg">${escape(v.description)}</div>` : ''}
      ${v.fix ? `<div class="item-sugg">🔧 ${escape(v.fix)}</div>` : ''}
    </div>`).join('')}
</div>

<!-- DOCUMENTATION -->
<div class="section">
  <h2>📝 Documentation manquante (${missingDocs.length})</h2>
  ${missingDocs.length === 0 ? '<p class="empty">Documentation complète ✅</p>' :
    missingDocs.map(d => `<div class="item-card doc">
      <div class="item-title">${escape(d.name || d.type || 'Élément')}</div>
      <div class="item-meta">Ligne ${d.line || '?'} &nbsp;·&nbsp; Type : ${escape(d.type || '-')}</div>
      ${d.suggestion ? `<div class="item-sugg">💡 ${escape(d.suggestion)}</div>` : ''}
    </div>`).join('')}
</div>

<!-- CODE SOURCE -->
<div class="section">
  <h2>💻 Code source</h2>
  <div class="code-block">${escape(review.code || '// Code non disponible')}</div>
</div>

<div class="footer">
  Rapport généré automatiquement &nbsp;·&nbsp; ${new Date().toLocaleDateString('fr-FR')} &nbsp;·&nbsp; CodeReview Admin
</div>

</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
};

// ── StatCard ─────────────────────────────────────────────────
const StatCard = ({ icon: Icon, title, value, change, gradient, trend }) => (
  <div className="bg-white rounded-2xl p-4 lg:p-6 border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all group cursor-pointer transform hover:scale-105">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 lg:w-7 lg:h-7" />
      </div>
      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        {trend === 'up' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>}
        {change}%
      </div>
    </div>
    <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl lg:text-3xl font-bold text-gray-900">{value}</p>
  </div>
);

// ── Modale détail ────────────────────────────────────────────
const DetailModal = ({ review, onClose, sidebarOpen}) => {
  const [activeTab, setActiveTab] = useState('improvements');

  const improvements    = Array.isArray(review.improvements)    ? review.improvements    : [];
  const codeSmells      = Array.isArray(review.code_smells)     ? review.code_smells     : [];
  const vulnerabilities = Array.isArray(review.vulnerabilities) ? review.vulnerabilities : [];
  const missingDocs     = Array.isArray(review.documentation?.missingDocs) ? review.documentation.missingDocs : [];

  const tabs = [
    { key: 'improvements',    label: 'Améliorations',  count: improvements.length,    icon: Zap,         color: 'text-yellow-600' },
    { key: 'smells',          label: 'Code Smells',    count: codeSmells.length,      icon: AlertCircle, color: 'text-orange-600' },
    { key: 'vulnerabilities', label: 'Vulnérabilités', count: vulnerabilities.length, icon: Shield,      color: 'text-purple-600' },
    { key: 'documentation',   label: 'Documentation',  count: missingDocs.length,     icon: FileText,    color: 'text-blue-600'   },
    { key: 'code',            label: 'Code source',    count: null,                   icon: Code,        color: 'text-gray-600'   },
  ];

  return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pl-80 bg-black/60 backdrop-blur-sm"     style={{ paddingLeft: sidebarOpen ? '288px' : '80px' }}
              onClick={onClose}>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
            style={{ 
              maxWidth: sidebarOpen ? 'calc(100vw - 340px)' : 'calc(100vw - 120px)',
              maxHeight: '75vh',
              height: '75vh'
            }}
            onClick={e => e.stopPropagation()}
          >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 text-white flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold mb-1">{review.file_name}</h2>
            <p className="text-sm opacity-80">{review.project_name} &nbsp;·&nbsp; {review.user} &nbsp;·&nbsp; {formatDate(review.analyzed_at)}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className="bg-white/20 px-4 py-1.5 rounded-full text-sm font-bold">Score : {review.score}/100</span>
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${getLangColor(review.language)}`}>{review.language}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X className="w-5 h-5"/></button>
        </div>

        {/* Tabs */}
<div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto flex-shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-purple-600 text-purple-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${tab.color}`}/>
              {tab.label}
              {tab.count !== null && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === tab.key ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">


          {/* Améliorations */}
          {activeTab === 'improvements' && (
            <div className="space-y-3">
              {improvements.length === 0
                ? <p className="text-center text-gray-400 py-12">Aucune amélioration détectée ✅</p>
                : improvements.map((item, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${severityBadge(item.severity)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-sm">{item.message}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${severityBadge(item.severity)}`}>
                        {item.severity || 'info'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Ligne {item.line || '?'} &nbsp;·&nbsp; {item.type || '-'}</p>
                    {item.suggestion && <p className="text-xs mt-2 italic text-gray-600">💡 {item.suggestion}</p>}
                  </div>
                ))}
            </div>
          )}

          {/* Code Smells */}
          {activeTab === 'smells' && (
            <div className="space-y-3">
              {codeSmells.length === 0
                ? <p className="text-center text-gray-400 py-12">Aucun code smell détecté ✅</p>
                : codeSmells.map((item, i) => (
                  <div key={i} className="p-4 rounded-xl border border-orange-200 bg-orange-50">
                    <p className="font-semibold text-sm text-orange-800">{item.message}</p>
                    <p className="text-xs text-orange-600 mt-1">Ligne {item.line || '?'} &nbsp;·&nbsp; {item.severity || 'warning'}</p>
                    {item.suggestion && <p className="text-xs mt-2 italic text-orange-700">💡 {item.suggestion}</p>}
                  </div>
                ))}
            </div>
          )}

          {/* Vulnérabilités */}
          {activeTab === 'vulnerabilities' && (
            <div className="space-y-3">
              {vulnerabilities.length === 0
                ? <p className="text-center text-gray-400 py-12">Aucune vulnérabilité détectée ✅</p>
                : vulnerabilities.map((item, i) => (
                  <div key={i} className="p-4 rounded-xl border border-purple-200 bg-purple-50">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-sm text-purple-900">{item.title || item.message}</p>
                      <span className="px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full text-xs font-bold flex-shrink-0">
                        {item.severity || 'high'}
                      </span>
                    </div>
                    {item.cwe && <p className="text-xs text-purple-600 mt-1">{item.cwe}</p>}
                    {item.description && <p className="text-xs mt-2 text-purple-700">{item.description}</p>}
                    {item.fix && <p className="text-xs mt-2 italic text-purple-800">🔧 {item.fix}</p>}
                  </div>
                ))}
            </div>
          )}

          {/* Documentation */}
          {activeTab === 'documentation' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600"/>
                </div>
                <div>
                  <p className="font-bold text-blue-900">Couverture documentation</p>
                  <p className="text-2xl font-black text-blue-700">{review.documentation?.coverage ?? 0}%</p>
                </div>
              </div>
              {missingDocs.length === 0
                ? <p className="text-center text-gray-400 py-8">Documentation complète ✅</p>
                : missingDocs.map((item, i) => (
                  <div key={i} className="p-4 rounded-xl border border-blue-200 bg-blue-50">
                    <p className="font-semibold text-sm text-blue-900">{item.name || item.type || 'Élément'}</p>
                    <p className="text-xs text-blue-600 mt-1">Ligne {item.line || '?'} &nbsp;·&nbsp; {item.type}</p>
                    {item.suggestion && <p className="text-xs mt-2 italic text-blue-700">💡 {item.suggestion}</p>}
                  </div>
                ))}
            </div>
          )}

          {/* Code source */}
          {activeTab === 'code' && (
            <div className="bg-gray-950 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500"/>
                    <span className="w-3 h-3 rounded-full bg-yellow-500"/>
                    <span className="w-3 h-3 rounded-full bg-green-500"/>
                  </div>
                  <span className="font-mono text-sm text-gray-300">{review.file_name}</span>
                </div>
                <span className="text-xs text-gray-500">{(review.code || '').split('\n').length} lignes</span>
              </div>
              <pre className="p-5 text-sm text-gray-100 font-mono leading-relaxed overflow-auto max-h-[50vh] whitespace-pre-wrap break-words">
                <code>{review.code || '// Code non disponible'}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0">
          <span className="text-xs text-gray-500">
            {improvements.length + codeSmells.length + vulnerabilities.length} problème(s) détecté(s)
          </span>
          <button
            onClick={() => generatePDF(review)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
          >
            <Download className="w-4 h-4"/>
            Télécharger PDF
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Composant principal ──────────────────────────────────────
export default function CodeReviewsPage({ sidebarOpen = true }) {
  const [reviews, setReviews]           = useState([]);
  const [stats, setStats]               = useState({ total:0, analyzed:0, processing:0, avgScore:0 });
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [page, setPage]                 = useState(1);
  const [pagination, setPagination]     = useState({ total:0, totalPages:1 });
  const [selectedReview, setSelectedReview] = useState(null);
  const [loadingDetail, setLoadingDetail]   = useState(false);
  const [deleteConfirm, setDeleteConfirm]   = useState(null);

  const LIMIT = 10;

  // ── Fetch stats ──────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/code-reviews/stats`);
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (e) { console.error(e); }
  }, []);

  // ── Fetch reviews ────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page, limit: LIMIT,
        ...(searchTerm      && { search: searchTerm }),
        ...(filterLanguage !== 'all' && { language: filterLanguage }),
      });
      const res  = await fetch(`${API_BASE}/code-reviews?${params}`);
      const data = await res.json();
      if (data.success) {
        setReviews(data.reviews);
        setPagination(data.pagination);
      }
    } catch (e) {
      setError('Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterLanguage]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setPage(1); },  [searchTerm, filterLanguage]);
  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  // ── View detail ──────────────────────────────────────────
  const handleView = async (review) => {
    setLoadingDetail(true);
    try {
      const res  = await fetch(`${API_BASE}/code-reviews/${review.id}`);
      const data = await res.json();
      if (data.success) setSelectedReview(data.review);
    } catch(e) { console.error(e); }
    finally { setLoadingDetail(false); }
  };

  // ── Delete ───────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await fetch(`${API_BASE}/code-reviews/${id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      fetchReviews();
      fetchStats();
    } catch(e) { console.error(e); }
  };

  return (
    <div className="animate-fade-in">

      {/* Titre */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-1">Revues de Code</h1>
        <p className="text-sm text-gray-600">Historique des analyses effectuées</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
        <StatCard icon={FileCode}    title="Total analyses"  value={stats.total}      change={15.3} gradient="from-purple-500 to-purple-600" trend="up"/>
        <StatCard icon={CheckCircle} title="Analysées"       value={stats.analyzed}   change={8.7}  gradient="from-green-500 to-green-600"   trend="up"/>
        <StatCard icon={Activity}    title="En traitement"   value={stats.processing} change={2.1}  gradient="from-yellow-500 to-yellow-600" trend="down"/>
        <StatCard icon={Zap}         title="Score moyen"     value={`${stats.avgScore}%`} change={5.2} gradient="from-blue-500 to-blue-600" trend="up"/>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-4 lg:p-6 mb-6 lg:mb-8">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
            <input
              type="text"
              placeholder="Rechercher par projet, fichier, utilisateur..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl border-2 border-transparent focus:border-purple-500 focus:bg-white transition-all outline-none text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['all','Python','JavaScript','TypeScript','Go','Java','PHP'].map(lang => (
              <button
                key={lang}
                onClick={() => setFilterLanguage(lang)}
                className={`px-3 py-2 rounded-xl font-semibold text-xs transition-all ${
                  filterLanguage === lang
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {lang === 'all' ? 'Tous' : lang}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500"/>
          <p className="text-red-700 text-sm font-semibold">{error}</p>
          <button onClick={fetchReviews} className="ml-auto px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold">Réessayer</button>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Analyses</h2>
            <p className="text-sm text-gray-600">{pagination.total} résultat(s)</p>
          </div>
          {loading && <Loader2 className="w-5 h-5 text-purple-600 animate-spin"/>}
        </div>

        {loading && reviews.length === 0 ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 text-purple-600 animate-spin"/>
            <span className="text-gray-500 text-sm">Chargement…</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">Aucune analyse trouvée</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Projet','Fichier','Langage','Score','Problèmes','Utilisateur','Date','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reviews.map(review => (
                  <tr key={review.id} className="hover:bg-purple-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white shadow">
                          <GitBranch className="w-4 h-4"/>
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">{review.project_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs font-mono text-gray-700">
                        <FileCode className="w-3 h-3 text-purple-600"/>
                        {review.file_name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getLangColor(review.language)}`}>{review.language}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${review.score >= 90 ? 'bg-green-500' : review.score >= 80 ? 'bg-blue-500' : 'bg-yellow-500'}`} style={{ width:`${review.score}%` }}/>
                        </div>
                        <span className="font-bold text-sm text-gray-900">{review.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-sm ${parseInt(review.issues) > 10 ? 'text-red-600' : parseInt(review.issues) > 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {review.issues}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{review.user}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(review.analyzed_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleView(review)} className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors group" title="Voir le détail">
                          {loadingDetail ? <Loader2 className="w-4 h-4 animate-spin text-purple-600"/> : <Eye className="w-4 h-4 text-gray-600 group-hover:text-purple-600"/>}
                        </button>
                        <button onClick={() => generatePDF(review)} className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors group" title="Télécharger PDF">
                          <Download className="w-4 h-4 text-gray-600 group-hover:text-blue-600"/>
                        </button>
                        <button onClick={() => setDeleteConfirm(review.id)} className="p-1.5 hover:bg-red-100 rounded-lg transition-colors group" title="Supprimer">
                          <Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-600"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t-2 border-gray-200 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Page <span className="font-bold">{page}</span> sur <span className="font-bold">{pagination.totalPages}</span> &nbsp;·&nbsp; {pagination.total} résultat(s)
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="p-2 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-all disabled:opacity-40">
                <ChevronLeft className="w-4 h-4"/>
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, pagination.totalPages - 4)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)} className={`w-9 h-9 rounded-lg font-bold text-sm transition-all ${p === page ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white' : 'bg-white border-2 border-gray-200 hover:border-purple-500'}`}>{p}</button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p+1))} disabled={page === pagination.totalPages} className="p-2 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-all disabled:opacity-40">
                <ChevronRight className="w-4 h-4"/>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modale détail */}
      {selectedReview && <DetailModal review={selectedReview} sidebarOpen={sidebarOpen} onClose={() => setSelectedReview(null)}/>}

      {/* Confirm suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600"/>
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Supprimer cette analyse ?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Cette action est irréversible. Le projet et le code associés seront également supprimés.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-all">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
      `}</style>
    </div>
  );
}