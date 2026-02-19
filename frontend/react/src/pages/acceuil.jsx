import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, Code, CheckCircle, AlertCircle, FileText, Zap, Shield, TrendingUp,
  ArrowRight, Sparkles, Terminal, FileCode, Bug, BookOpen, Clock, Users,
  Image as ImageIcon, FileUp, Keyboard, Globe, ChevronDown, X, Menu,
  LogOut, User, LayoutDashboard, Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../src/hooks/useAuth';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const INITIAL_RESULT = {
  qualityScore: 0,
  improvements: [],
  codeSmells: [],
  documentation: { coverage: 0, missingDocs: [] },
  metrics: {}
};

export default function CodeReview() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  // Override local pour forcer le re-render immédiat au logout
  const [localLoggedOut, setLocalLoggedOut] = useState(false);
  const user = localLoggedOut ? null : authUser;
  const resultsRef  = useRef(null);
  const userMenuRef = useRef(null);

  // ── Auth ──────────────────────────────────────────────────
  const isLoggedIn = !!user;

  // Si authUser redevient défini (reconnexion), annuler le logout local
  useEffect(() => {
    if (authUser) setLocalLoggedOut(false);
  }, [authUser]);

  // Fermer le menu utilisateur si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── UI ───────────────────────────────────────────────────
  const [scrollY, setScrollY]                       = useState(0);
  const [showMobileMenu, setShowMobileMenu]         = useState(false);
  const [showUserMenu, setShowUserMenu]             = useState(false);
  const [showLanguageMenu, setShowLanguageMenu]     = useState(false);
  const [floatingElements, setFloatingElements]     = useState([]);
  const [language, setLanguage]                     = useState('fr');

  // ── Analyse ──────────────────────────────────────────────
  const [inputMethod, setInputMethod]               = useState('code');
  const [programmingLanguage, setProgrammingLanguage] = useState('python');
  const [showProgrammingLangMenu, setShowProgrammingLangMenu] = useState(false);
  const [codeInput, setCodeInput]                   = useState('');
  const [isAnalyzing, setIsAnalyzing]               = useState(false);
  const [showResults, setShowResults]               = useState(false);
  const [analysisResult, setAnalysisResult]         = useState(INITIAL_RESULT);
  const [activeTab, setActiveTab]                   = useState('improvements');

  // ── Data ─────────────────────────────────────────────────
  const [programmingLanguages, setProgrammingLanguages] = useState([]);
  const [languages, setLanguages]                   = useState([]);
  const [translations, setTranslations]             = useState({});
  const [loading, setLoading]                       = useState(true);
  const [guestStatus, setGuestStatus]               = useState(null);

  // ─────────────────────────────────────────────────────────
  //  INIT
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadAll();
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll);
    const els = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 60 + 20,
      delay: Math.random() * 5,
      duration: Math.random() * 20 + 15,
    }));
    setFloatingElements(els);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function loadAll() {
    await Promise.all([
      loadTranslations(),
      loadLanguages(),
      loadProgrammingLanguages(),
      !isLoggedIn && checkGuestStatus(),
    ]);
    setLoading(false);
  }

  async function loadTranslations() {
    try {
      const r = await axios.get(`${API_URL}/translations`);
      if (r.data.success) setTranslations(r.data.data);
    } catch { setTranslations(defaultTranslations); }
  }

  async function loadLanguages() {
    try {
      const r = await axios.get(`${API_URL}/translations/languages`);
      if (r.data.success) {
        setLanguages(r.data.languages.filter(l => l.is_active).map(l => ({
          code: l.code, name: l.name, flag: l.flag
        })));
      }
    } catch {
      setLanguages([
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'en', name: 'English',  flag: '🇬🇧' },
        { code: 'ar', name: 'العربية',  flag: '🇸🇦' },
      ]);
    }
  }

  async function loadProgrammingLanguages() {
    try {
      const r = await axios.get(`${API_URL}/analyze/programming-languages`);
      if (r.data.success) setProgrammingLanguages(r.data.languages);
    } catch {
      setProgrammingLanguages([
        { code: 'python',     name: 'Python',     icon: '🐍' },
        { code: 'javascript', name: 'JavaScript', icon: '📜' },
        { code: 'typescript', name: 'TypeScript', icon: '💠' },
        { code: 'java',       name: 'Java',       icon: '☕' },
        { code: 'cpp',        name: 'C++',        icon: '⚡' },
        { code: 'csharp',     name: 'C#',         icon: '#️⃣' },
        { code: 'go',         name: 'Go',         icon: '🔷' },
        { code: 'rust',       name: 'Rust',       icon: '🦀' },
        { code: 'php',        name: 'PHP',        icon: '🐘' },
        { code: 'ruby',       name: 'Ruby',       icon: '💎' },
      ]);
    }
  }

  async function checkGuestStatus() {
    try {
      const r = await axios.get(`${API_URL}/analyze/guest-status`);
      if (r.data.success) setGuestStatus(r.data);
    } catch { /* silencieux */ }
  }

  // ─────────────────────────────────────────────────────────
  //  ANALYSE
  // ─────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!isLoggedIn && (inputMethod === 'upload' || inputMethod === 'image')) {
      alert('⚠️ Connectez-vous pour télécharger des fichiers.');
      navigate('/login');
      return;
    }
    if (inputMethod === 'code' && !codeInput.trim()) {
      alert('⚠️ Veuillez entrer du code à analyser');
      return;
    }

    try {
      setIsAnalyzing(true);
      setShowResults(false);

      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(
        `${API_URL}/analyze`,
        { code: codeInput, language: programmingLanguage, fileName: `code.${programmingLanguage}` },
        { headers }
      );

      if (response.data.success) {
        const data = response.data.data;
        setAnalysisResult({
          qualityScore: data.qualityScore ?? 0,
          improvements: Array.isArray(data.improvements) ? data.improvements : [],
          codeSmells:   Array.isArray(data.codeSmells)   ? data.codeSmells   : [],
          documentation: {
            coverage:    data.documentation?.coverage    ?? 0,
            missingDocs: Array.isArray(data.documentation?.missingDocs) ? data.documentation.missingDocs : [],
          },
          metrics: data.metrics || {},
        });

        if (!isLoggedIn && response.data.remainingAnalyses !== undefined) {
          setGuestStatus(prev => ({
            ...prev,
            remaining:      response.data.remainingAnalyses,
            hasReachedLimit: response.data.remainingAnalyses === 0,
          }));
        }

        setTimeout(() => {
          setIsAnalyzing(false);
          setShowResults(true);
          setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }, 2000);
      }

    } catch (error) {
      setIsAnalyzing(false);
      if (error.response?.data?.languageMismatch) {
        const { message, detectedLanguageName, selectedLanguageName, detectedLanguage } = error.response.data;
        if (window.confirm(`${message}\n\n💡 Changer vers ${detectedLanguageName} ?`)) {
          setProgrammingLanguage(detectedLanguage);
          alert(`✅ Langage changé vers ${detectedLanguageName}. Cliquez sur Analyser à nouveau.`);
        }
      } else if (error.response?.data?.requiresAuth) {
        alert(`🚫 ${error.response.data.message}`);
        navigate('/login');
      } else {
        alert(`❌ ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const handleReset = () => {
    setShowResults(false);
    setAnalysisResult(INITIAL_RESULT);
    setCodeInput('');
    setActiveTab('improvements');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    // 1. Fermer les menus immédiatement
    setShowUserMenu(false);
    setShowMobileMenu(false);
    // 2. Forcer le re-render AVANT que useAuth se mette à jour
    setLocalLoggedOut(true);
    // 3. Nettoyer le token et appeler le hook
    localStorage.removeItem('token');
    logout?.();
    // 4. Réinitialiser l'état analyse
    setShowResults(false);
    setAnalysisResult(INITIAL_RESULT);
    setCodeInput('');
    // 5. Recharger le statut invité
    checkGuestStatus();
  };

  // ─────────────────────────────────────────────────────────
  //  HELPERS
  // ─────────────────────────────────────────────────────────
  const getScoreColor = (s) =>
    s >= 80 ? 'from-green-500 to-emerald-500'
    : s >= 60 ? 'from-yellow-500 to-orange-500'
    : 'from-red-500 to-rose-600';

  const getScoreBg = (s) =>
    s >= 80 ? 'from-green-50 via-emerald-50 to-teal-50 border-green-200'
    : s >= 60 ? 'from-yellow-50 via-orange-50 to-amber-50 border-orange-200'
    : 'from-red-50 via-rose-50 to-pink-50 border-red-200';

  const t = translations[language] || defaultTranslations[language] || defaultTranslations.fr;
  const currentLang = programmingLanguages.find(l => l.code === programmingLanguage);

  // ─────────────────────────────────────────────────────────
  //  LOADING
  // ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-semibold">Chargement...</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 relative overflow-hidden">

      {/* ── Fond animé ─────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {floatingElements.map((el) => (
          <div key={el.id} className="absolute rounded-full opacity-10 animate-float-slow" style={{
            left: `${el.x}%`, top: `${el.y}%`,
            width: `${el.size}px`, height: `${el.size}px`,
            background: `linear-gradient(135deg,
              ${['#8B5CF6','#EC4899','#3B82F6','#10B981','#F59E0B'][el.id % 5]},
              ${['#A78BFA','#F472B6','#60A5FA','#34D399','#FBBF24'][el.id % 5]})`,
            animationDelay: `${el.delay}s`, animationDuration: `${el.duration}s`,
          }} />
        ))}
      </div>

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrollY > 50 ? 'bg-white/85 backdrop-blur-xl shadow-lg border-b border-gray-200/60' : 'bg-white/50 backdrop-blur-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 animate-slide-in-left">
            <div className="relative group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
            </div>
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text">
              CodeReview
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-700 hover:text-purple-600 transition-colors font-medium relative group">
              {t.features}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 group-hover:w-full transition-all duration-300" />
            </a>
            <a href="#" className="text-sm text-gray-700 hover:text-purple-600 transition-colors font-medium relative group">
              {t.docs}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 group-hover:w-full transition-all duration-300" />
            </a>

            {/* Sélecteur de langue */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200"
              >
                <Globe className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">{languages.find(l => l.code === language)?.flag}</span>
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} />
              </button>
              {showLanguageMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-2 animate-fade-in">
                  {languages.map(lang => (
                    <button key={lang.code} onClick={() => { setLanguage(lang.code); setShowLanguageMenu(false); }}
                      className={`w-full px-4 py-2 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 ${language === lang.code ? 'bg-purple-50 text-purple-600' : 'text-gray-700'}`}>
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-sm font-medium">{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── CONNECTÉ : UserMenu ── */}
            {isLoggedIn ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium"
                >
                  <div className="w-6 h-6 bg-white/25 rounded-full flex items-center justify-center text-xs font-bold">
                    {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm max-w-[120px] truncate">{user?.name || user?.email}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-fade-in overflow-hidden">
                    {/* Infos user */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                      <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Utilisateur'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Connecté · Analyses illimitées
                      </span>
                    </div>
                    <button onClick={() => { navigate('/dashboard'); setShowUserMenu(false); }}
                      className="w-full px-4 py-2.5 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 text-gray-700 hover:text-purple-600">
                      <LayoutDashboard className="w-4 h-4" />
                      <span className="text-sm font-medium">Dashboard</span>
                    </button>
                    <button onClick={() => { navigate('/profile'); setShowUserMenu(false); }}
                      className="w-full px-4 py-2.5 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 text-gray-700 hover:text-purple-600">
                      <Settings className="w-4 h-4" />
                      <span className="text-sm font-medium">Paramètres</span>
                    </button>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button onClick={handleLogout}
                        className="w-full px-4 py-2.5 text-left hover:bg-red-50 transition-colors flex items-center gap-3 text-red-600">
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">Se déconnecter</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── NON CONNECTÉ : bouton Commencer ── */
              <button onClick={() => navigate('/login')}
                className="px-5 py-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium">
                {t.start}
              </button>
            )}
          </nav>

          {/* Mobile burger */}
          <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="lg:hidden p-2 text-gray-700">
            {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {showMobileMenu && (
          <div className="lg:hidden bg-white border-t border-gray-200 animate-fade-in">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-sm text-gray-700 hover:text-purple-600 py-2">{t.features}</a>
              <a href="#" className="block text-sm text-gray-700 hover:text-purple-600 py-2">{t.docs}</a>
              <div className="pt-2 border-t border-gray-200">
                {languages.map(lang => (
                  <button key={lang.code} onClick={() => { setLanguage(lang.code); setShowMobileMenu(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 ${language === lang.code ? 'bg-purple-50 text-purple-600' : 'text-gray-700'}`}>
                    <span>{lang.flag}</span>
                    <span className="text-sm">{lang.name}</span>
                  </button>
                ))}
              </div>
              {isLoggedIn ? (
                <div className="pt-2 border-t border-gray-200 space-y-1">
                  <div className="px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                    <p className="text-sm font-bold text-gray-900">{user?.name || 'Utilisateur'}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button onClick={() => { navigate('/dashboard'); setShowMobileMenu(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 text-gray-700 hover:bg-purple-50">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="text-sm">Dashboard</span>
                  </button>
                  <button onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 text-red-600 hover:bg-red-50">
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Se déconnecter</span>
                  </button>
                </div>
              ) : (
                <button onClick={() => navigate('/login')}
                  className="w-full px-5 py-2.5 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium">
                  {t.start}
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── HERO + ZONE D'ANALYSE ──────────────────────────── */}
      <section className="pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 px-4 sm:px-6 relative">
        <div className="max-w-7xl mx-auto relative z-10">

          {/* Hero text */}
          <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full mb-4 sm:mb-6 animate-bounce-slow border border-purple-200">
              <Sparkles className="w-4 h-4 text-purple-600 animate-spin-slow" />
              <span className="text-xs sm:text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
                Propulsé par l'IA avancée
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight animate-slide-up">
              {t.hero}<br />
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text animate-gradient">
                {t.heroHighlight}
              </span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-6 sm:mb-10 leading-relaxed animate-fade-in px-4">
              {t.heroDesc}
            </p>

            {/* Badge statut connecté */}
            {isLoggedIn && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full mb-4 animate-fade-in">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-700 font-medium">
                  Connecté en tant que <strong>{user?.name || user?.email}</strong> · Analyses illimitées
                </span>
              </div>
            )}
          </div>

          {/* Sélecteur méthode */}
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
              {[
                { id: 'code',   icon: Keyboard,   label: t.pasteCode,   color: 'pink'   },
                { id: 'upload', icon: FileUp,      label: t.uploadCode,  color: 'purple' },
                { id: 'image',  icon: ImageIcon,   label: t.uploadImage, color: 'blue'   },
              ].map(method => (
                <button key={method.id} onClick={() => setInputMethod(method.id)}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all transform hover:scale-105 ${
                    inputMethod === method.id
                      ? `bg-gradient-to-r from-${method.color}-600 to-${method.color}-500 text-white shadow-lg`
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-400'
                  }`}>
                  <method.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{method.label}</span>
                </button>
              ))}
            </div>

            {/* ── Zone de saisie ── */}
            {!showResults && !isAnalyzing && (
              <div className="animate-fade-in">
                {inputMethod === 'code' && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl border-2 border-pink-300 p-4 sm:p-8 shadow-xl">
                    {/* Sélecteur langage */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{t.selectLanguage}</label>
                      <div className="relative">
                        <button onClick={() => setShowProgrammingLangMenu(!showProgrammingLangMenu)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-pink-500 transition-all">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{currentLang?.icon}</span>
                            <span className="font-medium text-gray-700">{currentLang?.name}</span>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${showProgrammingLangMenu ? 'rotate-180' : ''}`} />
                        </button>
                        {showProgrammingLangMenu && (
                          <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 max-h-64 overflow-y-auto animate-fade-in">
                            {programmingLanguages.map(lang => (
                              <button key={lang.code} onClick={() => { setProgrammingLanguage(lang.code); setShowProgrammingLangMenu(false); }}
                                className={`w-full px-4 py-2.5 text-left hover:bg-pink-50 transition-colors flex items-center gap-3 ${programmingLanguage === lang.code ? 'bg-pink-50 text-pink-600' : 'text-gray-700'}`}>
                                <span className="text-xl">{lang.icon}</span>
                                <span className="font-medium">{lang.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <textarea value={codeInput} onChange={e => setCodeInput(e.target.value)}
                      placeholder={t.pasteCodeHere}
                      className="w-full h-64 sm:h-96 p-4 sm:p-6 bg-gray-50 rounded-xl border border-gray-300 focus:border-pink-500 focus:ring-4 focus:ring-pink-100 outline-none font-mono text-xs sm:text-sm resize-none transition-all" />

                    <div className="flex justify-between items-center mt-4">
                      {/* Badge invité */}
                      {!isLoggedIn && guestStatus && (
                        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                          <span className="font-semibold">{guestStatus.remaining}</span>
                          <span>analyse{guestStatus.remaining > 1 ? 's' : ''} restante{guestStatus.remaining > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {isLoggedIn && (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          Analyses illimitées
                        </div>
                      )}
                      <div className="flex gap-2 sm:gap-3 ml-auto">
                        <button onClick={() => setCodeInput('')}
                          className="px-4 sm:px-6 py-2 sm:py-3 text-sm bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-medium">
                          {t.clear}
                        </button>
                        <button onClick={handleAnalyze}
                          className="px-6 sm:px-8 py-2 sm:py-3 text-sm bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl hover:shadow-xl transition-all font-medium hover:scale-105">
                          {t.analyze}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {inputMethod === 'upload' && (
                  <div onClick={handleAnalyze}
                    className="bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-purple-300 p-16 text-center hover:border-purple-500 hover:bg-white hover:shadow-2xl cursor-pointer group transition-all">
                    <div className="mb-6 inline-block">
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-12 h-12 text-purple-600 group-hover:animate-bounce" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">{t.dropHere}</h3>
                    <p className="text-base text-gray-600 mb-6">Python, JavaScript, TypeScript, Java, C++, Go...</p>
                    <div className="px-8 py-3 text-base bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl transition-all font-medium hover:scale-105 inline-block">
                      Sélectionner des fichiers
                    </div>
                  </div>
                )}

                {inputMethod === 'image' && (
                  <div onClick={handleAnalyze}
                    className="bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-blue-300 p-16 text-center hover:border-blue-500 hover:bg-white hover:shadow-2xl cursor-pointer group transition-all">
                    <div className="mb-6 inline-block">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-3xl shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ImageIcon className="w-12 h-12 text-blue-600 group-hover:animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">{t.uploadImageHere}</h3>
                    <p className="text-base text-gray-600 mb-6">Screenshots, photos de code, diagrammes...</p>
                    <div className="px-8 py-3 text-base bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl inline-block">
                      Sélectionner une image
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Analyse en cours ── */}
            {isAnalyzing && (
              <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-purple-200 p-16 text-center shadow-2xl animate-fade-in">
                <div className="mb-6 relative">
                  <div className="w-24 h-24 mx-auto">
                    <div className="w-full h-full border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-purple-600 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">{t.analyzing}</h3>
                <p className="text-base text-gray-600 mb-8">Notre IA examine votre code en profondeur</p>
                <div className="flex items-center justify-center gap-2">
                  {[0,1,2,3,4].map(i => (
                    <div key={i} className="w-3 h-3 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.1}s`,
                        background: `linear-gradient(135deg, ${['#8B5CF6','#EC4899','#3B82F6'][i%3]}, ${['#A78BFA','#F472B6','#60A5FA'][i%3]})` }} />
                  ))}
                </div>
              </div>
            )}

        {/* ── RÉSULTATS ── */}
{showResults && (
  <div ref={resultsRef} className="animate-scale-in">

    {/* ══════════════════════════════════════════════════════
        CAS SPÉCIAL : Score = 0 → Code invalide / pas du code
        ══════════════════════════════════════════════════════ */}
    {analysisResult.qualityScore === 0 ? (
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border-2 border-red-200 shadow-2xl overflow-hidden">

        {/* Header rouge */}
        <div className="bg-gradient-to-r from-red-50 via-rose-50 to-pink-50 border-b-2 border-red-200 p-8 sm:p-10 text-center">
          {/* Emoji animé */}
          <div className="text-7xl sm:text-8xl mb-4 animate-bounce-slow select-none">🤔</div>

          <h3 className="text-2xl sm:text-3xl font-bold text-red-700 mb-3">
            Oups… ce n'est pas vraiment du code !
          </h3>
          <p className="text-base sm:text-lg text-red-500 font-medium mb-2">
            Score : <span className="font-bold text-red-700">0 / 100</span>
          </p>
          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto leading-relaxed">
            Ce que vous avez soumis contient des erreurs syntaxiques trop graves pour être analysé.
            Il ne s'agit pas d'un code valide et exécutable.
          </p>
        </div>

        {/* Corps — erreurs détectées */}
        <div className="p-6 sm:p-8">

          {/* Bannière explicative */}
          <div className="flex items-start gap-4 bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-6">
            <span className="text-3xl flex-shrink-0">🚨</span>
            <div>
              <h4 className="font-bold text-red-700 mb-1 text-base sm:text-lg">
                Erreurs critiques détectées ({analysisResult.codeSmells.length})
              </h4>
              <p className="text-sm text-red-600">
                Les problèmes suivants empêchent totalement l'exécution de ce code.
                Corrigez-les avant de réessayer.
              </p>
            </div>
          </div>

          {/* Liste des erreurs syntaxiques */}
          <div className="space-y-3">
            {analysisResult.improvements.length > 0
              ? analysisResult.improvements.map((imp, i) => (
                <div key={i} className="flex items-start gap-4 bg-white border-2 border-red-100 rounded-xl p-4 hover:border-red-300 hover:shadow-md transition-all">
                  <div className="w-9 h-9 bg-gradient-to-br from-red-400 to-rose-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow">
                    <span className="text-white text-sm font-bold">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">{imp.message}</p>
                      {imp.line && (
                        <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold whitespace-nowrap border border-red-200">
                          Ligne {imp.line}
                        </span>
                      )}
                    </div>
                    {imp.suggestion && (
                      <p className="text-xs sm:text-sm text-green-700 bg-green-50 rounded-lg px-3 py-1.5 mt-1 border border-green-200">
                        💡 {imp.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              ))
              : analysisResult.codeSmells.map((smell, i) => (
                <div key={i} className="flex items-start gap-4 bg-white border-2 border-red-100 rounded-xl p-4 hover:border-red-300 hover:shadow-md transition-all">
                  <div className="w-9 h-9 bg-gradient-to-br from-red-400 to-rose-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow">
                    <span className="text-white text-sm font-bold">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">{smell.message}</p>
                      {smell.line && (
                        <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold whitespace-nowrap border border-red-200">
                          Ligne {smell.line}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Conseil */}
          <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">💡</span>
            <div>
              <p className="font-bold text-blue-700 mb-1">Comment corriger ?</p>
              <ul className="text-sm text-blue-600 space-y-1 list-disc list-inside">
                <li>N'utilisez pas de mots-clés Python comme noms de variables (<code className="bg-blue-100 px-1 rounded">if</code>, <code className="bg-blue-100 px-1 rounded">class</code>, <code className="bg-blue-100 px-1 rounded">lambda</code>…)</li>
                <li>Ajoutez les parenthèses manquantes : <code className="bg-blue-100 px-1 rounded">print("hello")</code></li>
                <li>Terminez les conditions par <code className="bg-blue-100 px-1 rounded">:</code> → <code className="bg-blue-100 px-1 rounded">while True:</code></li>
                <li>Syntaxe d'import correcte : <code className="bg-blue-100 px-1 rounded">from math import sqrt</code></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t-2 border-gray-200 p-6 sm:p-8 bg-gradient-to-r from-red-50 to-pink-50">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 sm:py-4 text-sm sm:text-base bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:shadow-xl transition-all font-semibold hover:scale-105">
              <span>🔄</span>
              Réessayer avec du vrai code
            </button>
            <button
              onClick={() => setCodeInput(`def hello_world():\n    """Exemple de code Python valide."""\n    message = "Hello, World!"\n    print(message)\n    return message\n\nhello_world()`)}
              className="px-6 py-3 sm:py-4 text-sm sm:text-base border-2 border-blue-300 text-blue-600 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all font-semibold hover:scale-105 flex items-center gap-2">
              <span>📋</span>
              Voir un exemple valide
            </button>
          </div>
        </div>
      </div>

    ) : (
      /* ══════════════════════════════════════════════════════
          CAS NORMAL : Score > 0 → Affichage standard
          ══════════════════════════════════════════════════════ */
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-purple-200 shadow-2xl overflow-hidden">

        {/* Header résultats */}
        <div className={`bg-gradient-to-r ${getScoreBg(analysisResult.qualityScore)} border-b p-6 sm:p-8`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{t.analysisComplete}</h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Langage : <span className="font-semibold text-purple-600">{currentLang?.name || programmingLanguage}</span>
                  {isLoggedIn && (
                    <span className="ml-3 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                      ✓ Analyse complète
                    </span>
                  )}
                </p>
              </div>
            </div>
            {/* Score */}
            <div className="text-center">
              <div className={`text-5xl sm:text-6xl font-bold bg-gradient-to-r ${getScoreColor(analysisResult.qualityScore)} text-transparent bg-clip-text mb-1 animate-number-count`}>
                {analysisResult.qualityScore}
                <span className="text-3xl text-gray-400">/100</span>
              </div>
              <p className="text-sm text-gray-600 font-medium">{t.qualityScore}</p>
              <div className="w-32 h-2 bg-gray-200 rounded-full mt-2 mx-auto">
                <div className={`h-2 rounded-full bg-gradient-to-r ${getScoreColor(analysisResult.qualityScore)} transition-all duration-1000`}
                  style={{ width: `${analysisResult.qualityScore}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6 sm:px-8 bg-white/50 overflow-x-auto">
          <div className="flex gap-6 sm:gap-8 min-w-max">
            {[
              { id: 'improvements', label: t.improvements, icon: Sparkles, count: analysisResult.improvements.length },
              { id: 'smells',       label: t.smells,       icon: Bug,      count: analysisResult.codeSmells.length },
              { id: 'docs',         label: t.documentation, icon: BookOpen, count: null },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-all text-sm sm:text-base font-semibold whitespace-nowrap ${
                  activeTab === tab.id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}>
                <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu tabs */}
        <div className="p-6 sm:p-8">
          {activeTab === 'improvements' && (
            <div className="space-y-4 animate-fade-in">
              {analysisResult.improvements.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 text-green-400" />
                  <p className="text-lg font-semibold text-green-600">Aucune amélioration nécessaire !</p>
                  <p className="text-sm text-gray-500 mt-1">Votre code est déjà bien écrit 🎉</p>
                </div>
              ) : analysisResult.improvements.map((imp, i) => (
                <div key={i} className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-all hover:scale-[1.01]">
                  <div className="flex gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-gray-900 text-sm sm:text-base">{imp.message}</h4>
                        {imp.line && (
                          <span className="px-2.5 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-bold whitespace-nowrap">
                            Ligne {imp.line}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-700">{imp.suggestion}</p>
                      {imp.severity && (
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                          imp.severity === 'error'      ? 'bg-red-100 text-red-700'
                          : imp.severity === 'warning'  ? 'bg-yellow-100 text-yellow-700'
                          : imp.severity === 'convention' ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>{imp.severity}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'smells' && (
            <div className="space-y-4 animate-fade-in">
              {analysisResult.codeSmells.length === 0 ? (
                <div className="text-center py-12">
                  <Bug className="w-12 h-12 mx-auto mb-3 text-green-400" />
                  <p className="text-lg font-semibold text-green-600">Aucun code smell détecté !</p>
                  <p className="text-sm text-gray-500 mt-1">Votre code est propre 🧹</p>
                </div>
              ) : analysisResult.codeSmells.map((smell, i) => (
                <div key={i} className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-5 sm:p-6">
                  <div className="flex gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-400 to-rose-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Bug className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-gray-900 text-sm sm:text-base">{smell.message}</h4>
                        {smell.line && (
                          <span className="px-2.5 py-1 bg-red-200 text-red-800 rounded-full text-xs font-bold whitespace-nowrap">
                            Ligne {smell.line}
                          </span>
                        )}
                      </div>
                      {smell.variable && (
                        <p className="text-xs sm:text-sm text-gray-700 mb-2">
                          Règle : <code className="px-2 py-0.5 bg-white rounded text-xs font-mono border border-gray-300">{smell.variable}</code>
                        </p>
                      )}
                      {smell.severity && (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          smell.severity === 'error'    ? 'bg-red-100 text-red-700'
                          : smell.severity === 'refactor' ? 'bg-orange-100 text-orange-700'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}>{smell.severity}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="animate-fade-in">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5 sm:p-6">
                <div className="flex gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-3 text-sm sm:text-base">Documentation</h4>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm text-gray-600">Couverture :</span>
                      <span className="font-bold text-green-600 text-lg">{analysisResult.documentation?.coverage ?? 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                      <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-700"
                        style={{ width: `${analysisResult.documentation?.coverage ?? 0}%` }} />
                    </div>
                    <div className="space-y-2">
                      {(analysisResult.documentation?.missingDocs || []).map((doc, i) => (
                        <div key={i} className="text-xs sm:text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
                          <span>{doc.suggestion}{doc.line ? ` (ligne ${doc.line})` : ''}</span>
                        </div>
                      ))}
                      {(analysisResult.documentation?.missingDocs || []).length === 0 && (
                        <p className="text-sm text-green-600 font-medium">✅ Documentation complète !</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t-2 border-gray-200 p-6 sm:p-8 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button className="flex-1 px-6 py-3 sm:py-4 text-sm sm:text-base bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white rounded-xl hover:shadow-2xl transition-all font-semibold shadow-lg hover:scale-105">
              ✨ Appliquer les corrections
            </button>
            <button onClick={handleReset}
              className="px-6 py-3 sm:py-4 text-sm sm:text-base border-2 border-gray-300 text-gray-700 rounded-xl hover:border-purple-600 hover:text-purple-600 transition-all font-semibold hover:scale-105">
              Nouvelle analyse
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
)}

            {/* Badge invité sous la zone de saisie */}
            {!isLoggedIn && guestStatus && !showResults && !isAnalyzing && (
              <div className="mt-4 bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-center animate-fade-in">
                <p className="text-sm text-amber-800 mb-2">
                  <strong>Mode Invité :</strong> {guestStatus.remaining} analyse{guestStatus.remaining !== 1 ? 's' : ''} restante{guestStatus.remaining !== 1 ? 's' : ''} sur {guestStatus.limit}
                </p>
                {guestStatus.hasReachedLimit && (
                  <p className="text-xs text-amber-700 mb-2">⚠️ Limite atteinte ! Connectez-vous pour continuer.</p>
                )}
                <button onClick={() => navigate('/login')}
                  className="text-sm text-purple-600 hover:text-purple-700 font-semibold underline">
                  Connectez-vous pour des analyses illimitées ✨
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-20 bg-white/50 backdrop-blur-sm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t.featuresTitle?.split(' ').slice(0,-2).join(' ')}{' '}
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text">
                {t.featuresTitle?.split(' ').slice(-2).join(' ')}
              </span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto px-4">{t.featuresDesc}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: <Terminal className="w-8 h-8" />, title: t.featureMultiLang,        desc: t.featureMultiLangDesc,        gradient: 'from-purple-500 to-purple-600' },
              { icon: <Bug      className="w-8 h-8" />, title: t.featureBugDetection,     desc: t.featureBugDetectionDesc,     gradient: 'from-pink-500 to-pink-600' },
              { icon: <FileText className="w-8 h-8" />, title: t.featureAutoDocs,         desc: t.featureAutoDocsDesc,         gradient: 'from-blue-500 to-blue-600' },
              { icon: <Shield   className="w-8 h-8" />, title: t.featureSecurity,         desc: t.featureSecurityDesc,         gradient: 'from-green-500 to-green-600' },
              { icon: <Zap      className="w-8 h-8" />, title: t.featureOptimization,     desc: t.featureOptimizationDesc,     gradient: 'from-yellow-500 to-orange-600' },
              { icon: <TrendingUp className="w-8 h-8"/>, title: t.featureMetrics,         desc: t.featureMetricsDesc,         gradient: 'from-indigo-500 to-indigo-600' },
              { icon: <Clock    className="w-8 h-8" />, title: t.featureSpeed,            desc: t.featureSpeedDesc,            gradient: 'from-cyan-500 to-cyan-600' },
              { icon: <Users    className="w-8 h-8" />, title: t.featureCollaboration,    desc: t.featureCollaborationDesc,    gradient: 'from-rose-500 to-rose-600' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all group cursor-pointer transform hover:scale-105 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s` }}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${f.gradient} rounded-xl flex items-center justify-center mb-4 text-white group-hover:scale-110 transition-transform shadow-lg`}>
                  {f.icon}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            {[
              { n: t.stat1Number, l: t.stat1Label },
              { n: t.stat2Number, l: t.stat2Label },
              { n: t.stat3Number, l: t.stat3Label },
              { n: t.stat4Number, l: t.stat4Label },
            ].map((s, i) => (
              <div key={i} className="group cursor-pointer animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2 group-hover:scale-110 transition-transform">{s.n}</div>
                <div className="text-sm sm:text-base md:text-lg font-medium text-purple-100">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 animate-slide-up">
            {t.ctaTitle?.split(' ').slice(0,-3).join(' ')}{' '}
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text">
              {t.ctaTitle?.split(' ').slice(-3).join(' ')}
            </span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-6 sm:mb-10 animate-fade-in">{t.ctaDesc}</p>
          {!isLoggedIn ? (
            <button onClick={() => navigate('/login')}
              className="inline-flex items-center gap-3 px-10 py-5 text-base md:text-lg bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white rounded-2xl hover:shadow-2xl transition-all font-bold animate-pulse-button hover:scale-110">
              <Sparkles className="w-6 h-6" />
              {t.ctaButton}
              <ArrowRight className="w-6 h-6" />
            </button>
          ) : (
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-3 px-10 py-5 text-base md:text-lg bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white rounded-2xl hover:shadow-2xl transition-all font-bold hover:scale-110">
              <Sparkles className="w-6 h-6" />
              Analyser un code
              <ArrowRight className="w-6 h-6" />
            </button>
          )}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-white py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
            {[
              { title: t.footerProduct,   color: 'text-purple-400', links: [[t.footerProductFeatures,'#'],[t.footerProductPricing,'#']] },
              { title: t.footerCompany,   color: 'text-pink-400',   links: [[t.footerCompanyAbout,'#'],[t.footerCompanyContact,'#']] },
              { title: t.footerResources, color: 'text-blue-400',   links: [[t.footerResourcesDocs,'#'],[t.footerResourcesAPI,'#']] },
              { title: t.footerLegal,     color: 'text-green-400',  links: [[t.footerLegalPrivacy,'#'],[t.footerLegalTerms,'#']] },
            ].map((col, i) => (
              <div key={i}>
                <h3 className={`font-bold text-sm sm:text-base mb-3 sm:mb-4 ${col.color}`}>{col.title}</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                  {col.links.map(([label, href], j) => (
                    <li key={j}><a href={href} className="hover:text-white transition-colors">{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 pt-6 sm:pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="font-bold text-lg sm:text-xl">CodeReview</span>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm text-center md:text-right">{t.footerCopyright}</p>
          </div>
        </div>
      </footer>

      {/* ── CSS ────────────────────────────────────────────── */}
      <style jsx>{`
        @keyframes float-slow { 0%,100%{transform:translateY(0)translateX(0)rotate(0deg)} 33%{transform:translateY(-30px)translateX(20px)rotate(120deg)} 66%{transform:translateY(20px)translateX(-20px)rotate(240deg)} }
        @keyframes fade-in { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fade-in-up { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slide-up { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slide-in-left { from{opacity:0;transform:translateX(-50px)} to{opacity:1;transform:translateX(0)} }
        @keyframes scale-in { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes bounce-slow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes pulse-button { 0%,100%{box-shadow:0 0 0 0 rgba(139,92,246,.7)} 50%{box-shadow:0 0 0 10px rgba(139,92,246,0)} }
        @keyframes gradient { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes number-count { from{opacity:0;transform:scale(.5)} to{opacity:1;transform:scale(1)} }
        .animate-float-slow{animation:float-slow 20s ease-in-out infinite}
        .animate-fade-in{animation:fade-in .6s ease-out}
        .animate-fade-in-up{animation:fade-in-up .8s ease-out;animation-fill-mode:both}
        .animate-slide-up{animation:slide-up .8s ease-out}
        .animate-slide-in-left{animation:slide-in-left .8s ease-out}
        .animate-scale-in{animation:scale-in .5s ease-out}
        .animate-bounce-slow{animation:bounce-slow 3s ease-in-out infinite}
        .animate-pulse-button{animation:pulse-button 2s ease-out infinite}
        .animate-gradient{background-size:200% 200%;animation:gradient 3s ease infinite}
        .animate-spin-slow{animation:spin-slow 3s linear infinite}
        .animate-number-count{animation:number-count .8s ease-out}
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TRADUCTIONS PAR DÉFAUT
// ─────────────────────────────────────────────────────────────
const defaultTranslations = {
  fr: {
    features:'Fonctionnalités', pricing:'Tarifs', docs:'Documentation', start:'Commencer',
    hero:'Revue de code,', heroHighlight:'Instantanément',
    heroDesc:'Optimisé par une IA qui comprend votre code. Détectez les erreurs, améliorez la qualité et générez la documentation automatiquement.',
    tryFree:'Essayer gratuitement', uploadCode:'Télécharger un fichier', pasteCode:'Coller le code',
    uploadImage:'Image', pasteCodeHere:'Collez votre code ici...', selectLanguage:'Sélectionner le langage',
    analyze:'Analyser', clear:'Effacer', uploadImageHere:'Télécharger une image ici',
    dropHere:'Déposez votre fichier ici', analyzing:'Analyse en cours...',
    analysisComplete:'Analyse terminée', qualityScore:'Score de qualité',
    improvements:'Améliorations', smells:'Code Smells', documentation:'Documentation',
    featuresTitle:"Des milliers d'outils en un",
    featuresDesc:"CodeReview analyse automatiquement votre code et fournit des suggestions de haute qualité pour tous les langages de programmation.",
    featureMultiLang:'Multi-langages', featureMultiLangDesc:'20+ langages supportés',
    featureBugDetection:'Détection bugs', featureBugDetectionDesc:'Trouvez les erreurs cachées',
    featureAutoDocs:'Auto-docs', featureAutoDocsDesc:'Documentation automatique',
    featureSecurity:'Sécurité', featureSecurityDesc:'Analyse des vulnérabilités',
    featureOptimization:'Optimisation', featureOptimizationDesc:'Performances améliorées',
    featureMetrics:'Métriques', featureMetricsDesc:'Suivi de la qualité',
    featureSpeed:'Ultra-rapide', featureSpeedDesc:'Résultats en < 5s',
    featureCollaboration:'Collaboration', featureCollaborationDesc:"Travail d'équipe facilité",
    stat1Number:'2000+', stat1Label:'Outils IA', stat2Number:'10M+', stat2Label:'Analyses',
    stat3Number:'100+', stat3Label:'Langues', stat4Number:'24/7', stat4Label:'Disponible',
    ctaTitle:'Prêt à transformer votre code ?',
    ctaDesc:"Rejoignez des milliers de développeurs qui utilisent CodeReview pour écrire un meilleur code.",
    ctaButton:'Commencer gratuitement',
    footerProduct:'Produit', footerProductFeatures:'Fonctionnalités', footerProductPricing:'Tarifs',
    footerCompany:'Entreprise', footerCompanyAbout:'À propos', footerCompanyContact:'Contact',
    footerResources:'Ressources', footerResourcesDocs:'Documentation', footerResourcesAPI:'API',
    footerLegal:'Légal', footerLegalPrivacy:'Confidentialité', footerLegalTerms:'Conditions',
    footerCopyright:'© 2026 CodeReview. Tous droits réservés.',
  },
};