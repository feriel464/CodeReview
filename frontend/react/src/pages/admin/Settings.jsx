import React, { useState } from 'react';
import { 
  Save, RotateCcw, Edit2, Globe, Type, FileText, Sparkles, 
  Image as ImageIcon, AlertCircle, CheckCircle, X, Search
} from 'lucide-react';

export default function SettingsPage() {
  const [activeLanguage, setActiveLanguage] = useState('fr');
  const [editingField, setEditingField] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveNotification, setShowSaveNotification] = useState(false);

  // État initial des textes de l'interface (correspond aux textes actuels)
  const [interfaceTexts, setInterfaceTexts] = useState({
    fr: {
      // Navigation
      features: 'Fonctionnalités',
      pricing: 'Tarifs',
      docs: 'Documentation',
      start: 'Commencer',
      
      // Hero Section
      hero: 'Revue de code,',
      heroHighlight: 'Instantanément',
      heroDesc: 'Optimisé par une IA qui comprend votre code. Détectez les erreurs, améliorez la qualité et générez la documentation automatiquement.',
      tryFree: 'Essayer gratuitement',
      
      // Input Methods
      uploadCode: 'Télécharger un fichier',
      pasteCode: 'Coller le code',
      uploadImage: 'Image',
      pasteCodeHere: 'Collez votre code ici...',
      selectLanguage: 'Sélectionner le langage',
      analyze: 'Analyser',
      clear: 'Effacer',
      uploadImageHere: 'Télécharger une image ici',
      dropHere: 'Déposez votre fichier ici',
      
      // Analysis
      analyzing: 'Analyse en cours...',
      analysisComplete: 'Analyse terminée',
      qualityScore: 'Score de qualité',
      improvements: 'Améliorations',
      smells: 'Code Smells',
      documentation: 'Documentation',
      
      // Features Section
      featuresTitle: 'Des milliers d\'outils en un',
      featuresDesc: 'CodeReview analyse automatiquement votre code et fournit des suggestions de haute qualité pour tous les langages de programmation.',
      
      // Features Cards
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
      
      // Stats Section
      stat1Number: '2000+',
      stat1Label: 'Outils IA',
      stat2Number: '10M+',
      stat2Label: 'Analyses',
      stat3Number: '100+',
      stat3Label: 'Langues',
      stat4Number: '24/7',
      stat4Label: 'Disponible',
      
      // CTA Section
      ctaTitle: 'Prêt à transformer votre code ?',
      ctaDesc: 'Rejoignez des milliers de développeurs qui utilisent CodeReview pour écrire un meilleur code.',
      ctaButton: 'Commencer gratuitement',
      
      // Footer
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
      footerCopyright: '© 2026 CodeReview. Tous droits réservés.',
    },
    en: {
      // Navigation
      features: 'Features',
      pricing: 'Pricing',
      docs: 'Documentation',
      start: 'Get Started',
      
      // Hero Section
      hero: 'Code Review,',
      heroHighlight: 'Instantly',
      heroDesc: 'Powered by AI that understands your code. Detect errors, improve quality, and generate documentation automatically.',
      tryFree: 'Try for Free',
      
      // Input Methods
      uploadCode: 'Upload File',
      pasteCode: 'Paste Code',
      uploadImage: 'Image',
      pasteCodeHere: 'Paste your code here...',
      selectLanguage: 'Select Language',
      analyze: 'Analyze',
      clear: 'Clear',
      uploadImageHere: 'Upload image here',
      dropHere: 'Drop your file here',
      
      // Analysis
      analyzing: 'Analyzing...',
      analysisComplete: 'Analysis Complete',
      qualityScore: 'Quality Score',
      improvements: 'Improvements',
      smells: 'Code Smells',
      documentation: 'Documentation',
      
      // Features Section
      featuresTitle: 'Thousands of tools in one',
      featuresDesc: 'CodeReview automatically analyzes your code and provides high-quality suggestions for all programming languages.',
      
      // Features Cards
      featureMultiLang: 'Multi-languages',
      featureMultiLangDesc: '20+ languages supported',
      featureBugDetection: 'Bug Detection',
      featureBugDetectionDesc: 'Find hidden errors',
      featureAutoDocs: 'Auto-docs',
      featureAutoDocsDesc: 'Automatic documentation',
      featureSecurity: 'Security',
      featureSecurityDesc: 'Vulnerability analysis',
      featureOptimization: 'Optimization',
      featureOptimizationDesc: 'Improved performance',
      featureMetrics: 'Metrics',
      featureMetricsDesc: 'Quality tracking',
      featureSpeed: 'Ultra-fast',
      featureSpeedDesc: 'Results in < 5s',
      featureCollaboration: 'Collaboration',
      featureCollaborationDesc: 'Easy teamwork',
      
      // Stats Section
      stat1Number: '2000+',
      stat1Label: 'AI Tools',
      stat2Number: '10M+',
      stat2Label: 'Analyses',
      stat3Number: '100+',
      stat3Label: 'Languages',
      stat4Number: '24/7',
      stat4Label: 'Available',
      
      // CTA Section
      ctaTitle: 'Ready to transform your code?',
      ctaDesc: 'Join thousands of developers using CodeReview to write better code.',
      ctaButton: 'Get Started Free',
      
      // Footer
      footerProduct: 'Product',
      footerProductFeatures: 'Features',
      footerProductPricing: 'Pricing',
      footerCompany: 'Company',
      footerCompanyAbout: 'About',
      footerCompanyContact: 'Contact',
      footerResources: 'Resources',
      footerResourcesDocs: 'Documentation',
      footerResourcesAPI: 'API',
      footerLegal: 'Legal',
      footerLegalPrivacy: 'Privacy',
      footerLegalTerms: 'Terms',
      footerCopyright: '© 2026 CodeReview. All rights reserved.',
    },
    ar: {
      // Navigation
      features: 'المميزات',
      pricing: 'الأسعار',
      docs: 'التوثيق',
      start: 'ابدأ',
      
      // Hero Section
      hero: 'مراجعة الكود،',
      heroHighlight: 'فوراً',
      heroDesc: 'مدعوم بالذكاء الاصطناعي الذي يفهم الكود الخاص بك. اكتشف الأخطاء، حسّن الجودة، وأنشئ التوثيق تلقائياً.',
      tryFree: 'جرب مجاناً',
      
      // Input Methods
      uploadCode: 'رفع ملف',
      pasteCode: 'لصق الكود',
      uploadImage: 'صورة',
      pasteCodeHere: 'الصق الكود هنا...',
      selectLanguage: 'اختر اللغة',
      analyze: 'تحليل',
      clear: 'مسح',
      uploadImageHere: 'تحميل صورة هنا',
      dropHere: 'أسقط ملفك هنا',
      
      // Analysis
      analyzing: 'جاري التحليل...',
      analysisComplete: 'اكتمل التحليل',
      qualityScore: 'نقاط الجودة',
      improvements: 'تحسينات',
      smells: 'مشاكل الكود',
      documentation: 'التوثيق',
      
      // Features Section
      featuresTitle: 'آلاف الأدوات في واحد',
      featuresDesc: 'يقوم CodeReview بتحليل الكود الخاص بك تلقائياً ويوفر اقتراحات عالية الجودة لجميع لغات البرمجة.',
      
      // Features Cards
      featureMultiLang: 'متعدد اللغات',
      featureMultiLangDesc: '20+ لغة مدعومة',
      featureBugDetection: 'اكتشاف الأخطاء',
      featureBugDetectionDesc: 'اعثر على الأخطاء المخفية',
      featureAutoDocs: 'توثيق تلقائي',
      featureAutoDocsDesc: 'توثيق تلقائي',
      featureSecurity: 'الأمان',
      featureSecurityDesc: 'تحليل الثغرات',
      featureOptimization: 'التحسين',
      featureOptimizationDesc: 'أداء محسّن',
      featureMetrics: 'المقاييس',
      featureMetricsDesc: 'تتبع الجودة',
      featureSpeed: 'سريع جداً',
      featureSpeedDesc: 'النتائج في < 5 ثوانٍ',
      featureCollaboration: 'التعاون',
      featureCollaborationDesc: 'عمل جماعي سهل',
      
      // Stats Section
      stat1Number: '2000+',
      stat1Label: 'أدوات الذكاء الاصطناعي',
      stat2Number: '10M+',
      stat2Label: 'تحليلات',
      stat3Number: '100+',
      stat3Label: 'لغات',
      stat4Number: '24/7',
      stat4Label: 'متاح',
      
      // CTA Section
      ctaTitle: 'هل أنت مستعد لتحويل الكود الخاص بك؟',
      ctaDesc: 'انضم إلى آلاف المطورين الذين يستخدمون CodeReview لكتابة كود أفضل.',
      ctaButton: 'ابدأ مجاناً',
      
      // Footer
      footerProduct: 'المنتج',
      footerProductFeatures: 'المميزات',
      footerProductPricing: 'الأسعار',
      footerCompany: 'الشركة',
      footerCompanyAbout: 'حول',
      footerCompanyContact: 'اتصل',
      footerResources: 'الموارد',
      footerResourcesDocs: 'التوثيق',
      footerResourcesAPI: 'API',
      footerLegal: 'القانوني',
      footerLegalPrivacy: 'الخصوصية',
      footerLegalTerms: 'الشروط',
      footerCopyright: '© 2026 CodeReview. جميع الحقوق محفوظة.',
    }
  });

  // Organisation des sections pour l'affichage
  const sections = [
    {
      id: 'navigation',
      title: 'Navigation',
      icon: Globe,
      fields: ['features', 'pricing', 'docs', 'start']
    },
    {
      id: 'hero',
      title: 'Section Hero',
      icon: Sparkles,
      fields: ['hero', 'heroHighlight', 'heroDesc', 'tryFree']
    },
    {
      id: 'inputMethods',
      title: 'Méthodes d\'entrée',
      icon: FileText,
      fields: ['uploadCode', 'pasteCode', 'uploadImage', 'pasteCodeHere', 'selectLanguage', 'analyze', 'clear', 'uploadImageHere', 'dropHere']
    },
    {
      id: 'analysis',
      title: 'Analyse',
      icon: AlertCircle,
      fields: ['analyzing', 'analysisComplete', 'qualityScore', 'improvements', 'smells', 'documentation']
    },
    {
      id: 'features',
      title: 'Section Fonctionnalités',
      icon: Type,
      fields: [
        'featuresTitle', 'featuresDesc',
        'featureMultiLang', 'featureMultiLangDesc',
        'featureBugDetection', 'featureBugDetectionDesc',
        'featureAutoDocs', 'featureAutoDocsDesc',
        'featureSecurity', 'featureSecurityDesc',
        'featureOptimization', 'featureOptimizationDesc',
        'featureMetrics', 'featureMetricsDesc',
        'featureSpeed', 'featureSpeedDesc',
        'featureCollaboration', 'featureCollaborationDesc'
      ]
    },
    {
      id: 'stats',
      title: 'Statistiques',
      icon: ImageIcon,
      fields: ['stat1Number', 'stat1Label', 'stat2Number', 'stat2Label', 'stat3Number', 'stat3Label', 'stat4Number', 'stat4Label']
    },
    {
      id: 'cta',
      title: 'Call to Action',
      icon: Sparkles,
      fields: ['ctaTitle', 'ctaDesc', 'ctaButton']
    },
    {
      id: 'footer',
      title: 'Footer',
      icon: FileText,
      fields: [
        'footerProduct', 'footerProductFeatures', 'footerProductPricing',
        'footerCompany', 'footerCompanyAbout', 'footerCompanyContact',
        'footerResources', 'footerResourcesDocs', 'footerResourcesAPI',
        'footerLegal', 'footerLegalPrivacy', 'footerLegalTerms',
        'footerCopyright'
      ]
    }
  ];

  const handleEdit = (field, value) => {
    setInterfaceTexts(prev => ({
      ...prev,
      [activeLanguage]: {
        ...prev[activeLanguage],
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    // Ici, vous enverriez les données au backend
    console.log('Sauvegarde des modifications:', interfaceTexts);
    setHasChanges(false);
    setShowSaveNotification(true);
    setTimeout(() => setShowSaveNotification(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les textes ?')) {
      // Recharger les valeurs par défaut
      setHasChanges(false);
    }
  };

  const getFieldLabel = (fieldKey) => {
    const labels = {
      // Navigation
      features: 'Fonctionnalités',
      pricing: 'Tarifs',
      docs: 'Documentation',
      start: 'Bouton Commencer',
      
      // Hero
      hero: 'Titre Hero (partie 1)',
      heroHighlight: 'Titre Hero (partie 2 - surligné)',
      heroDesc: 'Description Hero',
      tryFree: 'Bouton Essai Gratuit',
      
      // Input Methods
      uploadCode: 'Télécharger un fichier',
      pasteCode: 'Coller le code',
      uploadImage: 'Image',
      pasteCodeHere: 'Placeholder zone de texte',
      selectLanguage: 'Sélectionner le langage',
      analyze: 'Bouton Analyser',
      clear: 'Bouton Effacer',
      uploadImageHere: 'Télécharger image',
      dropHere: 'Déposer fichier',
      
      // Analysis
      analyzing: 'Analyse en cours',
      analysisComplete: 'Analyse terminée',
      qualityScore: 'Score de qualité',
      improvements: 'Améliorations',
      smells: 'Code Smells',
      documentation: 'Documentation',
      
      // Features
      featuresTitle: 'Titre section',
      featuresDesc: 'Description section',
      featureMultiLang: 'Multi-langages (titre)',
      featureMultiLangDesc: 'Multi-langages (description)',
      featureBugDetection: 'Détection bugs (titre)',
      featureBugDetectionDesc: 'Détection bugs (description)',
      featureAutoDocs: 'Auto-docs (titre)',
      featureAutoDocsDesc: 'Auto-docs (description)',
      featureSecurity: 'Sécurité (titre)',
      featureSecurityDesc: 'Sécurité (description)',
      featureOptimization: 'Optimisation (titre)',
      featureOptimizationDesc: 'Optimisation (description)',
      featureMetrics: 'Métriques (titre)',
      featureMetricsDesc: 'Métriques (description)',
      featureSpeed: 'Vitesse (titre)',
      featureSpeedDesc: 'Vitesse (description)',
      featureCollaboration: 'Collaboration (titre)',
      featureCollaborationDesc: 'Collaboration (description)',
      
      // Stats
      stat1Number: 'Stat 1 (nombre)',
      stat1Label: 'Stat 1 (label)',
      stat2Number: 'Stat 2 (nombre)',
      stat2Label: 'Stat 2 (label)',
      stat3Number: 'Stat 3 (nombre)',
      stat3Label: 'Stat 3 (label)',
      stat4Number: 'Stat 4 (nombre)',
      stat4Label: 'Stat 4 (label)',
      
      // CTA
      ctaTitle: 'Titre CTA',
      ctaDesc: 'Description CTA',
      ctaButton: 'Bouton CTA',
      
      // Footer
      footerProduct: 'Produit (titre)',
      footerProductFeatures: 'Fonctionnalités',
      footerProductPricing: 'Tarifs',
      footerCompany: 'Entreprise (titre)',
      footerCompanyAbout: 'À propos',
      footerCompanyContact: 'Contact',
      footerResources: 'Ressources (titre)',
      footerResourcesDocs: 'Documentation',
      footerResourcesAPI: 'API',
      footerLegal: 'Légal (titre)',
      footerLegalPrivacy: 'Confidentialité',
      footerLegalTerms: 'Conditions',
      footerCopyright: 'Copyright',
    };
    return labels[fieldKey] || fieldKey;
  };

  const filteredSections = sections.map(section => ({
    ...section,
    fields: section.fields.filter(field => {
      const label = getFieldLabel(field).toLowerCase();
      const value = interfaceTexts[activeLanguage][field]?.toLowerCase() || '';
      return label.includes(searchQuery.toLowerCase()) || value.includes(searchQuery.toLowerCase());
    })
  })).filter(section => section.fields.length > 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
          Paramètres de l'interface
        </h1>
        <p className="text-base text-gray-600">
          Modifiez tous les textes de la page d'accueil pour chaque langue
        </p>
      </div>

      {/* Notification de sauvegarde */}
      {showSaveNotification && (
        <div className="fixed top-24 right-8 z-50 animate-fade-in">
          <div className="bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
            <CheckCircle className="w-6 h-6" />
            <span className="font-semibold">Modifications enregistrées avec succès !</span>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-6 mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex-1 w-full lg:w-auto">
            {/* Language Selector */}
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-700">Langue :</span>
              <div className="flex gap-2">
                {[
                  { code: 'fr', name: 'Français', flag: '🇫🇷' },
                  { code: 'en', name: 'English', flag: '🇬🇧' },
                  { code: 'ar', name: 'العربية', flag: '🇸🇦' }
                ].map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setActiveLanguage(lang.code)}
                    className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                      activeLanguage === lang.code
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
            <button
              onClick={handleReset}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                hasChanges
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              Sauvegarder
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un champ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:bg-white transition-all outline-none"
          />
        </div>
      </div>

      {/* Sections d'édition */}
      <div className="space-y-6">
        {filteredSections.map((section) => (
          <div
            key={section.id}
            className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden"
          >
            {/* Section Header */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-gray-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-600">{section.fields.length} champs</p>
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="p-6 space-y-4">
              {section.fields.map((field) => (
                <div
                  key={field}
                  className="group bg-gray-50 rounded-xl p-4 border-2 border-gray-200 hover:border-purple-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <label className="font-semibold text-gray-700 text-sm">
                      {getFieldLabel(field)}
                    </label>
                    <button
                      onClick={() => setEditingField(editingField === field ? null : field)}
                      className="p-2 bg-white rounded-lg hover:bg-purple-100 transition-all border border-gray-300 hover:border-purple-500"
                    >
                      {editingField === field ? (
                        <X className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>

                  {editingField === field ? (
                    <div className="space-y-3">
                      <textarea
                        value={interfaceTexts[activeLanguage][field]}
                        onChange={(e) => handleEdit(field, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            setEditingField(null);
                            setHasChanges(true);
                          } else if (e.key === 'Escape') {
                            setEditingField(null);
                          }
                        }}
                        className="w-full px-4 py-3 bg-white rounded-lg border-2 border-purple-500 focus:border-purple-600 outline-none resize-none transition-all"
                        rows={3}
                        autoFocus
                        placeholder="Tapez votre texte ici... (Ctrl+Enter pour confirmer, Échap pour annuler)"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingField(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium text-sm flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Annuler
                        </button>
                        <button
                          onClick={() => {
                            setEditingField(null);
                            setHasChanges(true);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirmer
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 text-right">
                        💡 Astuce : <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+Enter</kbd> pour confirmer
                      </p>
                    </div>
                  ) : (
                    <div className="px-4 py-3 bg-white rounded-lg border border-gray-300 text-gray-900 min-h-[3rem] flex items-center">
                      {interfaceTexts[activeLanguage][field]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasChanges && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-amber-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce-slow">
            <AlertCircle className="w-6 h-6" />
            <span className="font-semibold">Vous avez des modifications non sauvegardées</span>
          </div>
        </div>
      )}
    </div>
  );
}