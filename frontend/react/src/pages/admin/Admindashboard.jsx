import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Bell, ChevronDown, LogOut, Settings, CheckCircle, Calendar, Download,
  Filter, Code, Eye, Clock, ArrowUp, ArrowDown, Bug, AlertCircle, Zap, FileText,
  Sparkles, LayoutDashboard, Users, FileCode, BarChart3, Activity, TrendingUp, Loader2
} from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import UsersPage from './Users';
import CodeReviewsPage from './CodeReviews';
import AnalyticsPage from './Analyticspage ';
import SettingsPage from './Settings';

const API_BASE = 'http://localhost:5000/api';

// Couleurs par langage
const LANG_COLORS = {
  Python:     'from-blue-500 to-blue-600',
  JavaScript: 'from-yellow-500 to-yellow-600',
  TypeScript: 'from-cyan-500 to-cyan-600',
  Java:       'from-red-500 to-red-600',
  'C++':      'from-purple-500 to-purple-600',
  Go:         'from-teal-500 to-teal-600',
  Rust:       'from-orange-500 to-orange-600',
  PHP:        'from-indigo-500 to-indigo-600',
};

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen]           = useState(true);
  const [activeSection, setActiveSection]       = useState('dashboard');
  const [showUserMenu, setShowUserMenu]         = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [floatingElements, setFloatingElements] = useState([]);
  const [isMobile, setIsMobile]                 = useState(false);

  // ── États dashboard ──────────────────────────────────────────
  const [stats, setStats] = useState({
    totalUsers: 0, activeAnalyses: 0, codeReviews: 0, successRate: 0,
  });
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [languages, setLanguages]           = useState([]);
  const [issues, setIssues]                 = useState({
    bugs: 0, smells: 0, optimizations: 0, documentation: 0,
  });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError]     = useState(null);


  const [codeModal, setCodeModal] = useState(null);      // { file, language, code }
  const [codeLoading, setCodeLoading] = useState(false);
  // ── Background animé ─────────────────────────────────────────
  useEffect(() => {
    const elements = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 40 + 15,
      delay: Math.random() * 5,
      duration: Math.random() * 15 + 10,
    }));
    setFloatingElements(elements);
  }, []);

  // ── Responsive sidebar ───────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Fetch dashboard ──────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const [statsRes, analysesRes, langsRes, issuesRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard/stats`),
        fetch(`${API_BASE}/dashboard/recent-analyses`),
        fetch(`${API_BASE}/dashboard/languages`),
        fetch(`${API_BASE}/dashboard/issues`),
      ]);

      const [s, a, l, i] = await Promise.all([
        statsRes.json(),
        analysesRes.json(),
        langsRes.json(),
        issuesRes.json(),
      ]);

      if (s.success) setStats(s.stats);
      if (a.success) setRecentAnalyses(a.analyses);
      if (l.success) setLanguages(l.languages);
      if (i.success) setIssues(i.issues);
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
      setDashboardError('Impossible de charger les données. Vérifiez que le serveur est démarré.');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'dashboard') fetchDashboard();
  }, [activeSection, fetchDashboard]);

  // ── Déconnexion ──────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };
const handleViewCode = async (analysis) => {
  setCodeLoading(true);
  setCodeModal({ file: analysis.file, language: analysis.language, code: null });
  try {
    const res = await fetch(`${API_BASE}/dashboard/code/${analysis.code_version_id}`);
    const data = await res.json();
    if (data.success) {
      setCodeModal({ file: data.code.file_name, language: data.code.programming_language, code: data.code.code });
    }
  } catch (err) {
    setCodeModal(prev => ({ ...prev, code: '// Erreur lors du chargement du code' }));
  } finally {
    setCodeLoading(false);
  }
};
  // ── Composants internes ──────────────────────────────────────
  const StatCard = ({ icon: Icon, title, value, change, gradient, trend }) => (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all group cursor-pointer transform hover:scale-105 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br ${gradient} rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
        </div>
        <div className={`flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-bold ${
          trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        }`}>
          {trend === 'up'
            ? <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4" />
            : <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4" />}
          {change}%
        </div>
      </div>
      <div>
        <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900">
          {dashboardLoading ? '—' : Number(value).toLocaleString()}
        </p>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 relative overflow-hidden">

      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {floatingElements.map((el) => (
          <div
            key={el.id}
            className="absolute rounded-full opacity-10 animate-float-slow"
            style={{
              left: `${el.x}%`, top: `${el.y}%`,
              width: `${el.size}px`, height: `${el.size}px`,
              background: `linear-gradient(135deg,
                ${['#8B5CF6','#EC4899','#3B82F6','#10B981'][el.id % 4]},
                ${['#A78BFA','#F472B6','#60A5FA','#34D399'][el.id % 4]})`,
              animationDelay: `${el.delay}s`,
              animationDuration: `${el.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      {/* Overlay mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-20'}`}>

        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b-2 border-gray-200 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-4">
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 bg-gray-100 rounded-xl border-2 border-transparent focus:border-purple-500 focus:bg-white transition-all outline-none text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 sm:p-3 bg-gray-100 hover:bg-purple-100 rounded-lg sm:rounded-xl transition-all relative"
                >
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 py-3 animate-fade-in">
                    <div className="px-4 pb-3 border-b border-gray-200">
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="px-4 py-3 hover:bg-purple-50 transition-colors cursor-pointer border-b border-gray-100">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs sm:text-sm font-semibold text-gray-900">Analyse terminée</p>
                              <p className="text-xs text-gray-600">Le fichier app.py a été analysé avec succès</p>
                              <p className="text-xs text-gray-400 mt-1">Il y a 5 minutes</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg sm:rounded-xl hover:shadow-lg transition-all border-2 border-purple-200"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                    AD
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-bold text-gray-900">Admin</p>
                    <p className="text-xs text-gray-600">admin@codereview.fr</p>
                  </div>
                  <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-600 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-xl shadow-2xl border-2 border-gray-200 py-2 animate-fade-in">
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); setActiveSection('settings'); setShowUserMenu(false); }}
                      className="flex items-center gap-3 px-4 py-2 sm:py-3 hover:bg-purple-50 transition-colors text-xs sm:text-sm text-gray-700"
                    >
                      <Settings className="w-4 h-4" />
                      Paramètres
                    </a>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 sm:py-3 hover:bg-red-50 transition-colors text-xs sm:text-sm text-red-600 border-t border-gray-200"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="p-4 sm:p-6 lg:p-8 relative z-10">

          {/* ── DASHBOARD ── */}
          {activeSection === 'dashboard' && (
            <div className="animate-fade-in">

              {/* Titre */}
              <div className="mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Tableau de bord</h1>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border-2 border-gray-200 rounded-lg sm:rounded-xl hover:border-purple-500 transition-all text-xs sm:text-sm font-semibold">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Aujourd'hui</span>
                    </button>
                    <button
                      onClick={fetchDashboard}
                      disabled={dashboardLoading}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg sm:rounded-xl hover:shadow-xl transition-all text-xs sm:text-sm font-semibold disabled:opacity-60"
                    >
                      {dashboardLoading
                        ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                        : <Download className="w-3 h-3 sm:w-4 sm:h-4" />}
                      <span className="hidden sm:inline">{dashboardLoading ? 'Chargement…' : 'Actualiser'}</span>
                    </button>
                  </div>
                </div>
                <p className="text-sm sm:text-base text-gray-600">Bienvenue sur votre tableau de bord administrateur</p>
              </div>

              {/* Erreur */}
              {dashboardError && (
                <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 text-sm font-semibold">{dashboardError}</p>
                  <button onClick={fetchDashboard} className="ml-auto px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all">
                    Réessayer
                  </button>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
                <StatCard icon={Users}      title="Utilisateurs totaux" value={stats.totalUsers}     change={12.5} gradient="from-purple-500 to-purple-600" trend="up" />
                <StatCard icon={Activity}   title="Analyses actives"    value={stats.activeAnalyses}  change={8.3}  gradient="from-pink-500 to-pink-600"    trend="up" />
                <StatCard icon={FileCode}   title="Revues de code"      value={stats.codeReviews}     change={15.7} gradient="from-blue-500 to-blue-600"    trend="up" />
                <StatCard icon={TrendingUp} title="Taux de réussite"    value={stats.successRate}     change={2.1}  gradient="from-green-500 to-green-600"  trend="up" />
              </div>

              {/* Analyses récentes */}
              <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden mb-6 sm:mb-8">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Analyses récentes</h2>
                    <p className="text-xs sm:text-sm text-gray-600">Dernières revues de code effectuées</p>
                  </div>
                  <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-purple-500 transition-all text-sm font-semibold">
                    <Filter className="w-4 h-4" />
                    Filtrer
                  </button>
                </div>

                {/* Loader */}
                {dashboardLoading && (
                  <div className="flex items-center justify-center py-12 gap-3">
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                    <span className="text-sm text-gray-500 font-medium">Chargement…</span>
                  </div>
                )}

                {/* Vide */}
                {!dashboardLoading && recentAnalyses.length === 0 && (
                  <div className="py-12 text-center text-gray-500 text-sm">Aucune analyse pour le moment</div>
                )}

                {/* Mobile — Cards */}
                {!dashboardLoading && recentAnalyses.length > 0 && (
                  <div className="block lg:hidden divide-y divide-gray-200">
                    {recentAnalyses.map((analysis) => (
                      <div key={analysis.id} className="p-4 hover:bg-purple-50 transition-colors">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {(analysis.user || '?').split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm">{analysis.user}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Code className="w-3 h-3 text-purple-600" />
                              <span className="font-mono text-xs text-gray-700">{analysis.file}</span>
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{analysis.language}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${analysis.score >= 90 ? 'bg-green-500' : analysis.score >= 80 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                                style={{ width: `${analysis.score}%` }}
                              />
                            </div>
                            <span className="font-bold text-gray-900 text-xs">{analysis.score}</span>
                          </div>
                          <span className="text-xs text-gray-600">{analysis.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Desktop — Table */}
                {!dashboardLoading && recentAnalyses.length > 0 && (
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Utilisateur','Fichier','Langage','Score','Statut','Temps','Actions'].map(h => (
                            <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {recentAnalyses.map((analysis) => (
                          <tr key={analysis.id} className="hover:bg-purple-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {(analysis.user || '?').split(' ').map(n => n[0]).join('')}
                                </div>
                                <span className="font-semibold text-gray-900">{analysis.user}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Code className="w-4 h-4 text-purple-600" />
                                <span className="font-mono text-sm text-gray-700">{analysis.file}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{analysis.language}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 w-16">
                                  <div
                                    className={`h-2 rounded-full ${analysis.score >= 90 ? 'bg-green-500' : analysis.score >= 80 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                                    style={{ width: `${analysis.score}%` }}
                                  />
                                </div>
                                <span className="font-bold text-gray-900 text-sm">{analysis.score}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {analysis.status === 'completed' ? (
                                <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold w-fit">
                                  <CheckCircle className="w-3 h-3" /> Terminé
                                </span>
                              ) : (
                                <span className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold w-fit">
                                  <Clock className="w-3 h-3 animate-spin" /> En cours
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-600">{analysis.time}</span>
                            </td>
                            <td className="px-6 py-4">
                             <button
                                  onClick={() => handleViewCode(analysis)}
                                  className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                                  title="Voir le code">
                                  <Eye className="w-4 h-4 text-gray-600" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Bottom Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

                {/* Langages populaires */}
                <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 shadow-xl p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Langages populaires</h3>
                  {dashboardLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                    </div>
                  ) : languages.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">Aucune donnée</p>
                  ) : (
                    <div className="space-y-4">
                      {languages.map((item, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-700 text-sm">{item.lang}</span>
                            <span className="text-xs sm:text-sm text-gray-600">{item.count.toLocaleString()} analyses</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                            <div
                              className={`h-2 sm:h-3 rounded-full bg-gradient-to-r ${LANG_COLORS[item.lang] || 'from-purple-500 to-purple-600'}`}
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Problèmes détectés */}
                <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 shadow-xl p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Problèmes détectés</h3>
                  {dashboardLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {[
                        { type: 'Bugs critiques',  count: issues.bugs,          icon: Bug,         gradient: 'from-red-400 to-red-500',       bgColor: 'bg-red-100',    textColor: 'text-red-700'    },
                        { type: 'Code smells',     count: issues.smells,        icon: AlertCircle, gradient: 'from-orange-400 to-orange-500', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
                        { type: 'Optimisations',   count: issues.optimizations, icon: Zap,         gradient: 'from-yellow-400 to-yellow-500', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
                        { type: 'Documentation',   count: issues.documentation, icon: FileText,    gradient: 'from-blue-400 to-blue-500',     bgColor: 'bg-blue-100',   textColor: 'text-blue-700'   },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-purple-50 transition-all cursor-pointer group transform hover:scale-[1.02]">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${item.gradient} rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                              <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <span className="font-semibold text-gray-700 text-sm sm:text-base">{item.type}</span>
                          </div>
                          <span className={`px-3 sm:px-4 py-1.5 sm:py-2 ${item.bgColor} ${item.textColor} rounded-lg font-bold text-sm sm:text-base`}>
                            {(item.count || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'users'     && <UsersPage />}
          {activeSection === 'reviews'   && <CodeReviewsPage />}
          {activeSection === 'analytics' && <AnalyticsPage />}
          {activeSection === 'settings'  && <SettingsPage />}

          {!['dashboard','users','reviews','analytics','settings'].includes(activeSection) && (
            <div className="text-center py-20 animate-fade-in">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-purple-600 animate-spin-slow" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Section {activeSection}</h2>
              <p className="text-sm sm:text-base text-gray-600">Contenu en cours de développement</p>
            </div>
          )}
        </main>
      </div>
{/* ── MODALE CODE ── */}
{codeModal && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    onClick={() => setCodeModal(null)}
  >
    <div
      className="bg-gray-950 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {/* Header modale */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex items-center gap-2 ml-2">
            <Code className="w-4 h-4 text-purple-400" />
            <span className="font-mono text-sm text-gray-200">{codeModal.file}</span>
            <span className="px-2 py-0.5 bg-purple-900 text-purple-300 rounded text-xs font-bold">{codeModal.language}</span>
          </div>
        </div>
        <button
          onClick={() => setCodeModal(null)}
          className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
        >
          ✕
        </button>
      </div>

      {/* Corps : code */}
      <div className="flex-1 overflow-auto p-6">
        {codeLoading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            <span className="text-gray-400 text-sm">Chargement du code…</span>
          </div>
        ) : (
          <pre className="text-sm text-gray-100 font-mono leading-relaxed whitespace-pre-wrap break-words">
            <code>{codeModal.code}</code>
          </pre>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-700 bg-gray-900 flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {codeModal.code ? `${codeModal.code.split('\n').length} lignes` : ''}
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(codeModal.code || '');
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-semibold transition-all"
        >
          Copier le code
        </button>
      </div>
    </div>
  </div>
)}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          33%       { transform: translateY(-30px) translateX(20px) rotate(120deg); }
          66%       { transform: translateY(20px) translateX(-20px) rotate(240deg); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .animate-float-slow  { animation: float-slow 20s ease-in-out infinite; }
        .animate-fade-in     { animation: fade-in 0.6s ease-out; }
        .animate-fade-in-up  { animation: fade-in-up 0.8s ease-out; animation-fill-mode: both; }
        .animate-spin-slow   { animation: spin-slow 3s linear infinite; }
      `}} />
    </div>
  );
}