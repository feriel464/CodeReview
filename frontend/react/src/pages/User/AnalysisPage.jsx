// src/pages/User/AnalysisPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  Terminal, CheckCircle, AlertCircle, Bug, BookOpen, Sparkles,
  ChevronDown, ArrowLeft, Upload, Keyboard, FileUp, Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import UserMenu from '../../components/UserMenu';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ✅ FIX: État initial défini en dehors du composant pour réutilisation
const INITIAL_ANALYSIS_RESULT = {
  qualityScore: 0,
  improvements: [],
  codeSmells: [],
  documentation: {
    coverage: 0,
    missingDocs: []
  }
};

export default function AnalysisPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // États
  const [inputMethod, setInputMethod] = useState('code');
  const [programmingLanguage, setProgrammingLanguage] = useState('python');
  const [showProgrammingLangMenu, setShowProgrammingLangMenu] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  // ✅ FIX: Utiliser l'état initial structuré (jamais null)
  const [analysisResult, setAnalysisResult] = useState(INITIAL_ANALYSIS_RESULT);
  const [activeTab, setActiveTab] = useState('improvements');
  const [programmingLanguages, setProgrammingLanguages] = useState([]);
  const [floatingElements, setFloatingElements] = useState([]);

  // Chargement initial
  useEffect(() => {
    loadProgrammingLanguages();
    
    const elements = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 40 + 15,
      delay: Math.random() * 5,
      duration: Math.random() * 15 + 10
    }));
    setFloatingElements(elements);
  }, []);

  const loadProgrammingLanguages = async () => {
    try {
      const response = await axios.get(`${API_URL}/analyze/programming-languages`);
      if (response.data.success) {
        setProgrammingLanguages(response.data.languages);
      }
    } catch (err) {
      console.error('❌ Erreur langages:', err);
      setProgrammingLanguages([
        { code: 'python', name: 'Python', icon: '🐍' },
        { code: 'javascript', name: 'JavaScript', icon: '📜' },
        { code: 'typescript', name: 'TypeScript', icon: '💠' }
      ]);
    }
  };

  const handleAnalyze = async () => {
    if (!codeInput.trim()) {
      alert('⚠️ Veuillez entrer du code à analyser');
      return;
    }

    try {
      setIsAnalyzing(true);

      const token = localStorage.getItem('token');
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
        // ✅ FIX: Fusionner avec l'état initial pour garantir toutes les propriétés
        const data = response.data.data;
        setAnalysisResult({
          qualityScore: data.qualityScore ?? 0,
          improvements: Array.isArray(data.improvements) ? data.improvements : [],
          codeSmells: Array.isArray(data.codeSmells) ? data.codeSmells : [],
          documentation: {
            coverage: data.documentation?.coverage ?? 0,
            missingDocs: Array.isArray(data.documentation?.missingDocs) ? data.documentation.missingDocs : []
          },
          metrics: data.metrics || {}
        });
        
        setTimeout(() => {
          setIsAnalyzing(false);
          setShowResults(true);
        }, 2500);
      } else {
        setIsAnalyzing(false);
        alert(response.data.message);
      }

    } catch (error) {
      setIsAnalyzing(false);
      console.error('❌ Erreur analyse:', error);

      if (error.response?.data?.languageMismatch) {
        const { message, detectedLanguageName, selectedLanguageName } = error.response.data;
        
        const userConfirm = window.confirm(
          `${message}\n\n💡 Voulez-vous changer le langage de ${selectedLanguageName} vers ${detectedLanguageName} ?`
        );

        if (userConfirm) {
          setProgrammingLanguage(error.response.data.detectedLanguage);
          alert(`✅ Langage changé vers ${detectedLanguageName}. Cliquez sur "Analyser" à nouveau.`);
        }
      } else {
        const errorMsg = error.response?.data?.message || error.message;
        alert(`❌ Erreur: ${errorMsg}`);
      }
    }
  };

  // ✅ FIX: Fonction de reset propre
  const handleReset = () => {
    setShowResults(false);
    setAnalysisResult(INITIAL_ANALYSIS_RESULT);
    setCodeInput('');
    setActiveTab('improvements');
  };

  // ✅ Helper pour obtenir la couleur du score
  const getScoreColor = (score) => {
    if (score >= 80) return 'from-green-600 to-emerald-600';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-rose-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 relative overflow-hidden">
      {/* Animated Background */}
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
                ${['#8B5CF6', '#EC4899', '#3B82F6', '#10B981'][el.id % 4]}, 
                ${['#A78BFA', '#F472B6', '#60A5FA', '#34D399'][el.id % 4]})`,
              animationDelay: `${el.delay}s`,
              animationDuration: `${el.duration}s`
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b-2 border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                  <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text">
                Analyse de Code
              </span>
            </div>
          </div>

          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Input Method Selector */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {[
              { id: 'code', icon: Keyboard, label: 'Coller le code', color: 'pink' },
              { id: 'upload', icon: FileUp, label: 'Télécharger un fichier', color: 'purple' }
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => setInputMethod(method.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all transform hover:scale-105 ${
                  inputMethod === method.id
                    ? `bg-gradient-to-r from-${method.color}-600 to-${method.color}-500 text-white shadow-lg`
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-400'
                }`}
              >
                <method.icon className="w-4 h-4" />
                {method.label}
              </button>
            ))}
          </div>

          {/* Analysis Area */}
          {!showResults && !isAnalyzing && (
            <div className="animate-fade-in">
              {inputMethod === 'code' && (
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-pink-300 p-8 shadow-xl">
                  {/* Language Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sélectionner le langage
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
                        <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 max-h-64 overflow-y-auto">
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
                    placeholder="Collez votre code ici..."
                    className="w-full h-96 p-6 bg-gray-50 rounded-xl border border-gray-300 focus:border-pink-500 focus:ring-4 focus:ring-pink-100 outline-none font-mono text-sm resize-none transition-all"
                  />
                  
                  <div className="flex justify-end mt-4 gap-3">
                    <button 
                      onClick={() => setCodeInput('')}
                      className="px-6 py-3 text-sm bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-medium"
                    >
                      Effacer
                    </button>
                    <button 
                      onClick={handleAnalyze}
                      className="px-8 py-3 text-sm bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl hover:shadow-xl transition-all font-medium hover:scale-105"
                    >
                      Analyser
                    </button>
                  </div>
                </div>
              )}

              {inputMethod === 'upload' && (
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-purple-300 p-16 text-center transition-all hover:border-purple-500 hover:bg-white hover:shadow-2xl cursor-pointer group">
                  <div className="mb-6 inline-block">
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-12 h-12 text-purple-600 group-hover:animate-bounce" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                    Déposez votre fichier ici
                  </h3>
                  <p className="text-base text-gray-600 mb-6">
                    Python, JavaScript, TypeScript, Java, C++, Go...
                  </p>
                  <button className="px-8 py-3 text-base bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl transition-all font-medium hover:scale-105">
                    Sélectionner des fichiers
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Analyzing State */}
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
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                Analyse en cours...
              </h3>
              <p className="text-base text-gray-600">
                Notre IA examine votre code en profondeur
              </p>
            </div>
          )}

          {/* Results */}
          {showResults && (
            <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-purple-200 shadow-2xl overflow-hidden animate-scale-in">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-b border-green-200 p-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-1">
                        Analyse terminée
                      </h3>
                      <p className="text-base text-gray-600">
                        Langage : <span className="font-semibold text-purple-600">{programmingLanguage}</span>
                      </p>
                    </div>
                  </div>
                  {/* ✅ FIX: Score affiché correctement avec couleur dynamique */}
                  <div className="text-center">
                    <div className={`text-5xl font-bold bg-gradient-to-r ${getScoreColor(analysisResult.qualityScore)} text-transparent bg-clip-text mb-1`}>
                      {analysisResult.qualityScore}/100
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Score de qualité</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 px-8 bg-white/50 overflow-x-auto">
                <div className="flex gap-8 min-w-max">
                  {[
                    { id: 'improvements', label: 'Améliorations', icon: Sparkles, count: analysisResult.improvements.length },
                    { id: 'smells', label: 'Code Smells', icon: Bug, count: analysisResult.codeSmells.length },
                    { id: 'docs', label: 'Documentation', icon: BookOpen, count: null }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 py-4 border-b-2 transition-all text-base font-semibold whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-purple-600 text-purple-600'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <tab.icon className="w-5 h-5" />
                      {tab.label}
                      {/* ✅ Badge avec compteur */}
                      {tab.count !== null && tab.count > 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-8">
                {/* Onglet Améliorations */}
                {activeTab === 'improvements' && (
                  <div className="space-y-4">
                    {analysisResult.improvements.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Sparkles className="w-12 h-12 mx-auto mb-3 text-green-400" />
                        <p className="text-lg font-semibold text-green-600">Aucune amélioration nécessaire !</p>
                        <p className="text-sm text-gray-500 mt-1">Votre code est déjà bien écrit 🎉</p>
                      </div>
                    ) : (
                      analysisResult.improvements.map((improvement, index) => (
                        <div key={index} className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6">
                          <div className="flex gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                                <AlertCircle className="w-7 h-7 text-white" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <h4 className="font-bold text-gray-900 text-lg">{improvement.message}</h4>
                                {improvement.line && (
                                  <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-bold whitespace-nowrap">
                                    Ligne {improvement.line}
                                  </span>
                                )}
                              </div>
                              <p className="text-base text-gray-700">
                                {improvement.suggestion}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Onglet Code Smells */}
                {activeTab === 'smells' && (
                  <div className="space-y-4">
                    {analysisResult.codeSmells.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Bug className="w-12 h-12 mx-auto mb-3 text-green-400" />
                        <p className="text-lg font-semibold text-green-600">Aucun code smell détecté !</p>
                        <p className="text-sm text-gray-500 mt-1">Votre code est propre 🧹</p>
                      </div>
                    ) : (
                      analysisResult.codeSmells.map((smell, index) => (
                        <div key={index} className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-6">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-rose-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                              <Bug className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 mb-2 text-lg">{smell.message}</h4>
                              {smell.variable && (
                                <p className="text-base text-gray-700 mb-3">
                                  Variable : <code className="px-2 py-1 bg-white rounded text-xs font-mono border border-gray-300">{smell.variable}</code>
                                </p>
                              )}
                              {smell.line && (
                                <span className="text-xs text-gray-500">Ligne {smell.line}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Onglet Documentation */}
                {activeTab === 'docs' && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <BookOpen className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-2 text-lg">Documentation générée automatiquement</h4>
                        <p className="text-base text-gray-700 mb-4">
                          Couverture : <span className="font-bold text-green-600">{analysisResult.documentation?.coverage ?? 0}%</span>
                        </p>
                        {/* ✅ Barre de progression de la couverture */}
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${analysisResult.documentation?.coverage ?? 0}%` }}
                          />
                        </div>
                        <div className="space-y-2">
                          {(analysisResult.documentation?.missingDocs || []).map((doc, index) => (
                            <div key={index} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-amber-500 mt-0.5">⚠️</span>
                              <span>{doc.suggestion} {doc.line ? `(ligne ${doc.line})` : ''}</span>
                            </div>
                          ))}
                          {(analysisResult.documentation?.missingDocs || []).length === 0 && (
                            <p className="text-sm text-green-600 font-medium">✅ Documentation complète !</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="border-t-2 border-gray-200 p-8 bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="flex-1 px-6 py-4 text-base bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white rounded-xl hover:shadow-2xl transition-all font-semibold shadow-lg hover:scale-105">
                    ✨ Appliquer les corrections
                  </button>
                  {/* ✅ FIX: Utiliser handleReset() au lieu de setAnalysisResult(null) */}
                  <button 
                    onClick={handleReset}
                    className="px-6 py-4 text-base border-2 border-gray-300 text-gray-700 rounded-xl hover:border-purple-600 hover:text-purple-600 transition-all font-semibold hover:scale-105"
                  >
                    Nouvelle analyse
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          33% { transform: translateY(-30px) translateX(20px) rotate(120deg); }
          66% { transform: translateY(20px) translateX(-20px) rotate(240deg); }
        }
        .animate-float-slow { animation: float-slow 20s ease-in-out infinite; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-scale-in { animation: scale-in 0.5s ease-out; }
      `}</style>
    </div>
  );
}
