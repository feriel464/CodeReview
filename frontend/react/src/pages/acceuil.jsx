import React, { useState, useEffect } from 'react';
import { 
  Upload, Code, CheckCircle, AlertCircle, FileText, Zap, Shield, TrendingUp, 
  ArrowRight, Sparkles, Terminal, FileCode, Bug, BookOpen, Clock, Users, 
  Image as ImageIcon, FileUp, Keyboard, Globe, ChevronDown, X, Menu, Loader 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Configuration de l'API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function CodeReview() {
  // ========== ÉTATS DE BASE ==========
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState('improvements');
  const [scrollY, setScrollY] = useState(0);
  const [inputMethod, setInputMethod] = useState('code');
  const [language, setLanguage] = useState('fr');
  const [programmingLanguage, setProgrammingLanguage] = useState('python');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showProgrammingLangMenu, setShowProgrammingLangMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [floatingElements, setFloatingElements] = useState([]);
  const navigate = useNavigate();

  // ========== ÉTATS POUR LES TRADUCTIONS ==========
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);
  const [languages, setLanguages] = useState([]);

  // ========== NOUVEAUX ÉTATS POUR L'ANALYSE ==========
  const [analysisResult, setAnalysisResult] = useState(null);
  const [guestStatus, setGuestStatus] = useState(null);
  const [programmingLanguages, setProgrammingLanguages] = useState([]);
  const [error, setError] = useState(null);

  // Traductions par défaut (fallback)
  const defaultTranslations = {
    fr: {
      features: 'Fonctionnalités',
      pricing: 'Tarifs',
      docs: 'Documentation',
      start: 'Commencer',
      hero: 'Revue de code,',
      heroHighlight: 'Instantanément',
      heroDesc: 'Optimisé par une IA qui comprend votre code. Détectez les erreurs, améliorez la qualité et générez la documentation automatiquement.',
      tryFree: 'Essayer gratuitement',
      uploadCode: 'Télécharger un fichier',
      pasteCode: 'Coller le code',
      uploadImage: 'Image',
      pasteCodeHere: 'Collez votre code ici...',
      selectLanguage: 'Sélectionner le langage',
      analyze: 'Analyser',
      clear: 'Effacer',
      uploadImageHere: 'Télécharger une image ici',
      dropHere: 'Déposez votre fichier ici',
      analyzing: 'Analyse en cours...',
      analysisComplete: 'Analyse terminée',
      qualityScore: 'Score de qualité',
      improvements: 'Améliorations',
      smells: 'Code Smells',
      documentation: 'Documentation',
      featuresTitle: 'Des milliers d\'outils en un',
      featuresDesc: 'CodeReview analyse automatiquement votre code et fournit des suggestions de haute qualité pour tous les langages de programmation.',
      featureMultiLang: 'Multi-langages',
      featureMultiLangDesc: '20+ langages supportés',
      featureBugDetection: 'Détection bugs',
      featureBugDetectionDesc: 'Trouvez les erreurs cachées',
      featureAutoDocs: 'Auto-docs',
      featureAutoDocsDesc: 'Documentation automatique',
      featureSecurity: 'Sécurité',
      featureSecurityDesc: 'Analyse des vulnérabilités',
      featureOptimization: 'Optimisation',
      featureOptimizationDesc: 'Performances améliorées',
      featureMetrics: 'Métriques',
      featureMetricsDesc: 'Suivi de la qualité',
      featureSpeed: 'Ultra-rapide',
      featureSpeedDesc: 'Résultats en < 5s',
      featureCollaboration: 'Collaboration',
      featureCollaborationDesc: 'Travail d\'équipe facilité',
      stat1Number: '2000+',
      stat1Label: 'Outils IA',
      stat2Number: '10M+',
      stat2Label: 'Analyses',
      stat3Number: '100+',
      stat3Label: 'Langues',
      stat4Number: '24/7',
      stat4Label: 'Disponible',
      ctaTitle: 'Prêt à transformer votre code ?',
      ctaDesc: 'Rejoignez des milliers de développeurs qui utilisent CodeReview pour écrire un meilleur code.',
      ctaButton: 'Commencer gratuitement',
      footerProduct: 'Produit',
      footerProductFeatures: 'Fonctionnalités',
      footerProductPricing: 'Tarifs',
      footerCompany: 'Entreprise',
      footerCompanyAbout: 'À propos',
      footerCompanyContact: 'Contact',
      footerResources: 'Ressources',
      footerResourcesDocs: 'Documentation',
      footerResourcesAPI: 'API',
      footerLegal: 'Légal',
      footerLegalPrivacy: 'Confidentialité',
      footerLegalTerms: 'Conditions',
      footerCopyright: '© 2026 CodeReview. Tous droits réservés.'
    }
  };

  // ========== CHARGEMENT INITIAL ==========
  useEffect(() => {
    loadTranslations();
    loadLanguages();
    loadProgrammingLanguages();
    checkGuestStatus();
    
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    
    const elements = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 60 + 20,
      delay: Math.random() * 5,
      duration: Math.random() * 20 + 15
    }));
    setFloatingElements(elements);
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /**
   * Charger les traductions
   */
  const loadTranslations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/translations`);
      
      if (response.data.success) {
        setTranslations(response.data.data);
        console.log('✅ Traductions chargées');
      }
    } catch (err) {
      console.error('❌ Erreur traductions:', err);
      setTranslations(defaultTranslations);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Charger les langues disponibles (FR/EN/AR)
   */
  const loadLanguages = async () => {
    try {
      const response = await axios.get(`${API_URL}/translations/languages`);
      
      if (response.data.success) {
        const activeLanguages = response.data.languages
          .filter(lang => lang.is_active)
          .map(lang => ({
            code: lang.code,
            name: lang.name,
            flag: lang.flag
          }));
        setLanguages(activeLanguages);
      }
    } catch (err) {
      console.error('❌ Erreur langues:', err);
      setLanguages([
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'ar', name: 'العربية', flag: '🇸🇦' }
      ]);
    }
  };

  /**
   * Charger les langages de programmation depuis le backend
   */
  const loadProgrammingLanguages = async () => {
    try {
      const response = await axios.get(`${API_URL}/analyze/programming-languages`);
      
      if (response.data.success) {
        setProgrammingLanguages(response.data.languages);
        console.log('✅ Langages de programmation chargés:', response.data.languages);
      }
    } catch (err) {
      console.error('❌ Erreur langages programmation:', err);
      // Fallback
      setProgrammingLanguages([
        { code: 'python', name: 'Python', icon: '🐍' },
        { code: 'javascript', name: 'JavaScript', icon: '📜' },
        { code: 'typescript', name: 'TypeScript', icon: '💠' },
        { code: 'java', name: 'Java', icon: '☕' },
        { code: 'cpp', name: 'C++', icon: '⚡' },
        { code: 'csharp', name: 'C#', icon: '#️⃣' },
        { code: 'go', name: 'Go', icon: '🔷' },
        { code: 'rust', name: 'Rust', icon: '🦀' },
        { code: 'php', name: 'PHP', icon: '🐘' },
        { code: 'ruby', name: 'Ruby', icon: '💎' },
        { code: 'swift', name: 'Swift', icon: '🕊️' },
        { code: 'kotlin', name: 'Kotlin', icon: '🟣' }
      ]);
    }
  };

  /**
   * Vérifier le statut invité
   */
  const checkGuestStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) return; // Si connecté, pas besoin

      const response = await axios.get(`${API_URL}/analyze/guest-status`);
      if (response.data.success) {
        setGuestStatus(response.data);
        console.log('📊 Statut invité:', response.data);
      }
    } catch (err) {
      console.error('❌ Erreur statut invité:', err);
    }
  };

  /**
   * Fonction d'analyse du code
   */
  const handleAnalyze = async () => {
    const token = localStorage.getItem('token');
    
    // Vérifier si connecté pour upload/image
    if (!token && (inputMethod === 'upload' || inputMethod === 'image')) {
      alert('⚠️ Vous devez être connecté pour télécharger des fichiers ou des images.\n\nConnectez-vous pour accéder à cette fonctionnalité !');
      navigate('/login');
      return;
    }

    // Vérifier si du code est entré pour la méthode 'code'
    if (inputMethod === 'code' && !codeInput.trim()) {
      alert('⚠️ Veuillez entrer du code à analyser');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);

      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const response = await axios.post(
        `${API_URL}/analyze`,
        {
          code: codeInput,
          language: programmingLanguage,
          fileName: `code.${programmingLanguage}`
        },
        { headers }
      );

      if (response.data.success) {
        console.log('✅ Analyse réussie:', response.data);
        setAnalysisResult(response.data.data);
        
        // Mettre à jour le statut invité
        if (response.data.isGuest) {
          setGuestStatus({
            remaining: response.data.remainingAnalyses,
            limit: 3,
            currentCount: 3 - response.data.remainingAnalyses,
            hasReachedLimit: response.data.remainingAnalyses === 0
          });
        }

        // Simuler l'animation d'analyse
        setTimeout(() => {
          setIsAnalyzing(false);
          setShowResults(true);
        }, 2500);
      }

    } catch (error) {
      setIsAnalyzing(false);
      console.error('❌ Erreur analyse:', error);

      if (error.response?.data?.requiresAuth) {
        // Limite atteinte pour invité
        alert(`🚫 ${error.response.data.message}\n\n✨ Connectez-vous pour des analyses illimitées !`);
        navigate('/login');
      } else {
        const errorMsg = error.response?.data?.message || error.message;
        setError(`Erreur lors de l'analyse: ${errorMsg}`);
        alert(`❌ Erreur: ${errorMsg}`);
      }
    }
  };

  // Obtenir les traductions pour la langue active
  const t = translations[language] || defaultTranslations[language] || defaultTranslations.fr;

  // ========== AFFICHAGE DU CHARGEMENT ==========
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {floatingElements.map((el) => (
          <div
            key={el.id}
            className="absolute rounded-full opacity-10 animate-float-slow"
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: `${el.size}px`,
              height: `${el.size}px`,
              background: `linear-gradient(135deg, 
                ${['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'][el.id % 5]}, 
                ${['#A78BFA', '#F472B6', '#60A5FA', '#34D399', '#FBBF24'][el.id % 5]})`,
              animationDelay: `${el.delay}s`,
              animationDuration: `${el.duration}s`
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrollY > 50 ? 'bg-white/80 backdrop-blur-xl shadow-lg' : 'bg-white/50 backdrop-blur-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 animate-slide-in-left">
            <div className="relative group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-lg sm:rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
            </div>
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text">
              CodeReview
            </span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-700 hover:text-purple-600 transition-colors font-medium relative group">
              {t.features}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 group-hover:w-full transition-all duration-300" />
            </a>
           
            <a href="#" className="text-sm text-gray-700 hover:text-purple-600 transition-colors font-medium relative group">
              {t.docs}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 group-hover:w-full transition-all duration-300" />
            </a>
            
            {/* Language Selector */}
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
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setShowLanguageMenu(false);
                      }}
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
            
            <button onClick={() => navigate('/login')} className="px-5 py-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium">
              {t.start}
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden p-2 text-gray-700"
          >
            {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="lg:hidden bg-white border-t border-gray-200 animate-fade-in">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-sm text-gray-700 hover:text-purple-600 py-2">
                {t.features}
              </a>
              <a href="#" className="block text-sm text-gray-700 hover:text-purple-600 py-2">
                {t.docs}
              </a>
              <div className="pt-2 border-t border-gray-200">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 ${
                      language === lang.code ? 'bg-purple-50 text-purple-600' : 'text-gray-700'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span className="text-sm">{lang.name}</span>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => navigate('/login')}
                className="w-full px-5 py-2.5 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium"
              >
                {t.start}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full mb-4 sm:mb-6 animate-bounce-slow border border-purple-200">
              <Sparkles className="w-4 h-4 text-purple-600 animate-spin-slow" />
              <span className="text-xs sm:text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
                Propulsé par l'IA avancée
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight animate-slide-up">
              {t.hero}
              <br />
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text animate-gradient">
                {t.heroHighlight}
              </span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-6 sm:mb-10 leading-relaxed animate-fade-in px-4">
              {t.heroDesc}
            </p>
            <button 
              onClick={handleAnalyze}
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white rounded-xl hover:shadow-2xl transition-all font-semibold animate-pulse-button hover:scale-105"
            >
              {t.tryFree}
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Input Method Selector */}
          <div className="max-w-5xl mx-auto mb-6 sm:mb-8">
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
              {[
                { id: 'code', icon: Keyboard, label: t.pasteCode, color: 'pink' },
                { id: 'upload', icon: FileUp, label: t.uploadCode, color: 'purple' },
                { id: 'image', icon: ImageIcon, label: t.uploadImage, color: 'blue' }
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setInputMethod(method.id)}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all transform hover:scale-105 ${
                    inputMethod === method.id
                      ? `bg-gradient-to-r from-${method.color}-600 to-${method.color}-500 text-white shadow-lg`
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-400'
                  }`}
                >
                  <method.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{method.label}</span>
                </button>
              ))}
            </div>

            {/* Upload/Analysis Area */}
            {!showResults && !isAnalyzing && (
              <div className="animate-fade-in">
                {inputMethod === 'code' && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl border-2 border-pink-300 p-4 sm:p-8 shadow-xl">
                    {/* Programming Language Selector */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {t.selectLanguage}
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setShowProgrammingLangMenu(!showProgrammingLangMenu)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-pink-500 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {programmingLanguages.find(l => l.code === programmingLanguage)?.icon}
                            </span>
                            <span className="font-medium text-gray-700">
                              {programmingLanguages.find(l => l.code === programmingLanguage)?.name}
                            </span>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${showProgrammingLangMenu ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showProgrammingLangMenu && (
                          <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 max-h-64 overflow-y-auto animate-fade-in">
                            {programmingLanguages.map((lang) => (
                              <button
                                key={lang.code}
                                onClick={() => {
                                  setProgrammingLanguage(lang.code);
                                  setShowProgrammingLangMenu(false);
                                }}
                                className={`w-full px-4 py-2.5 text-left hover:bg-pink-50 transition-colors flex items-center gap-3 ${
                                  programmingLanguage === lang.code ? 'bg-pink-50 text-pink-600' : 'text-gray-700'
                                }`}
                              >
                                <span className="text-xl">{lang.icon}</span>
                                <span className="font-medium">{lang.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Code Textarea */}
                    <textarea
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      placeholder={t.pasteCodeHere}
                      className="w-full h-64 sm:h-96 p-4 sm:p-6 bg-gray-50 rounded-xl border border-gray-300 focus:border-pink-500 focus:ring-4 focus:ring-pink-100 outline-none font-mono text-xs sm:text-sm resize-none transition-all"
                    />
                    
                    <div className="flex justify-end mt-4 gap-2 sm:gap-3">
                      <button 
                        onClick={() => setCodeInput('')}
                        className="px-4 sm:px-6 py-2 sm:py-3 text-sm bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-medium"
                      >
                        {t.clear}
                      </button>
                      <button 
                        onClick={handleAnalyze}
                        className="px-6 sm:px-8 py-2 sm:py-3 text-sm bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl hover:shadow-xl transition-all font-medium hover:scale-105"
                      >
                        {t.analyze}
                      </button>
                    </div>
                  </div>
                )}

                {inputMethod === 'upload' && (
                  <div 
                    onClick={handleAnalyze}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl border-2 border-dashed border-purple-300 p-8 sm:p-16 text-center transition-all hover:border-purple-500 hover:bg-white hover:shadow-2xl cursor-pointer group"
                  >
                    <div className="mb-4 sm:mb-6 inline-block">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl sm:rounded-3xl shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-purple-600 group-hover:animate-bounce" />
                      </div>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">
                      {t.dropHere}
                    </h3>
                    <p className="text-xs sm:text-base text-gray-600 mb-4 sm:mb-6">
                      Python, JavaScript, TypeScript, Java, C++, Go...
                    </p>
                    <div className="px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl transition-all font-medium hover:scale-105 inline-block">
                      Sélectionner des fichiers
                    </div>
                  </div>
                )}

                {inputMethod === 'image' && (
                  <div 
                    onClick={handleAnalyze}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl border-2 border-dashed border-blue-300 p-8 sm:p-16 text-center transition-all hover:border-blue-500 hover:bg-white hover:shadow-2xl cursor-pointer group"
                  >
                    <div className="mb-4 sm:mb-6 inline-block">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl sm:rounded-3xl shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ImageIcon className="w-8 h-8 sm:w-12 sm:h-12 text-blue-600 group-hover:animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">
                      {t.uploadImageHere}
                    </h3>
                    <p className="text-xs sm:text-base text-gray-600 mb-4 sm:mb-6">
                      Screenshots, photos de code, diagrammes...
                    </p>
                    <div className="px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-xl transition-all font-medium hover:scale-105 inline-block">
                      Sélectionner une image
                    </div>
                  </div>
                )}
              </div>
            )}

            {isAnalyzing && (
              <div className="bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-purple-200 p-8 sm:p-16 text-center shadow-2xl animate-fade-in">
                <div className="mb-4 sm:mb-6 relative">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto">
                    <div className="w-full h-full border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-2xl font-semibold text-gray-900 mb-2">
                  {t.analyzing}
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Notre IA examine votre code en profondeur
                </p>
                <div className="mt-6 sm:mt-8 flex items-center justify-center gap-2">
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 sm:w-3 sm:h-3 rounded-full animate-bounce"
                        style={{
                          animationDelay: `${i * 0.1}s`,
                          background: `linear-gradient(135deg, ${['#8B5CF6', '#EC4899', '#3B82F6'][i % 3]}, ${['#A78BFA', '#F472B6', '#60A5FA'][i % 3]})`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Résultats d'analyse */}
            {showResults && analysisResult && (
              <div className="bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-purple-200 shadow-2xl overflow-hidden animate-scale-in">
                {/* Results Header */}
                <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-b border-green-200 p-4 sm:p-8">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg animate-bounce-once">
                        <CheckCircle className="w-6 h-6 sm:w-10 sm:h-10 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-3xl font-bold text-gray-900 mb-1">
                          {t.analysisComplete}
                        </h3>
                        <p className="text-xs sm:text-base text-gray-600">
                          Langage : <span className="font-semibold text-purple-600">{programmingLanguage}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 text-transparent bg-clip-text mb-1 animate-number-count">
                        {analysisResult.qualityScore}/100
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 font-medium">{t.qualityScore}</p>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 px-4 sm:px-8 bg-white/50 overflow-x-auto">
                  <div className="flex gap-4 sm:gap-8 min-w-max">
                    {[
                      { id: 'improvements', label: t.improvements, icon: Sparkles, color: 'purple' },
                      { id: 'smells', label: t.smells, icon: Bug, color: 'pink' },
                      { id: 'docs', label: t.documentation, icon: BookOpen, color: 'blue' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 py-3 sm:py-4 border-b-2 transition-all text-sm sm:text-base font-semibold whitespace-nowrap ${
                          activeTab === tab.id
                            ? `border-${tab.color}-600 text-${tab.color}-600`
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-4 sm:p-8">
                  {activeTab === 'improvements' && (
                    <div className="space-y-4 animate-fade-in">
                      {analysisResult.improvements.map((improvement, index) => (
                        <div key={index} className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:shadow-xl transition-all transform hover:scale-[1.02]">
                          <div className="flex gap-3 sm:gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                                <AlertCircle className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <h4 className="font-bold text-gray-900 text-sm sm:text-lg">{improvement.message}</h4>
                                <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-bold whitespace-nowrap">
                                  Ligne {improvement.line}
                                </span>
                              </div>
                              <p className="text-xs sm:text-base text-gray-700 mb-3 sm:mb-4">
                                {improvement.suggestion}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'smells' && (
                    <div className="space-y-4 animate-fade-in">
                      {analysisResult.codeSmells.map((smell, index) => (
                        <div key={index} className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                          <div className="flex gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-400 to-rose-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                              <Bug className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 mb-2 text-sm sm:text-lg">{smell.message}</h4>
                              <p className="text-xs sm:text-base text-gray-700 mb-3">
                                Variable : <code className="px-2 py-1 bg-white rounded text-xs font-mono border border-gray-300">{smell.variable}</code>
                              </p>
                              <span className="text-xs text-gray-500">Ligne {smell.line}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'docs' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                        <div className="flex gap-3 sm:gap-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                            <BookOpen className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 mb-2 text-sm sm:text-lg">Documentation générée automatiquement</h4>
                            <p className="text-xs sm:text-base text-gray-700 mb-4">
                              Couverture : <span className="font-bold text-green-600">{analysisResult.documentation.coverage}%</span>
                            </p>
                            <div className="space-y-2">
                              {analysisResult.documentation.missingDocs.map((doc, index) => (
                                <div key={index} className="text-xs sm:text-sm text-gray-600">
                                  • {doc.suggestion} (ligne {doc.line})
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="border-t-2 border-gray-200 p-4 sm:p-8 bg-gradient-to-r from-purple-50 to-pink-50">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button className="flex-1 px-6 py-3 sm:py-4 text-sm sm:text-base bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white rounded-xl hover:shadow-2xl transition-all font-semibold shadow-lg hover:scale-105">
                      ✨ Appliquer les corrections
                    </button>
                    <button 
                      onClick={() => {
                        setShowResults(false);
                        setAnalysisResult(null);
                        setCodeInput('');
                      }}
                      className="px-6 py-3 sm:py-4 text-sm sm:text-base border-2 border-gray-300 text-gray-700 rounded-xl hover:border-purple-600 hover:text-purple-600 transition-all font-semibold hover:scale-105"
                    >
                      Nouvelle analyse
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Indicateur de statut invité */}
            {!localStorage.getItem('token') && guestStatus && !showResults && (
              <div className="mt-6 bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-center animate-fade-in">
                <p className="text-sm text-amber-800 mb-2">
                  <strong>Mode Invité :</strong> {guestStatus.remaining} analyse{guestStatus.remaining > 1 ? 's' : ''} restante{guestStatus.remaining > 1 ? 's' : ''} sur {guestStatus.limit}
                </p>
                {guestStatus.remaining === 0 ? (
                  <p className="text-xs text-amber-700 mb-3">
                    ⚠️ Limite atteinte ! Connectez-vous pour continuer.
                  </p>
                ) : null}
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm text-purple-600 hover:text-purple-700 font-semibold underline"
                >
                  Connectez-vous pour des analyses illimitées ✨
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section - Inchangé */}
      <section id="features" className="py-12 sm:py-16 md:py-20 bg-white/50 backdrop-blur-sm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              {t.featuresTitle?.split(' ').slice(0, -2).join(' ')} <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text">{t.featuresTitle?.split(' ').slice(-2).join(' ')}</span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto px-4">
              {t.featuresDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                icon: <Terminal className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />,
                title: t.featureMultiLang,
                description: t.featureMultiLangDesc,
                gradient: 'from-purple-500 to-purple-600'
              },
              {
                icon: <Bug className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />,
                title: t.featureBugDetection,
                description: t.featureBugDetectionDesc,
                gradient: 'from-pink-500 to-pink-600'
              },
              {
                icon: <FileText className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />,
                title: t.featureAutoDocs,
                description: t.featureAutoDocsDesc,
                gradient: 'from-blue-500 to-blue-600'
              },
              {
                icon: <Shield className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />,
                title: t.featureSecurity,
                description: t.featureSecurityDesc,
                gradient: 'from-green-500 to-green-600'
              },
              {
                icon: <Zap className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />,
                title: t.featureOptimization,
                description: t.featureOptimizationDesc,
                gradient: 'from-yellow-500 to-orange-600'
              },
              {
                icon: <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />,
                title: t.featureMetrics,
                description: t.featureMetricsDesc,
                gradient: 'from-indigo-500 to-indigo-600'
              },
              {
                icon: <Clock className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />,
                title: t.featureSpeed,
                description: t.featureSpeedDesc,
                gradient: 'from-cyan-500 to-cyan-600'
              },
              {
                icon: <Users className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />,
                title: t.featureCollaboration,
                description: t.featureCollaborationDesc,
                gradient: 'from-rose-500 to-rose-600'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all group cursor-pointer transform hover:scale-105 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br ${feature.gradient} rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 text-white group-hover:scale-110 transition-transform shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1 sm:mb-2">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section - Inchangé */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white animate-float-slow"
              style={{
                width: `${Math.random() * 100 + 50}px`,
                height: `${Math.random() * 100 + 50}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${Math.random() * 10 + 10}s`
              }}
            />
          ))}
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            {[
              { number: t.stat1Number, label: t.stat1Label },
              { number: t.stat2Number, label: t.stat2Label },
              { number: t.stat3Number, label: t.stat3Label },
              { number: t.stat4Number, label: t.stat4Label }
            ].map((stat, index) => (
              <div key={index} className="group cursor-pointer animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-2 group-hover:scale-110 transition-transform">
                  {stat.number}
                </div>
                <div className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-purple-100">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Inchangé */}
      <section className="py-12 sm:py-16 md:py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 animate-slide-up px-4">
            {t.ctaTitle?.split(' ').slice(0, -3).join(' ')} <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text">{t.ctaTitle?.split(' ').slice(-3).join(' ')}</span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-6 sm:mb-10 animate-fade-in px-4">
            {t.ctaDesc}
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-10 py-3 sm:py-5 text-sm sm:text-base md:text-lg bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white rounded-xl sm:rounded-2xl hover:shadow-2xl transition-all font-bold animate-pulse-button hover:scale-110"
          >
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            {t.ctaButton}
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </section>

      {/* Footer - Inchangé */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div>
              <h3 className="font-bold text-sm sm:text-base mb-3 sm:mb-4 text-purple-400">{t.footerProduct}</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">{t.footerProductFeatures}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t.footerProductPricing}</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base mb-3 sm:mb-4 text-pink-400">{t.footerCompany}</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">{t.footerCompanyAbout}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t.footerCompanyContact}</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base mb-3 sm:mb-4 text-blue-400">{t.footerResources}</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">{t.footerResourcesDocs}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t.footerResourcesAPI}</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base mb-3 sm:mb-4 text-green-400">{t.footerLegal}</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">{t.footerLegalPrivacy}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t.footerLegalTerms}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 sm:pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Terminal className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="font-bold text-lg sm:text-xl">CodeReview</span>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm text-center md:text-right">
              {t.footerCopyright}
            </p>
          </div>
        </div>
      </footer>

      {/* Styles CSS */}
      <style jsx>{`
        @keyframes float-slow {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-30px) translateX(20px) rotate(120deg);
          }
          66% {
            transform: translateY(20px) translateX(-20px) rotate(240deg);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes bounce-once {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
        
        @keyframes pulse-button {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(139, 92, 246, 0);
          }
        }
        
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes number-count {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-float-slow {
          animation: float-slow 20s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
          animation-fill-mode: both;
        }
        
        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }
        
        .animate-slide-in-left {
          animation: slide-in-left 0.8s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        
        .animate-bounce-once {
          animation: bounce-once 0.6s ease-out;
        }
        
        .animate-pulse-button {
          animation: pulse-button 2s ease-out infinite;
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        
        .animate-number-count {
          animation: number-count 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}