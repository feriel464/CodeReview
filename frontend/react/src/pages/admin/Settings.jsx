import React, { useState, useEffect } from 'react';
import { 
  Save, RotateCcw, Edit2, Globe, Type, FileText, Sparkles, 
  Image as ImageIcon, AlertCircle, CheckCircle, X, Search, Loader
} from 'lucide-react';
import axios from 'axios';

// Configuration de l'API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function SettingsPage() {
  // ========== ÉTATS ==========
  const [activeLanguage, setActiveLanguage] = useState('fr');
  const [editingField, setEditingField] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [interfaceTexts, setInterfaceTexts] = useState({});
  const [originalTexts, setOriginalTexts] = useState({}); // Pour le reset
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [modifiedFields, setModifiedFields] = useState(new Set());

  // ========== CHARGEMENT INITIAL ==========
  useEffect(() => {
    loadTranslations();
    loadLanguages();
  }, []);

  /**
   * Charger toutes les traductions depuis le backend
   */
  const loadTranslations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_URL}/translations`);
      
      if (response.data.success) {
        setInterfaceTexts(response.data.data);
        setOriginalTexts(JSON.parse(JSON.stringify(response.data.data))); // Deep copy
        console.log('✅ Traductions chargées:', response.data.data);
      }
    } catch (err) {
      console.error('❌ Erreur chargement traductions:', err);
      setError('Impossible de charger les traductions. Vérifiez que le serveur est démarré.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Charger la liste des langues disponibles
   */
  const loadLanguages = async () => {
    try {
      const response = await axios.get(`${API_URL}/translations/languages`);
      
      if (response.data.success) {
        // Mapper les langues avec leurs drapeaux
        const languagesWithFlags = response.data.languages.map(lang => ({
          ...lang,
          displayName: lang.name,
          displayFlag: lang.flag
        }));
        setLanguages(languagesWithFlags);
      }
    } catch (err) {
      console.error('❌ Erreur chargement langues:', err);
    }
  };

  /**
   * Gérer l'édition d'un champ
   */
  const handleEdit = (field, value) => {
    setInterfaceTexts(prev => ({
      ...prev,
      [activeLanguage]: {
        ...prev[activeLanguage],
        [field]: value
      }
    }));
    
    // Marquer comme modifié
    setModifiedFields(prev => new Set([...prev, `${activeLanguage}:${field}`]));
    setHasChanges(true);
  };

  /**
   * Sauvegarder toutes les modifications
   */
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Préparer les données à envoyer (seulement les champs modifiés)
      const changedTranslations = {};
      
      modifiedFields.forEach(key => {
        const [lang, field] = key.split(':');
        if (!changedTranslations[lang]) {
          changedTranslations[lang] = {};
        }
        changedTranslations[lang][field] = interfaceTexts[lang][field];
      });

      // Envoyer une requête pour chaque langue modifiée
      const savePromises = Object.entries(changedTranslations).map(([lang, translations]) =>
        axios.put(`${API_URL}/translations/bulk`, {
          languageCode: lang,
          translations
        })
      );

      const results = await Promise.all(savePromises);
      
      console.log('✅ Résultats sauvegarde:', results);

      // Réinitialiser les états
      setHasChanges(false);
      setModifiedFields(new Set());
      setOriginalTexts(JSON.parse(JSON.stringify(interfaceTexts)));
      
      // Afficher la notification
      setShowSaveNotification(true);
      setTimeout(() => setShowSaveNotification(false), 3000);

    } catch (err) {
      console.error('❌ Erreur sauvegarde:', err);
      setError('Erreur lors de la sauvegarde: ' + (err.response?.data?.message || err.message));
      alert('Erreur lors de la sauvegarde: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Réinitialiser tous les textes
   */
  const handleReset = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les textes aux dernières valeurs sauvegardées ?')) {
      setInterfaceTexts(JSON.parse(JSON.stringify(originalTexts)));
      setHasChanges(false);
      setModifiedFields(new Set());
      setEditingField(null);
    }
  };

  // ========== CONFIGURATION DES SECTIONS ==========
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

  // ========== FILTRAGE ==========
  const filteredSections = sections.map(section => ({
    ...section,
    fields: section.fields.filter(field => {
      const label = getFieldLabel(field).toLowerCase();
      const value = interfaceTexts[activeLanguage]?.[field]?.toLowerCase() || '';
      return label.includes(searchQuery.toLowerCase()) || value.includes(searchQuery.toLowerCase());
    })
  })).filter(section => section.fields.length > 0);

  // ========== AFFICHAGE DU CHARGEMENT ==========
  if (loading && Object.keys(interfaceTexts).length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-semibold">Chargement des traductions...</p>
          <p className="text-gray-500 text-sm mt-2">Connexion au serveur...</p>
        </div>
      </div>
    );
  }

  // ========== AFFICHAGE DES ERREURS ==========
  if (error && Object.keys(interfaceTexts).length === 0) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2 text-center">Erreur de connexion</h2>
          <p className="text-red-700 mb-4 text-center">{error}</p>
          <button
            onClick={loadTranslations}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold"
          >
            Réessayer
          </button>
          <p className="text-xs text-red-600 mt-4 text-center">
            Assurez-vous que le serveur backend est démarré sur http://localhost:5000
          </p>
        </div>
      </div>
    );
  }

  // ========== RENDER PRINCIPAL ==========
  return (
    <div className="animate-fade-in min-h-screen bg-gray-50 p-4 lg:p-8">
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

      {/* Erreur de sauvegarde */}
      {error && (
        <div className="fixed top-24 right-8 z-50 animate-fade-in">
          <div className="bg-red-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
            <AlertCircle className="w-6 h-6" />
            <div>
              <p className="font-semibold">Erreur de sauvegarde</p>
              <p className="text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-4">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-6 mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex-1 w-full lg:w-auto">
            {/* Language Selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <Globe className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-700">Langue :</span>
              <div className="flex gap-2 flex-wrap">
                {languages.length > 0 ? (
                  languages.filter(l => l.is_active).map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setActiveLanguage(lang.code)}
                      className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                        activeLanguage === lang.code
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="mr-2">{lang.displayFlag}</span>
                      {lang.displayName}
                    </button>
                  ))
                ) : (
                  // Fallback si les langues ne sont pas encore chargées
                  [
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
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${
                hasChanges
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                hasChanges && !saving
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Sauvegarder
                </>
              )}
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
              {section.fields.map((field) => {
                const isModified = modifiedFields.has(`${activeLanguage}:${field}`);
                
                return (
                  <div
                    key={field}
                    className={`group rounded-xl p-4 border-2 transition-all ${
                      isModified 
                        ? 'bg-amber-50 border-amber-300' 
                        : 'bg-gray-50 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <label className="font-semibold text-gray-700 text-sm">
                          {getFieldLabel(field)}
                        </label>
                        {isModified && (
                          <span className="px-2 py-1 bg-amber-500 text-white text-xs rounded-full font-medium">
                            Modifié
                          </span>
                        )}
                      </div>
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
                          value={interfaceTexts[activeLanguage]?.[field] || ''}
                          onChange={(e) => handleEdit(field, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              setEditingField(null);
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
                            onClick={() => setEditingField(null)}
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
                        {interfaceTexts[activeLanguage]?.[field] || ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Indicateur de modifications */}
      {hasChanges && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-amber-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
            <AlertCircle className="w-6 h-6" />
            <span className="font-semibold">
              {modifiedFields.size} modification{modifiedFields.size > 1 ? 's' : ''} non sauvegardée{modifiedFields.size > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}