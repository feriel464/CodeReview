import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Terminal, Globe, ChevronDown, X, Menu,
  LogOut, LayoutDashboard, Settings, History, User,
  Sparkles
} from 'lucide-react';

/**
 * Navbar — composant réutilisable
 *
 * Props :
 *   user          — objet utilisateur connecté (ou null)
 *   onLogout      — callback appelé au clic "Se déconnecter"
 *   languages     — tableau [{ code, name, flag }]
 *   language      — code langue actif (ex: 'fr')
 *   onLangChange  — callback(code) quand la langue change
 *   scrollY       — valeur du scroll pour l'effet glassmorphism (optionnel)
 */
export default function Navbar({
  user        = null,
  onLogout    = () => {},
  languages   = [],
  language    = 'fr',
  onLangChange = () => {},
  scrollY     = 0,
}) {
  const navigate       = useNavigate();
  const location       = useLocation();
  const userMenuRef    = useRef(null);

  const [showMobileMenu,   setShowMobileMenu]   = useState(false);
  const [showUserMenu,     setShowUserMenu]     = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const isLoggedIn = !!user;

  // Fermer le menu user si clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fermer le menu mobile à chaque changement de route
  useEffect(() => {
    setShowMobileMenu(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  // Liens réservés aux utilisateurs connectés
  const authLinks = [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/dashboard' },
    { label: "Historique d'analyse", icon: History,        path: '/history'   },
    { label: 'Mon profil',          icon: User,            path: '/profile'   },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    setShowUserMenu(false);
    setShowMobileMenu(false);
    onLogout();
  };

  const currentLangObj = languages.find(l => l.code === language);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrollY > 50
          ? 'bg-white/85 backdrop-blur-xl shadow-lg border-b border-gray-200/60'
          : 'bg-white/50 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">

        {/* ── Logo ── */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 sm:gap-3 animate-slide-in-left"
        >
          <div className="relative group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
          </div>
          <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text">
            CodeReview
          </span>
        </button>

        {/* ── Desktop nav ── */}
        <nav className="hidden lg:flex items-center gap-6">

          {/* Liens publics */}

          <a href="/" className="text-sm text-gray-700 hover:text-purple-600 transition-colors font-medium relative group">
            acceuil
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 group-hover:w-full transition-all duration-300" />
          </a>

          {/* Liens connectés — affichés inline dans la nav desktop */}
          {isLoggedIn && authLinks.map(link => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors relative group ${
                isActive(link.path)
                  ? 'text-purple-600'
                  : 'text-gray-700 hover:text-purple-600'
              }`}
            >
              <link.icon className="w-3.5 h-3.5" />
              {link.label}
              <span className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300 ${
                isActive(link.path) ? 'w-full' : 'w-0 group-hover:w-full'
              }`} />
            </button>
          ))}

          {/* Sélecteur de langue */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200"
            >
              <Globe className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">{currentLangObj?.flag}</span>
              <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} />
            </button>

            {showLanguageMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-2 animate-fade-in">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { onLangChange(lang.code); setShowLanguageMenu(false); }}
                    className={`w-full px-4 py-2 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 ${
                      language === lang.code ? 'bg-purple-50 text-purple-600' : 'text-gray-700'
                    }`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span className="text-sm font-medium">{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bouton user / connexion */}
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
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-fade-in overflow-hidden">

                  {/* Profil rapide */}
                  <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Utilisateur'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      Connecté · Analyses illimitées
                    </span>
                  </div>

                  {/* Liens du menu */}
                  {authLinks.map(link => (
                    <button
                      key={link.path}
                      onClick={() => { navigate(link.path); setShowUserMenu(false); }}
                      className={`w-full px-4 py-2.5 text-left transition-colors flex items-center gap-3 ${
                        isActive(link.path)
                          ? 'bg-purple-50 text-purple-600'
                          : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600'
                      }`}
                    >
                      <link.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">{link.label}</span>
                      {isActive(link.path) && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500" />
                      )}
                    </button>
                  ))}

                  {/* Déconnexion */}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left hover:bg-red-50 transition-colors flex items-center gap-3 text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">Se déconnecter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium"
            >
              Commencer
            </button>
          )}
        </nav>

        {/* ── Burger mobile ── */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="lg:hidden p-2 text-gray-700"
        >
          {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ── Menu mobile ── */}
      {showMobileMenu && (
        <div className="lg:hidden bg-white border-t border-gray-200 animate-fade-in">
          <div className="px-4 py-4 space-y-1">

            {/* Liens publics */}
            <a href="#features" className="block text-sm text-gray-700 hover:text-purple-600 px-3 py-2 rounded-lg hover:bg-purple-50 transition-colors">
              Fonctionnalités
            </a>
            <a href="#" className="block text-sm text-gray-700 hover:text-purple-600 px-3 py-2 rounded-lg hover:bg-purple-50 transition-colors">
              Documentation
            </a>

            {/* Liens connectés */}
            {isLoggedIn && (
              <>
                <div className="pt-2 pb-1">
                  <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Mon espace</p>
                </div>
                {authLinks.map(link => (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                      isActive(link.path)
                        ? 'bg-purple-50 text-purple-600'
                        : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600'
                    }`}
                  >
                    <link.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{link.label}</span>
                    {isActive(link.path) && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500" />
                    )}
                  </button>
                ))}
              </>
            )}

            {/* Sélecteur de langue */}
            <div className="pt-2 border-t border-gray-200">
              <p className="px-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Langue</p>
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { onLangChange(lang.code); setShowMobileMenu(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                    language === lang.code ? 'bg-purple-50 text-purple-600' : 'text-gray-700 hover:bg-purple-50'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="text-sm">{lang.name}</span>
                </button>
              ))}
            </div>

            {/* Bouton connexion / déconnexion */}
            <div className="pt-2 border-t border-gray-200">
              {isLoggedIn ? (
                <>
                  <div className="px-3 py-3 mb-1 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Utilisateur'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Se déconnecter</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="w-full px-4 py-3 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Commencer gratuitement
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
