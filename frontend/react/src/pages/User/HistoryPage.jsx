// src/pages/User/HistoryPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Code, Calendar, FileText, Loader,
  Trash2, Trash, X, CheckCircle, AlertCircle, Clock,
  ChevronRight, Search, SlidersHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/Navbar';          // ← import Navbar
import axios from 'axios';
import AnalysisDetailModal from '../User/AnalysisDetailModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Exemple de langues (à centraliser dans votre app si besoin) ─────────────
const LANGUAGES = [
  { code: 'fr', name: 'Français',  flag: '🇫🇷' },
  { code: 'en', name: 'English',   flag: '🇬🇧' },
  { code: 'ar', name: 'العربية',   flag: '🇹🇳' },
];

// ─── Couleur & label selon le score ─────────────────────────
function scoreConfig(score) {
  if (score === null || score === undefined) return null;
  if (score >= 80) return {
    gradient: 'from-emerald-500 to-green-500',
    bg: 'bg-emerald-50', border: 'border-emerald-200',
    text: 'text-emerald-600', ring: 'ring-emerald-200',
    label: 'Excellent', icon: <CheckCircle className="w-3.5 h-3.5" />,
  };
  if (score >= 60) return {
    gradient: 'from-amber-400 to-orange-400',
    bg: 'bg-amber-50', border: 'border-amber-200',
    text: 'text-amber-600', ring: 'ring-amber-200',
    label: 'Moyen', icon: <AlertCircle className="w-3.5 h-3.5" />,
  };
  return {
    gradient: 'from-red-500 to-rose-500',
    bg: 'bg-red-50', border: 'border-red-200',
    text: 'text-red-600', ring: 'ring-red-200',
    label: 'À améliorer', icon: <AlertCircle className="w-3.5 h-3.5" />,
  };
}

// ─── Badge score circulaire ──────────────────────────────────
function ScoreBadge({ score }) {
  if (score === null || score === undefined) {
    return (
      <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-gray-100 border-2 border-gray-200">
        <Clock className="w-5 h-5 text-gray-400 mb-1" />
        <span className="text-xs text-gray-400 font-medium">En cours</span>
      </div>
    );
  }

  const cfg = scoreConfig(score);
  const pct = Math.min(100, Math.max(0, score));
  const r = 28, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative flex flex-col items-center">
      <div className={`relative w-20 h-20 rounded-2xl ${cfg.bg} border-2 ${cfg.border} flex items-center justify-center shadow-sm`}>
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
          <circle
            cx="36" cy="36" r={r} fill="none"
            stroke="url(#scoreGrad)" strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor={pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'} />
              <stop offset="100%" stopColor={pct >= 80 ? '#22c55e' : pct >= 60 ? '#f97316' : '#f43f5e'} />
            </linearGradient>
          </defs>
        </svg>
        <div className="relative text-center">
          <span className={`text-lg font-black ${cfg.text} leading-none`}>{score}</span>
          <span className="block text-[10px] text-gray-400 font-medium leading-none">/100</span>
        </div>
      </div>
      <span className={`mt-1.5 text-xs font-semibold ${cfg.text} flex items-center gap-1`}>
        {cfg.icon}{cfg.label}
      </span>
    </div>
  );
}

// ─── Modal de confirmation suppression ──────────────────────
function DeleteModal({ count, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-scale-in">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
          {count === 'all' ? "Vider tout l'historique" : `Supprimer ${count} analyse${count > 1 ? 's' : ''}`}
        </h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          {count === 'all'
            ? 'Toutes vos analyses seront définitivement supprimées. Cette action est irréversible.'
            : `${count === 1 ? 'Cette analyse sera' : 'Ces analyses seront'} définitivement supprimée${count > 1 ? 's' : ''}. Impossible de revenir en arrière.`
          }
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-gray-300 transition-all">
            Annuler
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Scroll pour le glassmorphism de la Navbar
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Langue (à connecter à votre contexte global si besoin)
  const [language, setLanguage] = useState('fr');

  const [history, setHistory]             = useState([]);
  const [filtered, setFiltered]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [floatingElements, setFloatingElements] = useState([]);

  const [selected, setSelected]           = useState(new Set());
  const [selectMode, setSelectMode]       = useState(false);
  const [deleteModal, setDeleteModal]     = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast]                 = useState(null);
  const [detailItem, setDetailItem]       = useState(null);

  const [search, setSearch]               = useState('');
  const [filterScore, setFilterScore]     = useState('all');
  const [showFilters, setShowFilters]     = useState(false);

  // ── Init ────────────────────────────────────────────────
  useEffect(() => {
    loadHistory();
    const els = Array.from({ length: 10 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 40 + 15, delay: Math.random() * 5, duration: Math.random() * 15 + 10,
    }));
    setFloatingElements(els);
  }, []);

  // ── Filtre réactif ───────────────────────────────────────
  useEffect(() => {
    let result = [...history];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.project_name?.toLowerCase().includes(q) ||
        i.programming_language?.toLowerCase().includes(q) ||
        i.file_name?.toLowerCase().includes(q)
      );
    }
    if (filterScore !== 'all') {
      result = result.filter(i => {
        const s = i.quality_score;
        if (filterScore === 'good')   return s >= 80;
        if (filterScore === 'medium') return s >= 60 && s < 80;
        if (filterScore === 'bad')    return s < 60;
        return true;
      });
    }
    setFiltered(result);
  }, [history, search, filterScore]);

  // ── Chargement ───────────────────────────────────────────
  const loadHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_URL}/analyze/history`, { headers });
      if (response.data.success) setHistory(response.data.history);
    } catch (err) {
      console.error('❌ Historique:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Sélection ────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(i => i.project_id)));
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  // ── Suppression ──────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteModal) return;
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (deleteModal.ids === 'all') {
        await axios.delete(`${API_URL}/analyze/history`, { headers });
        setHistory([]);
      } else {
        await Promise.all(
          deleteModal.ids.map(id =>
            axios.delete(`${API_URL}/analyze/history/${id}`, { headers })
          )
        );
        setHistory(prev => prev.filter(i => !deleteModal.ids.includes(i.project_id)));
      }

      setSelected(new Set());
      setSelectMode(false);
      showToast(
        deleteModal.ids === 'all'
          ? 'Historique vidé avec succès'
          : `${deleteModal.ids.length} analyse${deleteModal.ids.length > 1 ? 's' : ''} supprimée${deleteModal.ids.length > 1 ? 's' : ''} avec succès`,
        'success'
      );
    } catch (err) {
      console.error('❌ Suppression:', err);
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setDeleteLoading(false);
      setDeleteModal(null);
    }
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Formatage ────────────────────────────────────────────
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const langIcons = {
    python: '🐍', javascript: '📜', typescript: '💠', java: '☕',
    cpp: '⚡', csharp: '#️⃣', go: '🔷', rust: '🦀', php: '🐘', ruby: '💎',
  };

  // ─────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 relative overflow-hidden">

      {/* Fond animé */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {floatingElements.map(el => (
          <div key={el.id} className="absolute rounded-full opacity-10 animate-float-slow" style={{
            left: `${el.x}%`, top: `${el.y}%`,
            width: `${el.size}px`, height: `${el.size}px`,
            background: `linear-gradient(135deg,
              ${['#8B5CF6','#EC4899','#3B82F6','#10B981'][el.id % 4]},
              ${['#A78BFA','#F472B6','#60A5FA','#34D399'][el.id % 4]})`,
            animationDelay: `${el.delay}s`, animationDuration: `${el.duration}s`,
          }} />
        ))}
      </div>

      {/* ── Navbar (remplace l'ancien header) ───────────────── */}
      <Navbar
        user={user}
        onLogout={logout}
        languages={LANGUAGES}
        language={language}
        onLangChange={setLanguage}
        scrollY={scrollY}
      />

      {/* ── Main ────────────────────────────────────────────── */}
      {/* pt-20 pour compenser la navbar fixed */}
      <main className="pt-50 top-20 p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="max-w-4xl mx-auto">

          {/* Titre + actions globales */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mes Analyses</h1>
              {!loading && (
                <p className="text-sm text-gray-500 mt-1">
                  {history.length} analyse{history.length > 1 ? 's' : ''} au total
                </p>
              )}
            </div>

            {!loading && history.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {!selectMode ? (
                  <>
                    <button onClick={() => setSelectMode(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm border-2 border-gray-200 text-gray-700 rounded-xl hover:border-purple-400 hover:text-purple-600 transition-all font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Sélectionner
                    </button>
                    <button onClick={() => setDeleteModal({ count: 'all', ids: 'all' })}
                      className="flex items-center gap-2 px-4 py-2 text-sm border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-all font-medium">
                      <Trash className="w-4 h-4" />
                      Tout vider
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={toggleAll}
                      className="flex items-center gap-2 px-4 py-2 text-sm border-2 border-purple-300 text-purple-600 rounded-xl hover:bg-purple-50 transition-all font-medium">
                      {selected.size === filtered.length ? 'Tout désélect.' : 'Tout sélect.'}
                    </button>
                    {selected.size > 0 && (
                      <button onClick={() => setDeleteModal({ count: selected.size, ids: [...selected] })}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:shadow-lg transition-all font-medium">
                        <Trash2 className="w-4 h-4" />
                        Supprimer ({selected.size})
                      </button>
                    )}
                    <button onClick={exitSelectMode}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
                      <X className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Barre de recherche + filtre */}
          {!loading && history.length > 0 && (
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un projet, un langage..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 focus:ring-4 focus:ring-purple-50 outline-none transition-all"
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="relative">
                <button onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-xl text-sm font-medium transition-all ${
                    filterScore !== 'all'
                      ? 'border-purple-400 text-purple-600 bg-purple-50'
                      : 'border-gray-200 text-gray-700 bg-white hover:border-purple-300'
                  }`}>
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtrer
                </button>
                {showFilters && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-20 animate-fade-in">
                    <p className="px-4 py-1 text-xs text-gray-400 font-semibold uppercase tracking-wider">Score</p>
                    {[
                      { value: 'all',    label: 'Tous les scores',    dot: 'bg-gray-400' },
                      { value: 'good',   label: '≥ 80 — Excellent',   dot: 'bg-emerald-500' },
                      { value: 'medium', label: '60-79 — Moyen',      dot: 'bg-amber-400' },
                      { value: 'bad',    label: '< 60 — À améliorer', dot: 'bg-red-500' },
                    ].map(opt => (
                      <button key={opt.value}
                        onClick={() => { setFilterScore(opt.value); setShowFilters(false); }}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-purple-50 transition-colors ${
                          filterScore === opt.value ? 'text-purple-600 bg-purple-50 font-semibold' : 'text-gray-700'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── États ───────────────────────────────────────── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-14 h-14 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              <p className="text-gray-500 font-medium">Chargement de votre historique...</p>
            </div>

          ) : history.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-16 text-center shadow-xl border border-white/30">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
                <FileText className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune analyse</h3>
              <p className="text-gray-500 mb-6 text-sm">Vous n'avez pas encore effectué d'analyse</p>
              <button onClick={() => navigate('/analyze')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl transition-all font-medium hover:scale-105">
                Commencer une analyse
              </button>
            </div>

          ) : filtered.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 text-center shadow-xl border border-white/30">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucun résultat pour cette recherche</p>
              <button onClick={() => { setSearch(''); setFilterScore('all'); }}
                className="mt-3 text-sm text-purple-600 hover:underline font-medium">
                Réinitialiser les filtres
              </button>
            </div>

          ) : (
            <div className="space-y-3">
              {filtered.map((item) => {
                const cfg = scoreConfig(item.quality_score);
                const isSelected = selected.has(item.project_id);

                return (
                  <div
                    key={item.project_id}
                    onClick={() => {
                      if (selectMode) { toggleSelect(item.project_id); return; }
                      setDetailItem(item);
                    }}
                    className={`group relative bg-white/90 backdrop-blur-sm rounded-2xl border-2 transition-all cursor-pointer
                      ${isSelected
                        ? 'border-purple-400 shadow-lg shadow-purple-100 scale-[1.01]'
                        : 'border-transparent hover:border-purple-200 hover:shadow-xl'
                      }`}
                  >
                    {selectMode && (
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                    )}

                    <div className={`p-5 flex items-center gap-4 ${selectMode ? 'pl-12' : ''}`}>
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-110 transition-transform text-xl">
                        {langIcons[item.programming_language?.toLowerCase()] || <Code className="w-6 h-6 text-white" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base truncate mb-1">
                          {item.project_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(item.created_at)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="text-base">{langIcons[item.programming_language?.toLowerCase()]}</span>
                            <span className="font-medium text-gray-600 capitalize">{item.programming_language}</span>
                          </span>
                          {item.file_name && (
                            <span className="px-2 py-0.5 bg-gray-100 rounded-md font-mono text-gray-500">
                              {item.file_name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <ScoreBadge score={item.quality_score} />
                      </div>

                      {!selectMode && (
                        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteModal({ count: 1, ids: [item.project_id] }); }}
                            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDetailItem(item); }}
                            className="p-2 rounded-xl text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
                            title="Voir les détails"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {item.quality_score !== null && item.quality_score !== undefined && (
                      <div className="h-1 w-full rounded-b-2xl overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${cfg?.gradient} transition-all duration-700`}
                          style={{ width: `${item.quality_score}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Résumé de sélection flottant */}
          {selectMode && selected.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
              <div className="bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4">
                <span className="text-sm font-medium">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
                <button
                  onClick={() => setDeleteModal({ count: selected.size, ids: [...selected] })}
                  className="flex items-center gap-2 px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
                <button onClick={exitSelectMode}
                  className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Modal suppression ──────────────────────────────── */}
      {deleteModal && (
        <DeleteModal
          count={deleteModal.count}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteModal(null)}
          loading={deleteLoading}
        />
      )}

      {/* ── Modal détail ───────────────────────────────────── */}
      {detailItem && (
        <AnalysisDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onViewFull={() => navigate(`/analyze/${detailItem.project_id}`)}
        />
      )}

      {/* ── Toast ─────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-medium animate-slide-up ${
          toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4" />
            : <AlertCircle className="w-4 h-4" />
          }
          {toast.message}
        </div>
      )}

      <style jsx>{`
        @keyframes float-slow {
          0%,100%{transform:translateY(0)translateX(0)rotate(0deg)}
          33%{transform:translateY(-30px)translateX(20px)rotate(120deg)}
          66%{transform:translateY(20px)translateX(-20px)rotate(240deg)}
        }
        @keyframes fade-in  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scale-in { from{opacity:0;transform:scale(.93)}       to{opacity:1;transform:scale(1)} }
        @keyframes slide-up { from{opacity:0;transform:translateY(20px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
        .animate-float-slow { animation: float-slow 20s ease-in-out infinite; }
        .animate-fade-in    { animation: fade-in .25s ease-out; }
        .animate-scale-in   { animation: scale-in .3s ease-out; }
        .animate-slide-up   { animation: slide-up .4s ease-out; }
      `}</style>
    </div>
  );
}