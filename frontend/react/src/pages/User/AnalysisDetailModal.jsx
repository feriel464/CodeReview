// ─────────────────────────────────────────────────────────────
//  COMPOSANT : AnalysisDetailModal
//  À insérer dans HistoryPage.jsx (avant le export default)
//  Ouvre un popup avec les détails d'une analyse au clic sur →
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import {
  X, CheckCircle, AlertCircle, AlertTriangle, Info,
  Loader, ShieldAlert, BookOpen, Bug, Zap, ChevronRight,
  Calendar, Code, FileText, BarChart2
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL || ' ';

// ─── Helpers ────────────────────────────────────────────────
const TABS = [
  { id: 'improvements', label: 'Améliorations', icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'smells',       label: 'Code smells',   icon: <Bug className="w-3.5 h-3.5" /> },
  { id: 'vulns',        label: 'Vulnérabilités', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  { id: 'docs',         label: 'Documentation',  icon: <BookOpen className="w-3.5 h-3.5" /> },
];

const LANG_ICONS = {
  python: '🐍', javascript: '📜', typescript: '💠', java: '☕',
  cpp: '⚡', csharp: '#️⃣', go: '🔷', rust: '🦀', php: '🐘', ruby: '💎',
};

function severityDot(severity) {
  const map = {
    error:    'bg-red-500',
    critical: 'bg-red-600',
    warning:  'bg-amber-400',
    high:     'bg-red-500',
    medium:   'bg-amber-400',
    low:      'bg-blue-500',
    info:     'bg-blue-400',
  };
  return map[severity?.toLowerCase()] || 'bg-gray-400';
}

function scoreGradient(score) {
  if (score >= 80) return 'from-emerald-500 to-green-400';
  if (score >= 60) return 'from-amber-400 to-orange-400';
  return 'from-red-500 to-rose-500';
}

function scoreTextColor(score) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

// ─── IssueRow ────────────────────────────────────────────────
function IssueRow({ dot, message, hint, line, highlight }) {
  return (
    <div className={`flex gap-3 items-start px-3 py-3 rounded-xl border transition-colors mb-2 ${
      highlight
        ? 'bg-red-50 border-red-200'
        : 'bg-gray-50 border-gray-100 hover:border-gray-200'
    }`}>
      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 leading-snug">{message}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{hint}</p>}
      </div>
      {line && (
        <span className="text-[10px] font-mono bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-500 flex-shrink-0">
          L.{line}
        </span>
      )}
    </div>
  );
}

// ─── Tab content panels ──────────────────────────────────────
function ImprovementsTab({ items }) {
  if (!items?.length) return <Empty label="Aucune amélioration détectée" icon={<CheckCircle className="w-8 h-8 text-emerald-400" />} />;
  return (
    <div>
      {items.map((item, i) => (
        <IssueRow
          key={i}
          dot={severityDot(item.severity)}
          message={item.message}
          hint={item.suggestion}
          line={item.line}
        />
      ))}
    </div>
  );
}

function SmellsTab({ items }) {
  if (!items?.length) return <Empty label="Aucun code smell détecté" icon={<CheckCircle className="w-8 h-8 text-emerald-400" />} />;
  return (
    <div>
      {items.map((item, i) => (
        <IssueRow
          key={i}
          dot={severityDot(item.severity)}
          message={item.message}
          hint={item.variable || item.suggestion}
          line={item.line}
        />
      ))}
    </div>
  );
}

// ─── Normalisation ───────────────────────────────────────────
const TYPE_LABELS = {
  sql_injection:     'Injection SQL',
  command_injection: 'Injection de commande',
  exposed_secret:    'Secret exposé',
  xss:               'Cross-Site Scripting (XSS)',
  path_traversal:    'Path Traversal',
  ldap_injection:    'Injection LDAP',
  xxe:               'XML External Entity (XXE)',
  open_redirect:     'Redirection ouverte',
  unknown:           'Vulnérabilité détectée',
};

function normalizeVuln(vuln) {
  // Format ML  → { type, severity, confidence, vulnerable_lines }
  // Format DeepSeek → { title, description, severity, cwe, fix, lines }
  return {
    title:       vuln.title       || TYPE_LABELS[vuln.type] || vuln.type || 'Vulnérabilité',
    description: vuln.description || vuln.vulnerable_lines?.[0]?.explanation || '',
    severity:    vuln.severity    || 'medium',
    cwe:         vuln.cwe         || null,
    fix:         vuln.fix         || null,
    confidence:  vuln.confidence  ?? null,
    lines: vuln.lines || (vuln.vulnerable_lines || []).map(l => ({
      line:        l.line,
      code:        l.code,
      explanation: l.explanation,
    })),
  };
}

function VulnsTab({ items }) {
  if (!items?.length) return (
    <Empty
      label="Aucune vulnérabilité détectée"
      icon={<ShieldAlert className="w-8 h-8 text-emerald-400" />}
    />
  );

  const normalized = items.map(normalizeVuln);

  return (
    <div>
      {normalized.map((vuln, i) => (
        <div key={i} className="mb-3 rounded-xl border border-red-200 bg-red-50 overflow-hidden">
          <div className="flex items-start gap-3 px-3 py-3">
            <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-red-500" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-red-800">{vuln.title}</p>
                {vuln.cwe && (
                  <span className="text-[10px] font-mono bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                    {vuln.cwe}
                  </span>
                )}
                {vuln.confidence !== null && (
                  <span className="text-[10px] text-red-400 font-mono">
                    conf. {(vuln.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              {vuln.description && (
                <p className="text-xs text-red-600 mt-1 leading-snug">{vuln.description}</p>
              )}
              {vuln.fix && (
                <p className="text-xs text-gray-600 mt-1.5 leading-snug">
                  <span className="font-medium text-gray-700">Correction : </span>{vuln.fix}
                </p>
              )}
            </div>
            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${
              vuln.severity === 'critical' || vuln.severity === 'high'
                ? 'bg-red-200 text-red-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {vuln.severity}
            </span>
          </div>

          {/* Lignes de code vulnérables */}
          {vuln.lines?.length > 0 && (
            <div className="border-t border-red-200 px-3 py-2 bg-red-100/50 space-y-1.5">
              {vuln.lines.map((l, j) => (
                <div key={j} className="text-xs text-red-700">
                  <div className="flex gap-2 items-center">
                    <span className="font-mono font-medium flex-shrink-0">L.{l.line}</span>
                    <code className="truncate bg-red-200/50 px-1.5 py-0.5 rounded font-mono">
                      {l.code}
                    </code>
                  </div>
                  {l.explanation && (
                    <p className="text-red-500 mt-0.5 ml-8 leading-snug">{l.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DocsTab({ documentation }) {
  const fns = documentation?.functions || [];
  const missing = documentation?.missingDocs || [];

  if (!fns.length && !missing.length) {
    return <Empty label="Aucune information de documentation" icon={<BookOpen className="w-8 h-8 text-gray-300" />} />;
  }

  return (
    <div>
      {/* Coverage bar */}
      {documentation?.coverage !== undefined && (
        <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-gray-600">Couverture documentation</span>
            <span className={`text-sm font-semibold ${documentation.coverage >= 80 ? 'text-emerald-600' : documentation.coverage >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
              {documentation.coverage}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${scoreGradient(documentation.coverage)} transition-all duration-700`}
              style={{ width: `${documentation.coverage}%` }}
            />
          </div>
        </div>
      )}

      {/* Missing docs */}
      {missing.map((m, i) => (
        <IssueRow
          key={`missing-${i}`}
          dot="bg-amber-400"
          message={`${m.type || 'Fonction'} "${m.name}" sans documentation`}
          hint={m.suggestion || 'Ajoutez une docstring complète'}
          line={m.line}
        />
      ))}

      {/* Documented functions */}
      {fns.filter(f => f.description?.length > 10).map((fn, i) => (
        <div key={`fn-${i}`} className="mb-2 px-3 py-3 rounded-xl border border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <code className="text-xs font-semibold text-gray-700">{fn.name}()</code>
            <span className="text-[10px] text-gray-400 font-mono">{fn.type}</span>
            {fn.line && (
              <span className="ml-auto text-[10px] font-mono bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-400">
                L.{fn.line}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 leading-snug ml-4">{fn.description}</p>
        </div>
      ))}
    </div>
  );
}

function Empty({ label, icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
      {icon}
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MODAL PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function AnalysisDetailModal({ item, onClose, onViewFull }) {
  const [activeTab, setActiveTab] = useState('improvements');
  const [details, setDetails]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    fetchDetails();
    // Fermer avec Escape
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item.project_id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(
        `${API_URL}/analyze/history/${item.project_id}/details`,
        { headers }
      );
      if (res.data.success) {
        setDetails(res.data.data);
      } else {
        setError('Impossible de charger les détails');
      }
    } catch (err) {
      setError('Erreur lors du chargement');
      console.error('❌ fetchDetails:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // Données issues de details ou fallback sur item
  const improvements  = details?.improvements  || [];
  const codeSmells    = details?.code_smells   || [];
  const vulns         = details?.vulnerabilities || [];
  const documentation = details?.documentation || {};
  const metrics       = details?.metrics       || {};
  const score         = item.quality_score;

  const tabCounts = {
    improvements: improvements.length,
    smells:       codeSmells.length,
    vulns:        vulns.length,
    docs:         (documentation.missingDocs?.length || 0) + (documentation.functions?.length || 0),
  };

  return (
    // Faux viewport pour que position:fixed ne réduise pas l'iframe
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-scale-in overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-start gap-3 px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
            {LANG_ICONS[item.programming_language?.toLowerCase()] || <Code className="w-5 h-5 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">{item.project_name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                {formatDate(item.created_at)}
              </span>
              <span className="text-xs text-gray-500 capitalize font-medium">
                {LANG_ICONS[item.programming_language?.toLowerCase()]} {item.programming_language}
              </span>
              {item.file_name && (
                <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                  {item.file_name}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Score strip ── */}
        <div className="flex gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          {/* Score principal */}
          <div className="flex-1 bg-white rounded-xl border border-gray-100 px-3 py-2.5 text-center">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Score qualité</p>
            {score !== null && score !== undefined ? (
              <>
                <p className={`text-xl font-bold ${scoreTextColor(score)}`}>
                  {score}<span className="text-xs font-normal text-gray-400">/100</span>
                </p>
                <div className="h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${scoreGradient(score)}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-400">En cours…</p>
            )}
          </div>

   

          {/* Fonctions */}
          <div className="flex-1 bg-white rounded-xl border border-gray-100 px-3 py-2.5 text-center">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Fonctions</p>
            <p className="text-xl font-bold text-gray-700">
              {loading ? '—' : (metrics.functions ?? '—')}
            </p>
          </div>

          {/* Docs */}
          <div className="flex-1 bg-white rounded-xl border border-gray-100 px-3 py-2.5 text-center">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Docs</p>
            {loading ? (
              <p className="text-xl font-bold text-gray-700">—</p>
            ) : (
              <>
                <p className={`text-xl font-bold ${scoreTextColor(documentation.coverage ?? 0)}`}>
                  {documentation.coverage ?? 0}<span className="text-xs font-normal">%</span>
                </p>
                <div className="h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${scoreGradient(documentation.coverage ?? 0)}`}
                    style={{ width: `${documentation.coverage ?? 0}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-100 px-4 flex-shrink-0 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-purple-600 border-purple-500'
                  : 'text-gray-400 border-transparent hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {!loading && tabCounts[tab.id] > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === tab.id
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {tabCounts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Chargement des détails…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={fetchDetails}
                className="text-xs text-purple-600 hover:underline"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'improvements' && <ImprovementsTab items={improvements} />}
              {activeTab === 'smells'       && <SmellsTab items={codeSmells} />}
              {activeTab === 'vulns'        && <VulnsTab items={vulns} />}
              {activeTab === 'docs'         && <DocsTab documentation={documentation} />}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            Fermer
          </button>
      
        </div>
      </div>
    </div>
  );
}
