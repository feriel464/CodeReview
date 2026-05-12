import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, Code, CheckCircle, AlertCircle, FileText, Zap, Shield, TrendingUp,
  ArrowRight, Sparkles, Terminal, FileCode, Bug, BookOpen, Clock, Users,
  Image as ImageIcon, FileUp, Keyboard, Globe, ChevronDown, X, Menu,
  LogOut, User, LayoutDashboard, Settings, ShieldAlert, Lock, AlertTriangle,
  Copy, Check, WandSparkles, MessageCircle, Send, Paperclip
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../src/hooks/useAuth';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API_URL          = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const SECURITY_API_URL = import.meta.env.VITE_SECURITY_API_URL || 'http://localhost:8000';

const INITIAL_RESULT = {
  qualityScore:  0,
  improvements:  [],
  codeSmells:    [],
  documentation: { coverage: null, missingDocs: [] },
  metrics:       {},
  vulnerabilities: [],
};

// ─── Mapping sévérité ─────────────────────────────────────────────────────────
const SEVERITY_MAP = {
  none:     'info',
  low:      'low',
  medium:   'medium',
  high:     'high',
  critical: 'critical',
};

const CWE_MAP = {
  sql_injection:     'CWE-89',
  xss:               'CWE-79',
  exposed_secret:    'CWE-798',
  command_injection: 'CWE-78',
  path_traversal:    'CWE-22',
  safe:              null,
};

const TYPE_LABELS = {
  sql_injection:     'SQL Injection',
  xss:               'Cross-Site Scripting (XSS)',
  exposed_secret:    'Secret / Credential exposé',
  command_injection: 'Command Injection',
  path_traversal:    'Path Traversal',
  safe:              'Aucune vulnérabilité',
};

const FIX_MAP = {
  sql_injection:     'Utilisez des requêtes préparées (parameterized queries) avec des placeholders `?` au lieu de concaténer les variables directement dans la requête SQL.',
  xss:               "Échappez toujours les données utilisateur avant de les insérer dans le DOM. Utilisez `textContent` au lieu de `innerHTML`, ou une bibliothèque de sanitisation.",
  exposed_secret:    "Ne stockez jamais de secrets dans le code source. Utilisez des variables d'environnement (.env) ou un gestionnaire de secrets (Vault, AWS Secrets Manager).",
  command_injection: "Évitez `shell=True` avec des entrées utilisateur. Utilisez `subprocess.run()` avec une liste d'arguments, ou validez strictement les entrées.",
  path_traversal:    "Validez et normalisez les chemins de fichiers. Utilisez `os.path.realpath()` et vérifiez que le chemin est dans le répertoire autorisé.",
};

// Mapping extension → langage de programmation
const EXTENSION_TO_LANGUAGE = {
  py:   'python',
  js:   'javascript',
  ts:   'typescript',
  jsx:  'javascript',
  tsx:  'typescript',
  java: 'java',
  c:    'cpp',
  cpp:  'cpp',
  cc:   'cpp',
  h:    'cpp',
  cs:   'csharp',
  go:   'go',
  rs:   'rust',
  php:  'php',
  rb:   'ruby',
};

// ─── Analyse vulnérabilités via FastAPI ───────────────────────────────────────
async function analyzeVulnerabilities(code, language) {
  try {
    // ✅ Appel via backend Railway, plus de VITE_SECURITY_API_URL
    const response = await fetch(`${API_URL}/security/analyze`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code, language }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error('API returned success=false');

    const isVulnerable    = data.vulnerable;
    const vulnerabilities = (data.vulnerabilities || []).map((vuln, i) => {
      const severity = SEVERITY_MAP[vuln.severity] || 'info';
      return {
        id:          `VULN-${String(i + 1).padStart(3, '0')}`,
        type:        TYPE_LABELS[vuln.type] || vuln.type,
        severity,
        title:       TYPE_LABELS[vuln.type] || vuln.type,
        description: `${TYPE_LABELS[vuln.type] || vuln.type} détectée avec ${vuln.confidence}% de confiance`,
        fix:         FIX_MAP[vuln.type]  || 'Corrigez la vulnérabilité identifiée.',
        cwe:         CWE_MAP[vuln.type]  || null,
        confidence:  vuln.confidence,
        lines:       vuln.vulnerable_lines || [],
      };
    });

    let securityScore = 100;
    if (isVulnerable && vulnerabilities.length > 0) {
      const severityPenalty = { critical: 60, high: 45, medium: 30, low: 15, info: 5 };
      const worstPenalty    = Math.max(...vulnerabilities.map(v => severityPenalty[v.severity] || 0));
      const avgConfidence   = vulnerabilities.reduce((s, v) => s + v.confidence, 0) / vulnerabilities.length;
      securityScore = Math.max(0, Math.round(100 - worstPenalty - (avgConfidence * 0.2)));
    }

    return {
      vulnerabilities,
      securityScore,
      summary: isVulnerable
        ? `${vulnerabilities.length} vulnérabilité(s) détectée(s)`
        : 'Aucune vulnérabilité détectée',
      rawData: data,
    };

  } catch (e) {
    console.error('Vuln analysis error:', e);
    return {
      vulnerabilities: [],
      securityScore:   null,
      summary:         'Service de sécurité indisponible',
      error:           e.message,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function CodeReview() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isLoggedIn = !!user;
  const resultsRef = useRef(null);

  // ── UI states ──────────────────────────────────────────────────────────────
  const [scrollY, setScrollY]                       = useState(0);
  const [floatingElements, setFloatingElements]     = useState([]);
  const [language, setLanguage]                     = useState('fr');

  // ── Analyse states ─────────────────────────────────────────────────────────
  const [inputMethod, setInputMethod]               = useState('code');
  const [programmingLanguage, setProgrammingLanguage] = useState('python');
  const [showProgrammingLangMenu, setShowProgrammingLangMenu] = useState(false);
  const [codeInput, setCodeInput]                   = useState('');
  const [isAnalyzing, setIsAnalyzing]               = useState(false);
  const [showResults, setShowResults]               = useState(false);
  const [analysisResult, setAnalysisResult]         = useState(INITIAL_RESULT);
  const [activeTab, setActiveTab]                   = useState('improvements');
  const [vulnResult, setVulnResult]                 = useState(null);

  // ── Image states ───────────────────────────────────────────────────────────
  const [selectedImage, setSelectedImage]           = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);
  const [imageAnalysisData, setImageAnalysisData]   = useState(null);

  // ── Data states ────────────────────────────────────────────────────────────
  const [programmingLanguages, setProgrammingLanguages] = useState([]);
  const [languages, setLanguages]                   = useState([]);
  const [translations, setTranslations]             = useState({});
  const [loading, setLoading]                       = useState(true);
  const [guestStatus, setGuestStatus]               = useState(null);

  // ── Apply corrections states  ──────────────────────────────────────────────
  const [showCorrectionModal, setShowCorrectionModal]   = useState(false);
  const [isApplyingCorrections, setIsApplyingCorrections] = useState(false);
  const [correctionResult, setCorrectionResult]         = useState(null);
  const [correctionTab, setCorrectionTab]               = useState('code');
  const [codeCopied, setCodeCopied]                     = useState(false);
  const [docResult, setDocResult]       = useState(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);

  // ── Chat states ────────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen]           = useState(false);
  const [chatMessages, setChatMessages]   = useState([]);
  const [chatInput, setChatInput]         = useState('');
  const [chatSessionId, setChatSessionId] = useState(null);
  const [chatLoading, setChatLoading]     = useState(false);
  const [chatIndexing, setChatIndexing]   = useState(false);
  const [chatFunctions, setChatFunctions] = useState([]);
  const [chatClasses, setChatClasses]     = useState([]);
  const chatEndRef                        = useRef(null);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadAll();
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll);
    const els = Array.from({ length: 15 }, (_, i) => ({
      id:       i,
      x:        Math.random() * 100,
      y:        Math.random() * 100,
      size:     Math.random() * 60 + 20,
      delay:    Math.random() * 5,
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
    } catch { }
  }

  // ── Chat handlers ──────────────────────────────────────────────────────────
  const handleChatFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setChatIndexing(true);
    setChatMessages([]);
    setChatSessionId(null);
    setChatFunctions([]);
    setChatClasses([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token    = localStorage.getItem('token');
      const headers  = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(
        `${API_URL}/chat/index`,
        formData,
        { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.success) {
        setChatSessionId(response.data.session_id);
        setChatFunctions(response.data.functions || []);
        setChatClasses(response.data.classes || []);
        setChatMessages([{
          role: 'assistant',
          content: `✅ **${file.name}** indexé avec succès !\n\n📦 **${response.data.chunks_count} chunks** analysés\n🔧 **Fonctions :** ${(response.data.functions || []).slice(0, 5).join(', ')}${response.data.functions?.length > 5 ? '...' : ''}\n\nPosez vos questions sur le code !`
        }]);
      }
    } catch (error) {
      setChatMessages([{
        role: 'assistant',
        content: '❌ Erreur lors de l\'indexation. Vérifiez que le fichier est un .py ou .zip valide.'
      }]);
    } finally {
      setChatIndexing(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !chatSessionId || chatLoading) return;

    const question = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: question }]);
    setChatLoading(true);

    try {
      const token   = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(
        `${API_URL}/chat/ask`,
        { session_id: chatSessionId, question },
        { headers, timeout: 120000 }
      );

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.answer,
        chunks: response.data.chunks_used,
        source: response.data.source
      }]);
    } catch (error) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Erreur lors de la génération de la réponse. Réessayez.'
      }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  // ── Analyse principale ─────────────────────────────────────────────────────
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
      setVulnResult(null);

      const token   = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [response, vulnData] = await Promise.all([
        axios.post(
          `${API_URL}/analyze`,
          { code: codeInput, language: programmingLanguage, fileName: `code.${programmingLanguage}` },
          { headers }
        ),
        analyzeVulnerabilities(codeInput, programmingLanguage),
      ]);

      if (response.data.success) {
        const data = response.data.data;
        setAnalysisResult({
          qualityScore:  data.qualityScore ?? 0,
          improvements:  Array.isArray(data.improvements) ? data.improvements : [],
          codeSmells:    Array.isArray(data.codeSmells)   ? data.codeSmells   : [],
          documentation: {
            coverage:    data.documentation?.coverage    ?? 0,
            missingDocs: Array.isArray(data.documentation?.missingDocs) ? data.documentation.missingDocs : [],
          },
          metrics: data.metrics || {},
        });
        setVulnResult(vulnData);

        // Lance la doc en arrière-plan (non bloquant)
        setIsLoadingDoc(true);
        setDocResult(null);
        axios.post(
          `${API_URL}/analyze/document`,
          { code: codeInput, language: programmingLanguage },
          { headers }
        ).then(r => {
          if (r.data.success) setDocResult(r.data.functions);
        }).catch(console.error)
          .finally(() => setIsLoadingDoc(false));

        if (!isLoggedIn && response.data.remainingAnalyses !== undefined) {
          setGuestStatus(prev => ({
            ...prev,
            remaining:       response.data.remainingAnalyses,
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

  // ── Apply corrections ──────────────────────────────────────────────────────
  const handleApplyCorrections = async () => {
    if (!codeInput.trim()) {
      alert('⚠️ Aucun code à corriger.');
      return;
    }

    const totalProblems =
      (analysisResult.improvements?.length  || 0) +
      (analysisResult.codeSmells?.length    || 0) +
      (vulnResult?.vulnerabilities?.length  || 0);

    if (totalProblems === 0) {
      alert('✅ Aucun problème détecté — votre code est déjà propre !');
      return;
    }

    try {
      setIsApplyingCorrections(true);
      setShowCorrectionModal(true);
      setCorrectionResult(null);
      setCorrectionTab('code');
      setCodeCopied(false);

      const token   = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(
        `${API_URL}/analyze/apply-corrections`,
        {
          code:            codeInput,
          language:        programmingLanguage,
          improvements:    analysisResult.improvements    || [],
          codeSmells:      analysisResult.codeSmells      || [],
          vulnerabilities: vulnResult?.vulnerabilities    || [],
        },
        { headers, timeout: 60000 }
      );

      if (response.data.success) {
        setCorrectionResult(response.data);
      }

    } catch (error) {
      console.error('❌ applyCorrections:', error);
      setShowCorrectionModal(false);

      if (error.response?.status === 429) {
        alert('⏳ Limite atteinte, réessayez dans un moment.');
      } else {
        alert(`❌ ${error.response?.data?.message || "Erreur lors de l'application des corrections"}`);
      }
    } finally {
      setIsApplyingCorrections(false);
    }
  };

  const handleReplaceCode = () => {
    if (!correctionResult?.correctedCode) return;
    setCodeInput(correctionResult.correctedCode);
    setShowCorrectionModal(false);
    setShowResults(false);
    setAnalysisResult(INITIAL_RESULT);
    setVulnResult(null);
    setCorrectionResult(null);
    setActiveTab('improvements');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyCode = () => {
    if (!correctionResult?.correctedCode) return;
    navigator.clipboard.writeText(correctionResult.correctedCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setShowResults(false);
    setAnalysisResult(INITIAL_RESULT);
    setVulnResult(null);
    setCodeInput('');
    setActiveTab('improvements');
    setSelectedImage(null);
    setSelectedImagePreview(null);
    setImageAnalysisData(null);
    setCorrectionResult(null);
    setDocResult(null);
    setIsLoadingDoc(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    logout();
    setShowResults(false);
    setAnalysisResult(INITIAL_RESULT);
    setVulnResult(null);
    setCodeInput('');
    checkGuestStatus();
  };

  // ── Image ──────────────────────────────────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) { alert('⚠️ Veuillez sélectionner une image valide'); return; }
      if (file.size > 10 * 1024 * 1024)   { alert("⚠️ L'image ne doit pas dépasser 10 MB"); return; }
      setSelectedImage(file);
      setSelectedImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage) { alert('⚠️ Veuillez sélectionner une image'); return; }
    if (!isLoggedIn)    { alert('⚠️ Connectez-vous pour analyser des images'); navigate('/login'); return; }

    try {
      setIsAnalyzing(true);
      setShowResults(false);
      setVulnResult(null);
      setImageAnalysisData(null);

      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('language', programmingLanguage);

      const token    = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/image/analyze-image`,
        formData,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
      );

      if (response.data.success) {
        const data = response.data;

        setImageAnalysisData({
          imageUrl:      data.imageUrl,
          ocrConfidence: data.ocrConfidence,
          extractedCode: data.extractedCode,
          correctedCode: data.correctedCode
        });

        setCodeInput(data.correctedCode);

        setAnalysisResult({
          qualityScore:  data.analysis.score,
          improvements:  data.analysis.improvements || [],
          codeSmells:    data.analysis.codeSmells   || [],
          documentation: { coverage: null, missingDocs: [] },
          metrics:       {},
          summary:       data.analysis.summary
        });

        // Lance la doc en arrière-plan avec le code extrait par OCR
        setIsLoadingDoc(true);
        setDocResult(null);
        axios.post(
          `${API_URL}/analyze/document`,
          { code: data.correctedCode, language: programmingLanguage },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        ).then(r => {
          if (r.data.success) setDocResult(r.data.functions);
        }).catch(console.error)
          .finally(() => setIsLoadingDoc(false));

        const secData         = data.analysis.security;
        const allImprovements = data.analysis.improvements || [];

        const vulnsFromML = (secData?.vulnerabilities || []).map((v, i) => ({
          id:          `VULN-${String(i + 1).padStart(3, '0')}`,
          type:        v.type,
          severity:    SEVERITY_MAP[v.severity] || 'info',
          title:       TYPE_LABELS[v.type] || v.type,
          description: v.vulnerable_lines?.[0]?.explanation || TYPE_LABELS[v.type] || v.type,
          fix:         FIX_MAP[v.type] || 'Corrigez la vulnérabilité.',
          cwe:         CWE_MAP[v.type] || null,
          confidence:  v.confidence,
          lines:       v.vulnerable_lines || [],
        }));

        const typeMap = {
          'SQL':      { type: 'sql_injection',    severity: 'critical' },
          'Secret':   { type: 'exposed_secret',   severity: 'high'     },
          'commande': { type: 'command_injection', severity: 'critical' },
          'XSS':      { type: 'xss',              severity: 'high'     },
        };

        const vulnsFromLocal = vulnsFromML.length === 0
          ? allImprovements
              .filter(imp => imp.severity === 'error')
              .map((imp, i) => {
                const matched = Object.entries(typeMap).find(([k]) => imp.message.includes(k));
                const { type, severity } = matched?.[1] ?? { type: 'exposed_secret', severity: 'medium' };
                return {
                  id:          `VULN-${String(i + 1).padStart(3, '0')}`,
                  type,
                  severity,
                  title:       TYPE_LABELS[type] || type,
                  description: imp.message,
                  fix:         FIX_MAP[type] || imp.suggestion || 'Corrigez la vulnérabilité.',
                  cwe:         CWE_MAP[type] || null,
                  confidence:  85,
                  lines: [{
                    line:        imp.line,
                    code:        (data.correctedCode || '').split('\n')[(imp.line || 1) - 1] || '',
                    explanation: imp.message,
                  }],
                };
              })
          : [];

        const finalVulns = vulnsFromML.length > 0 ? vulnsFromML : vulnsFromLocal;

        setVulnResult({
          vulnerabilities: finalVulns,
          securityScore:   finalVulns.length > 0 ? Math.max(0, 100 - finalVulns.length * 25) : 100,
          summary:         finalVulns.length > 0
            ? `${finalVulns.length} vulnérabilité(s) détectée(s) : ${finalVulns.map(v => v.title).join(', ')}`
            : 'Aucune vulnérabilité détectée',
        });

        setTimeout(() => {
          setIsAnalyzing(false);
          setShowResults(true);
          setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }, 2000);
      }

    } catch (error) {
      setIsAnalyzing(false);
      if      (error.response?.status === 400) alert(`❌ ${error.response.data.message || 'Image invalide ou aucun code détecté'}`);
      else if (error.response?.status === 503) alert('❌ Service OCR indisponible. Assurez-vous que le service Python tourne sur le port 5002.');
      else                                     alert("❌ Erreur lors de l'analyse de l'image");
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getScoreColor  = (s) => s >= 80 ? 'from-green-500 to-emerald-500' : s >= 60 ? 'from-yellow-500 to-orange-500' : 'from-red-500 to-rose-600';
  const getScoreBg     = (s) => s >= 80 ? 'from-green-50 via-emerald-50 to-teal-50 border-green-200' : s >= 60 ? 'from-yellow-50 via-orange-50 to-amber-50 border-orange-200' : 'from-red-50 via-rose-50 to-pink-50 border-red-200';

  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'critical': return { color: 'bg-red-100 text-red-800 border-red-300',         dot: 'bg-red-500',    badge: 'from-red-500 to-rose-600',      emoji: '🔴', label: 'Critique' };
      case 'high':     return { color: 'bg-orange-100 text-orange-800 border-orange-300', dot: 'bg-orange-500', badge: 'from-orange-500 to-red-500',    emoji: '🟠', label: 'Élevé' };
      case 'medium':   return { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', dot: 'bg-yellow-500', badge: 'from-yellow-500 to-orange-400', emoji: '🟡', label: 'Moyen' };
      case 'low':      return { color: 'bg-blue-100 text-blue-800 border-blue-300',       dot: 'bg-blue-400',   badge: 'from-blue-400 to-cyan-500',     emoji: '🔵', label: 'Faible' };
      default:         return { color: 'bg-gray-100 text-gray-700 border-gray-300',       dot: 'bg-gray-400',   badge: 'from-gray-400 to-gray-500',     emoji: '⚪', label: 'Info' };
    }
  };

  const getSecurityScoreColor = (score) =>
    score === null  ? 'from-gray-400 to-gray-500'
    : score >= 80   ? 'from-green-500 to-emerald-500'
    : score >= 50   ? 'from-yellow-500 to-orange-400'
    : 'from-red-500 to-rose-600';

  const vulnCount     = vulnResult?.vulnerabilities?.length || 0;
  const criticalCount = vulnResult?.vulnerabilities?.filter(v => v.severity === 'critical' || v.severity === 'high').length || 0;

  const totalProblemsCount =
    (analysisResult.improvements?.length || 0) +
    (analysisResult.codeSmells?.length   || 0) +
    (vulnResult?.vulnerabilities?.length || 0);

  const t           = translations[language] || defaultTranslations[language] || defaultTranslations.fr;
  const currentLang = programmingLanguages.find(l => l.code === programmingLanguage);

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

      {/* ── Fond animé ─────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {floatingElements.map((el) => (
          <div key={el.id} className="absolute rounded-full opacity-10 animate-float-slow" style={{
            left: `${el.x}%`, top: `${el.y}%`,
            width: `${el.size}px`, height: `${el.size}px`,
            background: `linear-gradient(135deg, ${['#8B5CF6','#EC4899','#3B82F6','#10B981','#F59E0B'][el.id % 5]}, ${['#A78BFA','#F472B6','#60A5FA','#34D399','#FBBF24'][el.id % 5]})`,
            animationDelay: `${el.delay}s`, animationDuration: `${el.duration}s`,
          }} />
        ))}
      </div>

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        languages={languages}
        language={language}
        onLangChange={setLanguage}
        scrollY={scrollY}
      />

      {/* ── HERO + ZONE D'ANALYSE ──────────────────────────── */}
      <section className="pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 px-4 sm:px-6 relative">
        <div className="max-w-7xl mx-auto relative z-10">

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
            {isLoggedIn && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full mb-4 animate-fade-in">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-700 font-medium">
                  Connecté en tant que <strong>{user?.name || user?.email}</strong> · Analyses illimitées
                </span>
              </div>
            )}
          </div>

          <div className="max-w-5xl mx-auto">
            {/* ── Sélection méthode ── */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
              {[
                { id: 'code',   icon: Keyboard,  label: t.pasteCode,   color: 'pink'   },
                { id: 'upload', icon: FileUp,     label: t.uploadCode,  color: 'purple' },
                { id: 'image',  icon: ImageIcon,  label: t.uploadImage, color: 'blue'   },
                { id: 'source', icon: FileCode, label: 'Fichier source', color: 'teal' },
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

                {/* Coller le code */}
                {inputMethod === 'code' && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl border-2 border-pink-300 p-4 sm:p-8 shadow-xl">
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

                {/* Upload PDF */}
                {inputMethod === 'upload' && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-purple-300 p-16 text-center hover:border-purple-500 transition-all">
                    <input type="file" accept=".pdf" id="pdf-upload" className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        setIsAnalyzing(true);
                        setShowResults(false);
                        setVulnResult(null);

                        try {
                          const formData = new FormData();
                          formData.append('pdf', file);
                          formData.append('language', programmingLanguage);

                          const token   = localStorage.getItem('token');
                          const headers = token ? { Authorization: `Bearer ${token}` } : {};

                          const response = await axios.post(
                            `${API_URL}/pdf/analyze-pdf`,
                            formData,
                            { headers, timeout: 120000 }
                          );

                          console.log('📦 Réponse PDF:', JSON.stringify(response.data, null, 2));

                          if (response.data.success) {
                            const {
                              data,
                              security,
                              extractedCode,
                              language: detectedLang
                            } = response.data;

                            setCodeInput(extractedCode || '');
                            setProgrammingLanguage(detectedLang || programmingLanguage);

                            setAnalysisResult({
                              qualityScore:  data?.qualityScore  ?? 0,
                              improvements:  data?.improvements  || [],
                              codeSmells:    data?.codeSmells    || [],
                              documentation: data?.documentation || { coverage: 0, missingDocs: [] },
                              metrics:       data?.metrics       || {},
                            });

                            const secVulns = security?.vulnerabilities || [];

                            setVulnResult({
                              vulnerabilities: secVulns.map((v, i) => ({
                                id:          v.id || `VULN-${String(i + 1).padStart(3, '0')}`,
                                type:        v.title || v.type || 'Vulnérabilité',
                                severity:    v.severity || 'medium',
                                title:       v.title || v.type || 'Vulnérabilité',
                                description: v.description || '',
                                fix:         v.fix || 'Corrigez la vulnérabilité.',
                                cwe:         v.cwe || null,
                                confidence:  typeof v.confidence === 'string'
                                              ? parseFloat(v.confidence)
                                              : (v.confidence || 0),
                                lines:       v.vulnerableLines || v.vulnerable_lines || [],
                              })),
                              securityScore: security?.score ?? 100,
                              summary: secVulns.length > 0
                                ? `${secVulns.length} vulnérabilité(s) détectée(s)`
                                : 'Aucune vulnérabilité détectée',
                            });

                            // Documentation en arrière-plan
                            setIsLoadingDoc(true);
                            setDocResult(null);
                            axios.post(
                              `${API_URL}/analyze/document`,
                              { code: extractedCode, language: detectedLang },
                              { headers }
                            ).then(r => {
                              if (r.data.success) setDocResult(r.data.functions);
                            }).catch(console.error)
                              .finally(() => setIsLoadingDoc(false));

                            setTimeout(() => {
                              setIsAnalyzing(false);
                              setShowResults(true);
                              setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                            }, 1500);
                          }
                        } catch (error) {
                          setIsAnalyzing(false);
                          console.error('❌ PDF error:', error.response?.data || error.message);
                          alert(`❌ ${error.response?.data?.message || 'Erreur analyse PDF'}`);
                        }
                      }}
                    />
                    <label htmlFor="pdf-upload" className="cursor-pointer block">
                      <div className="mb-6 inline-block">
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                          <Upload className="w-12 h-12 text-purple-600" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">Déposez votre PDF ici</h3>
                      <p className="text-base text-gray-600 mb-6">Documentation, rapport, livre technique contenant du code</p>
                      <span className="px-8 py-3 text-base bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl inline-block">
                        Sélectionner un PDF
                      </span>
                      <p className="text-xs text-gray-500 mt-4">Max 10 MB · PDF avec texte (pas scanné)</p>
                    </label>
                  </div>
                )}

                {/* Upload Image */}
                {inputMethod === 'image' && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-blue-300 p-8 sm:p-16 text-center hover:border-blue-500 hover:bg-white hover:shadow-2xl transition-all">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />

                    {!selectedImage ? (
                      <label htmlFor="image-upload" className="cursor-pointer block">
                        <div className="mb-6 inline-block">
                          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-3xl shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                            <ImageIcon className="w-12 h-12 text-blue-600 animate-pulse" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-semibold text-gray-900 mb-3">{t.uploadImageHere}</h3>
                        <p className="text-base text-gray-600 mb-6">Screenshots de code, photos de tableau blanc, diagrammes...</p>
                        <div className="px-8 py-3 text-base bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl inline-block hover:shadow-xl transition-all font-medium hover:scale-105">
                          📷 Sélectionner une image
                        </div>
                        <p className="text-xs text-gray-500 mt-4">Formats supportés : JPG, PNG, WebP · Max 10 MB</p>
                      </label>
                    ) : (
                      <div className="animate-fade-in">
                        <div className="mb-4">
                          <img src={selectedImagePreview} alt="Preview" className="max-w-full max-h-96 mx-auto rounded-xl shadow-2xl border-2 border-blue-200" />
                        </div>
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                          <div className="flex items-center justify-center gap-3 mb-2">
                            <ImageIcon className="w-5 h-5 text-blue-600" />
                            <p className="text-sm font-semibold text-blue-900">{selectedImage.name}</p>
                          </div>
                          <p className="text-xs text-blue-700">{(selectedImage.size / 1024).toFixed(2)} KB · {programmingLanguage.toUpperCase()}</p>
                        </div>
                        <div className="flex gap-3 justify-center">
                          <label htmlFor="image-upload" className="px-6 py-3 text-sm border-2 border-blue-300 text-blue-600 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all font-semibold cursor-pointer">
                            🔄 Changer l'image
                          </label>
                          <button onClick={handleAnalyzeImage} disabled={isAnalyzing}
                            className="px-8 py-3 text-sm bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-xl transition-all font-semibold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isAnalyzing ? '⏳ Analyse en cours...' : "🔍 Analyser l'image"}
                          </button>
                        </div>
                        <div className="mt-4 text-xs text-gray-500">
                          <p>💡 L'IA va extraire le code de l'image avec OCR, puis l'analyser pour détecter :</p>
                          <div className="flex gap-2 justify-center mt-2 flex-wrap">
                            <span className="px-2 py-1 bg-gray-100 rounded">Qualité du code</span>
                            <span className="px-2 py-1 bg-gray-100 rounded">Code smells</span>
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded">Vulnérabilités</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Fichier Source (.py, .js, .ts, .c ...) */}
                {inputMethod === 'source' && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-teal-300 p-8 sm:p-16 text-center hover:border-teal-500 hover:shadow-2xl transition-all">
                    <input
                      type="file"
                      accept=".py,.js,.ts,.jsx,.tsx,.java,.c,.cpp,.cc,.h,.cs,.go,.rs,.php,.rb"
                      className="hidden"
                      id="source-upload"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        if (file.size > 500 * 1024) {
                          alert('⚠️ Le fichier ne doit pas dépasser 500 KB');
                          return;
                        }

                        const ext = file.name.split('.').pop().toLowerCase();
                        const detectedLang = EXTENSION_TO_LANGUAGE[ext];
                        if (!detectedLang) {
                          alert(`⚠️ Extension .${ext} non supportée.\nExtensions acceptées : .py, .js, .ts, .java, .c, .cpp, .cs, .go, .rs, .php, .rb`);
                          return;
                        }

                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const sourceCode = event.target.result;

                          if (!sourceCode.trim()) {
                            alert('⚠️ Le fichier est vide');
                            return;
                          }

                          setCodeInput(sourceCode);
                          setProgrammingLanguage(detectedLang);

                          try {
                            setIsAnalyzing(true);
                            setShowResults(false);
                            setVulnResult(null);

                            const token   = localStorage.getItem('token');
                            const headers = token ? { Authorization: `Bearer ${token}` } : {};

                            const [response, vulnData] = await Promise.all([
                              axios.post(
                                `${API_URL}/analyze`,
                                { code: sourceCode, language: detectedLang, fileName: file.name },
                                { headers }
                              ),
                              analyzeVulnerabilities(sourceCode, detectedLang),
                            ]);

                            if (response.data.success) {
                              const data = response.data.data;
                              setAnalysisResult({
                                qualityScore:  data.qualityScore ?? 0,
                                improvements:  Array.isArray(data.improvements) ? data.improvements : [],
                                codeSmells:    Array.isArray(data.codeSmells)   ? data.codeSmells   : [],
                                documentation: {
                                  coverage:    data.documentation?.coverage    ?? 0,
                                  missingDocs: Array.isArray(data.documentation?.missingDocs) ? data.documentation.missingDocs : [],
                                },
                                metrics: data.metrics || {},
                              });
                              setVulnResult(vulnData);

                              setIsLoadingDoc(true);
                              setDocResult(null);
                              axios.post(
                                `${API_URL}/analyze/document`,
                                { code: sourceCode, language: detectedLang },
                                { headers }
                              ).then(r => {
                                if (r.data.success) setDocResult(r.data.functions);
                              }).catch(console.error)
                                .finally(() => setIsLoadingDoc(false));

                              if (!isLoggedIn && response.data.remainingAnalyses !== undefined) {
                                setGuestStatus(prev => ({
                                  ...prev,
                                  remaining:       response.data.remainingAnalyses,
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
                              alert(`⚠️ ${error.response.data.message}`);
                            } else if (error.response?.data?.requiresAuth) {
                              alert(`🚫 ${error.response.data.message}`);
                              navigate('/login');
                            } else {
                              alert(`❌ ${error.response?.data?.message || error.message}`);
                            }
                          }
                        };
                        reader.onerror = () => alert('❌ Impossible de lire le fichier');
                        reader.readAsText(file, 'UTF-8');
                      }}
                    />
                    <label htmlFor="source-upload" className="cursor-pointer block">
                      <div className="mb-6 inline-block">
                        <div className="w-24 h-24 bg-gradient-to-br from-teal-100 to-green-100 rounded-3xl shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                          <FileCode className="w-12 h-12 text-teal-600" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">Déposez votre fichier source ici</h3>
                      <p className="text-base text-gray-600 mb-4">
                        Fichiers Python, JavaScript, TypeScript, Java, C/C++, Go, Rust, PHP, Ruby...
                      </p>
                      <span className="px-8 py-3 text-base bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl inline-block hover:shadow-xl transition-all font-medium hover:scale-105">
                        Sélectionner un fichier source
                      </span>
                      <div className="flex flex-wrap justify-center gap-2 mt-4">
                        {['.py','js','.ts','.java','.c','.cpp','.go','.rs'].map(ext => (
                          <span key={ext} className="px-2 py-1 bg-teal-50 text-teal-700 rounded text-xs font-mono border border-teal-200">
                            {ext}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-3">Max 500 KB · Fichiers texte uniquement</p>
                    </label>
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
                <p className="text-base text-gray-600 mb-2">Notre IA examine votre code en profondeur</p>
                <p className="text-sm text-gray-500 mb-8 flex items-center justify-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  Scan de vulnérabilités de sécurité en cours…
                </p>
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

                {/* Score = 0 → code invalide */}
                {analysisResult.qualityScore === 0 && inputMethod !== 'image' ? (
                  <div className="bg-white/90 backdrop-blur-md rounded-3xl border-2 border-red-200 shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-red-50 via-rose-50 to-pink-50 border-b-2 border-red-200 p-8 sm:p-10 text-center">
                      <div className="text-7xl sm:text-8xl mb-4 animate-bounce-slow select-none">🤔</div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-red-700 mb-3">Oups… ce n'est pas vraiment du code !</h3>
                      <p className="text-base sm:text-lg text-red-500 font-medium mb-2">Score : <span className="font-bold text-red-700">0 / 100</span></p>
                      <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto leading-relaxed">
                        Ce que vous avez soumis contient des erreurs syntaxiques trop graves pour être analysé.
                      </p>
                    </div>
                    <div className="p-6 sm:p-8">
                      <div className="flex items-start gap-4 bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-6">
                        <span className="text-3xl flex-shrink-0">🚨</span>
                        <div>
                          <h4 className="font-bold text-red-700 mb-1 text-base sm:text-lg">Erreurs critiques détectées ({analysisResult.codeSmells.length})</h4>
                          <p className="text-sm text-red-600">Les problèmes suivants empêchent totalement l'exécution de ce code.</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {(analysisResult.improvements.length > 0 ? analysisResult.improvements : analysisResult.codeSmells).map((item, i) => (
                          <div key={i} className="flex items-start gap-4 bg-white border-2 border-red-100 rounded-xl p-4 hover:border-red-300 hover:shadow-md transition-all">
                            <div className="w-9 h-9 bg-gradient-to-br from-red-400 to-rose-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow">
                              <span className="text-white text-sm font-bold">{i + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                                <p className="font-semibold text-gray-900 text-sm sm:text-base">{item.message}</p>
                                {item.line && <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold whitespace-nowrap border border-red-200">Ligne {item.line}</span>}
                              </div>
                              {item.suggestion && (
                                <p className="text-xs sm:text-sm text-green-700 bg-green-50 rounded-lg px-3 py-1.5 mt-1 border border-green-200">💡 {item.suggestion}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="border-t-2 border-gray-200 p-6 sm:p-8 bg-gradient-to-r from-red-50 to-pink-50">
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <button onClick={handleReset}
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 sm:py-4 text-sm sm:text-base bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:shadow-xl transition-all font-semibold hover:scale-105">
                          <span>🔄</span> Réessayer avec du vrai code
                        </button>
                      </div>
                    </div>
                  </div>

                ) : (
                  /* ════════════════════════════════════════════════
                     CAS NORMAL : Score > 0
                     ════════════════════════════════════════════════ */
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
                                <span className="ml-3 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-medium">✓ Analyse complète</span>
                              )}
                            </p>
                            {vulnResult && (
                              <div className="mt-2 flex items-center gap-2">
                                {vulnCount === 0 ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-200">
                                    <Lock className="w-3 h-3" /> Aucune vulnérabilité
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold border border-red-200">
                                    <ShieldAlert className="w-3 h-3" /> {vulnCount} vulnérabilité{vulnCount > 1 ? 's' : ''} détectée{vulnCount > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
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

                    {/* ── Code extrait du PDF ── */}
                    {inputMethod === 'upload' && codeInput && (
                      <div className="p-4 sm:p-6 bg-gray-900 border-b border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-semibold text-green-400">Code extrait du PDF</span>
                            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                              {codeInput.split('\n').length} lignes · {programmingLanguage}
                            </span>
                          </div>
                        </div>
                        <pre className="text-gray-100 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                          {codeInput}
                        </pre>
                      </div>
                    )}

                    {/* Bannière image */}
                    {imageAnalysisData && (
                      <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-200">
                        <div className="flex flex-col sm:flex-row items-start gap-6">
                          <div className="flex-shrink-0">
                            <img src={imageAnalysisData.imageUrl} alt="Code analysé" className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-xl shadow-lg border-2 border-blue-300" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <ImageIcon className="w-5 h-5 text-blue-600" />
                              <h4 className="font-bold text-blue-900 text-lg">Analyse depuis image</h4>
                              <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-xs font-bold">OCR : {imageAnalysisData.ocrConfidence}% confiance</span>
                            </div>
                            {analysisResult.summary && (
                              <p className="text-sm text-blue-700 mb-3">📝 {analysisResult.summary}</p>
                            )}
                            <details className="mt-3">
                              <summary className="text-xs text-blue-600 font-semibold cursor-pointer hover:text-blue-700">📋 Voir le code brut extrait par OCR</summary>
                              <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto max-h-40 border border-gray-700">{imageAnalysisData.extractedCode}</pre>
                            </details>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tabs */}
                    <div className="border-b border-gray-200 px-6 sm:px-8 bg-white/50 overflow-x-auto">
                      <div className="flex gap-4 sm:gap-6 min-w-max">
                        {[
                          { id: 'improvements', label: t.improvements,   icon: Sparkles,    count: analysisResult.improvements.length },
                          { id: 'smells',       label: t.smells,         icon: Bug,         count: analysisResult.codeSmells.length },
                          { id: 'docs',         label: t.documentation,  icon: BookOpen,    count: null },
                          { id: 'security',     label: 'Vulnérabilités', icon: ShieldAlert, count: vulnCount, alert: criticalCount > 0 },
                        ].map(tab => (
                          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 py-4 border-b-2 transition-all text-sm sm:text-base font-semibold whitespace-nowrap ${
                              activeTab === tab.id
                                ? tab.id === 'security' ? 'border-red-500 text-red-600' : 'border-purple-600 text-purple-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}>
                            <tab.icon className={`w-4 h-4 sm:w-5 sm:h-5 pointer-events-none ${tab.alert ? 'text-red-500 animate-pulse' : ''}`} />
                            {tab.label}
                            {tab.count !== null && tab.count > 0 && (
                              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                tab.id === 'security'
                                  ? tab.alert ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                  : 'bg-purple-100 text-purple-700'
                              }`}>{tab.count}</span>
                            )}
                            {tab.id === 'security' && tab.count === 0 && vulnResult && (
                              <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Contenu tabs */}
                    <div className="p-6 sm:p-8">

                      {/* Tab Améliorations */}
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
                                    {imp.line && <span className="px-2.5 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-bold whitespace-nowrap">Ligne {imp.line}</span>}
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

                      {/* Tab Code Smells */}
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
                                    {smell.line && <span className="px-2.5 py-1 bg-red-200 text-red-800 rounded-full text-xs font-bold whitespace-nowrap">Ligne {smell.line}</span>}
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

                      {/* Tab Documentation */}
                      {activeTab === 'docs' && (
                        <div className="animate-fade-in space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
                              Explication IA des fonctions
                            </span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>

                          {isLoadingDoc ? (
                            <div className="text-center py-10">
                              <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
                              <p className="text-sm text-gray-600 font-medium">Génération de la documentation IA…</p>
                              <p className="text-xs text-gray-400 mt-1">L'IA analyse chaque fonction de votre code</p>
                            </div>
                          ) : !docResult || docResult.length === 0 ? (
                            <div className="text-center py-8">
                              <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                              <p className="text-sm text-gray-400">Aucune fonction détectée ou documentation indisponible</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-500">Chaque fonction expliquée en détail</p>
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold border border-purple-200">
                                  {docResult.length} fonction{docResult.length > 1 ? 's' : ''}
                                </span>
                              </div>
                              {docResult.map((fn, i) => (
                                <div key={i} className="border-2 border-gray-100 rounded-2xl overflow-hidden hover:border-purple-200 hover:shadow-md transition-all">
                                  <div className="flex flex-wrap items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
                                    <code className="text-sm font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
                                      {fn.name}
                                    </code>
                                    <span className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                      {fn.type || 'function'}
                                    </span>
                                    {fn.line && (
                                      <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                        Ligne {fn.line}
                                      </span>
                                    )}
                                  </div>
                                  <div className="p-5 space-y-4">
                                    {fn.description && (
                                      <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ce que fait cette fonction</p>
                                        <p className="text-sm text-gray-700 leading-relaxed">{fn.description}</p>
                                      </div>
                                    )}
                                    {fn.params && fn.params.length > 0 && (
                                      <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Paramètres</p>
                                        <div className="space-y-2">
                                          {fn.params.map((p, j) => (
                                            <div key={j} className="flex items-start gap-2">
                                              <code className="text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200 text-gray-700 whitespace-nowrap flex-shrink-0">
                                                {p.name}
                                              </code>
                                              {p.type && (
                                                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-200 whitespace-nowrap flex-shrink-0">
                                                  {p.type}
                                                </span>
                                              )}
                                              <span className="text-xs text-gray-500 leading-relaxed">{p.description}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {fn.returns && (
                                      <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Retourne</p>
                                        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-800">
                                          {fn.returns}
                                        </div>
                                      </div>
                                    )}
                                    {fn.example && (
                                      <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Exemple d'utilisation</p>
                                        <pre className="bg-gray-900 text-gray-100 rounded-xl px-4 py-3 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">
                                          {fn.example}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tab Vulnérabilités */}
                      {activeTab === 'security' && (
                        <div className="animate-fade-in">
                          {!vulnResult && (
                            <div className="text-center py-16">
                              <div className="w-16 h-16 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
                              <p className="text-gray-600 font-medium">Analyse de sécurité en cours…</p>
                            </div>
                          )}

                          {vulnResult && (
                            <>
                              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white flex items-center gap-4 shadow-xl">
                                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getSecurityScoreColor(vulnResult.securityScore)} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                                    <Lock className="w-7 h-7 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Score de sécurité</p>
                                    <p className={`text-4xl font-bold bg-gradient-to-r ${getSecurityScoreColor(vulnResult.securityScore)} text-transparent bg-clip-text`}>
                                      {vulnResult.securityScore !== null ? `${vulnResult.securityScore}/100` : 'N/A'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">{vulnResult.summary || 'Modèle RoBERTa local'}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 sm:w-64">
                                  {['critical','high','medium','low'].map(sev => {
                                    const cfg   = getSeverityConfig(sev);
                                    const count = vulnResult.vulnerabilities?.filter(v => v.severity === sev).length || 0;
                                    return (
                                      <div key={sev} className={`rounded-xl p-3 border-2 ${cfg.color} flex items-center gap-2`}>
                                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                                        <div>
                                          <p className="text-xs font-semibold">{cfg.label}</p>
                                          <p className="text-lg font-bold">{count}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {vulnCount === 0 ? (
                                <div className="text-center py-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200">
                                  <div className="text-6xl mb-4">🛡️</div>
                                  <p className="text-xl font-bold text-green-700 mb-2">Aucune vulnérabilité détectée !</p>
                                  <p className="text-sm text-green-600">Votre code semble sécurisé selon le modèle RoBERTa.</p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {vulnResult.vulnerabilities.map((vuln, i) => {
                                    const cfg = getSeverityConfig(vuln.severity);
                                    return (
                                      <div key={i} className={`border-2 ${cfg.color} rounded-2xl overflow-hidden hover:shadow-lg transition-all`}>
                                        <div className={`bg-gradient-to-r ${cfg.badge} p-4 flex items-start justify-between gap-3`}>
                                          <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <span className="text-2xl flex-shrink-0">{cfg.emoji}</span>
                                            <div className="min-w-0">
                                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="text-xs text-white/80 font-mono font-bold">{vuln.id || `VULN-${String(i+1).padStart(3,'0')}`}</span>
                                                <span className="px-2 py-0.5 bg-white/20 text-white rounded-full text-xs font-bold">{cfg.label}</span>
                                                {vuln.cwe && <span className="px-2 py-0.5 bg-black/20 text-white/90 rounded-full text-xs font-mono">{vuln.cwe}</span>}
                                              </div>
                                              <h4 className="font-bold text-white text-sm sm:text-base">{vuln.title}</h4>
                                              <p className="text-white/80 text-xs mt-0.5">{vuln.type}</p>
                                            </div>
                                          </div>
                                          {vuln.line && (
                                            <span className="px-3 py-1 bg-white/25 text-white rounded-full text-xs font-bold whitespace-nowrap border border-white/30 flex-shrink-0">
                                              Ligne {vuln.line}
                                            </span>
                                          )}
                                        </div>
                                        <div className="p-4 sm:p-5 bg-white space-y-3">
                                          {vuln.confidence && (
                                            <div className="flex items-center gap-3">
                                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                                <div className={`h-2 rounded-full bg-gradient-to-r ${cfg.badge} transition-all duration-700`} style={{ width: `${vuln.confidence}%` }} />
                                              </div>
                                              <span className="text-xs font-bold text-gray-600 whitespace-nowrap">{vuln.confidence}% confiance</span>
                                            </div>
                                          )}
                                          <div className="flex items-start gap-3">
                                            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</p>
                                              <p className="text-sm text-gray-700">{vuln.description}</p>
                                            </div>
                                          </div>
                                          {vuln.lines && vuln.lines.length > 0 && (
                                            <div>
                                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <span>📍</span> Lignes vulnérables détectées ({vuln.lines.length})
                                              </p>
                                              <div className="space-y-2 rounded-xl overflow-hidden border border-gray-200">
                                                {vuln.lines.map((vl, li) => (
                                                  <div key={li} className="bg-gray-950 text-gray-100">
                                                    <div className="flex items-center justify-between px-3 py-1.5 bg-red-900/40 border-b border-red-800/40">
                                                      <span className="text-xs font-mono font-bold text-red-300">⚠️ Ligne {vl.line}</span>
                                                    </div>
                                                    <div className="flex">
                                                      <span className="select-none px-3 py-2 text-xs font-mono text-gray-600 border-r border-gray-800 min-w-[2.5rem] text-right bg-gray-900">{vl.line}</span>
                                                      <pre className="px-3 py-2 text-xs font-mono text-red-300 overflow-x-auto flex-1 whitespace-pre-wrap break-all">{vl.code}</pre>
                                                    </div>
                                                    {vl.explanation && (
                                                      <div className="px-3 py-2 bg-amber-900/30 border-t border-amber-800/30">
                                                        <p className="text-xs text-amber-300"><strong>⚠️ Problème :</strong> {vl.explanation}</p>
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {vuln.fix && (
                                            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                                              <span className="text-green-600 flex-shrink-0 text-lg">💡</span>
                                              <div>
                                                <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1">Comment corriger</p>
                                                <p className="text-sm text-green-800">{vuln.fix}</p>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              <div className="mt-6 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <ShieldAlert className="w-5 h-5 text-slate-500 flex-shrink-0" />
                                <p className="text-xs text-slate-500">
                                  Analyse propulsée par votre <strong className="text-purple-600">modèle RoBERTa fine-tuné</strong> (ml-service:8000).
                                  Les résultats sont indicatifs — effectuez toujours un audit complet avant mise en production.
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ════════════════════════════════════════════════
                        ACTIONS — Bouton "Appliquer les corrections"
                        ════════════════════════════════════════════════ */}
                    <div className="border-t-2 border-gray-200 p-6 sm:p-8 bg-gradient-to-r from-purple-50 to-pink-50">
                      {totalProblemsCount > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                          <span className="text-gray-500 font-medium">Problèmes détectés :</span>
                          {analysisResult.improvements.length > 0 && (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-semibold border border-amber-200">
                              {analysisResult.improvements.length} amélioration{analysisResult.improvements.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {analysisResult.codeSmells.length > 0 && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-semibold border border-red-200">
                              {analysisResult.codeSmells.length} code smell{analysisResult.codeSmells.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {vulnCount > 0 && (
                            <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full font-semibold border border-rose-200">
                              {vulnCount} vulnérabilité{vulnCount > 1 ? 's' : ''}
                            </span>
                          )}
                          <span className="text-gray-400">→ CodeReview va tout corriger automatiquement</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <button
                          onClick={handleApplyCorrections}
                          disabled={isApplyingCorrections || totalProblemsCount === 0}
                          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 sm:py-4 text-sm sm:text-base rounded-xl transition-all font-semibold shadow-lg ${
                            totalProblemsCount === 0
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : isApplyingCorrections
                                ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white cursor-wait'
                                : 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white hover:shadow-2xl hover:scale-105'
                          }`}>
                          {isApplyingCorrections ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              CodeReview corrige votre code…
                            </>
                          ) : totalProblemsCount === 0 ? (
                            <>✅ Code déjà propre !</>
                          ) : (
                            <>✨ Appliquer les corrections ({totalProblemsCount})</>
                          )}
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

            {/* Badge invité */}
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
              { icon: <Terminal className="w-8 h-8" />,   title: t.featureMultiLang,     desc: t.featureMultiLangDesc,     gradient: 'from-purple-500 to-purple-600' },
              { icon: <Bug className="w-8 h-8" />,        title: t.featureBugDetection,  desc: t.featureBugDetectionDesc,  gradient: 'from-pink-500 to-pink-600' },
              { icon: <FileText className="w-8 h-8" />,   title: t.featureAutoDocs,      desc: t.featureAutoDocsDesc,      gradient: 'from-blue-500 to-blue-600' },
              { icon: <Shield className="w-8 h-8" />,     title: t.featureSecurity,      desc: t.featureSecurityDesc,      gradient: 'from-green-500 to-green-600' },
              { icon: <Zap className="w-8 h-8" />,        title: t.featureOptimization,  desc: t.featureOptimizationDesc,  gradient: 'from-yellow-500 to-orange-600' },
              { icon: <TrendingUp className="w-8 h-8" />, title: t.featureMetrics,       desc: t.featureMetricsDesc,       gradient: 'from-indigo-500 to-indigo-600' },
              { icon: <Clock className="w-8 h-8" />,      title: t.featureSpeed,         desc: t.featureSpeedDesc,         gradient: 'from-cyan-500 to-cyan-600' },
              { icon: <Users className="w-8 h-8" />,      title: t.featureCollaboration, desc: t.featureCollaborationDesc, gradient: 'from-rose-500 to-rose-600' },
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

      {/* ════════════════════════════════════════════════════════
          MODAL "APPLIQUER LES CORRECTIONS"
          ════════════════════════════════════════════════════════ */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-purple-200 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-in">

            {/* Header modal */}
            <div className="flex items-start justify-between gap-3 p-6 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  ✨ Corrections appliquées par CodeReview
                </h3>
                {correctionResult && (
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold border border-purple-200">
                      {correctionResult.appliedFixes?.length || 0} correction{(correctionResult.appliedFixes?.length || 0) > 1 ? 's' : ''}
                    </span>
                    {vulnCount > 0 && (
                      <span className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-200">
                        {vulnCount} vulnérabilité{vulnCount > 1 ? 's' : ''} corrigée{vulnCount > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200 capitalize">
                      {programmingLanguage}
                    </span>
                  </div>
                )}
              </div>
              <button onClick={() => setShowCorrectionModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1 rounded-lg hover:bg-gray-100 transition-all flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body modal */}
            <div className="flex-1 overflow-y-auto p-6">

              {isApplyingCorrections && (
                <div className="text-center py-16">
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="w-full h-full border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl">✨</span>
                    </div>
                  </div>
                  <p className="text-gray-800 font-semibold text-lg mb-1">CodeReview corrige votre code…</p>
                  <p className="text-sm text-gray-500">Analyse des {totalProblemsCount} problème{totalProblemsCount > 1 ? 's' : ''} et réécriture en cours</p>
                  <div className="flex items-center justify-center gap-1.5 mt-4">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}

              {!isApplyingCorrections && correctionResult && (
                <div className="space-y-5">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4">
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1.5">Résumé des corrections</p>
                    <p className="text-sm text-purple-900 leading-relaxed">{correctionResult.summary}</p>
                  </div>

                  <div className="flex gap-1 border-b border-gray-200">
                    {[
                      { id: 'code',  label: 'Code corrigé' },
                      { id: 'fixes', label: `Détail (${correctionResult.appliedFixes?.length || 0} fix${(correctionResult.appliedFixes?.length || 0) > 1 ? 'es' : ''})` },
                    ].map(tab => (
                      <button key={tab.id} onClick={() => setCorrectionTab(tab.id)}
                        className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                          correctionTab === tab.id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}>
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {correctionTab === 'code' && (
                    <div className="relative">
                      <div className="absolute top-3 right-3 z-10">
                        <button onClick={handleCopyCode}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            codeCopied
                              ? 'bg-green-500 text-white'
                              : 'bg-white/10 hover:bg-white/20 text-gray-300 border border-white/20'
                          }`}>
                          {codeCopied ? <><Check className="w-3 h-3" /> Copié !</> : <><Copy className="w-3 h-3" /> Copier</>}
                        </button>
                      </div>
                      <div className="bg-gray-950 rounded-2xl p-5 overflow-x-auto">
                        <pre className="text-gray-100 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words pr-20">
                          {correctionResult.correctedCode}
                        </pre>
                      </div>
                      <p className="text-xs text-gray-400 mt-2 text-right">
                        {correctionResult.correctedCode.split('\n').length} lignes · {programmingLanguage}
                      </p>
                    </div>
                  )}

                  {correctionTab === 'fixes' && (
                    <div className="space-y-3">
                      {(correctionResult.appliedFixes || []).length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p className="text-sm">Aucun détail de fix disponible.</p>
                        </div>
                      ) : correctionResult.appliedFixes.map((fix, i) => (
                        <div key={i} className="flex gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:border-purple-200 hover:shadow-sm transition-all">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-purple-600">Ligne {fix.line}</span>
                              <span className="text-gray-300">·</span>
                              <span className="text-xs text-gray-500 truncate">{fix.reason}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                              <div className="bg-red-50 border-l-2 border-red-400 rounded-r-xl p-2.5">
                                <p className="text-xs text-red-500 font-bold mb-1 flex items-center gap-1">
                                  <span className="w-3 h-3 inline-block rounded-full bg-red-400" /> Avant
                                </p>
                                <code className="text-xs text-red-700 font-mono break-words leading-relaxed block">
                                  {fix.original}
                                </code>
                              </div>
                              <div className="bg-green-50 border-l-2 border-green-400 rounded-r-xl p-2.5">
                                <p className="text-xs text-green-600 font-bold mb-1 flex items-center gap-1">
                                  <span className="w-3 h-3 inline-block rounded-full bg-green-400" /> Après
                                </p>
                                <code className="text-xs text-green-700 font-mono break-words leading-relaxed block">
                                  {fix.fixed}
                                </code>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer modal */}
            {!isApplyingCorrections && correctionResult && (
              <div className="p-5 border-t border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 rounded-b-3xl flex flex-col sm:flex-row gap-3 justify-end flex-shrink-0">
                <button onClick={() => setShowCorrectionModal(false)}
                  className="px-5 py-2.5 text-sm border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all font-medium">
                  Annuler
                </button>
                <button onClick={handleReplaceCode}
                  className="px-6 py-2.5 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold hover:scale-105 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Remplacer mon code
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          CHAT FLOTTANT
          ════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

        {/* Panel Chat */}
        {chatOpen && (
          <div className="w-96 h-[600px] bg-white rounded-3xl shadow-2xl border border-purple-200 flex flex-col overflow-hidden animate-scale-in">

            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Code Chat</p>
                  <p className="text-white/70 text-xs">
                    {chatSessionId
                      ? `${chatFunctions.length} fonctions · ${chatClasses.length} classes`
                      : 'Uploadez un fichier pour commencer'}
                  </p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)}
                className="text-white/80 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload zone */}
            {!chatSessionId && !chatIndexing && (
              <div className="p-4 border-b border-gray-100">
                <label className="flex items-center gap-3 p-3 bg-purple-50 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-100 transition-all">
                  <input
                    type="file"
                    accept=".py,.zip"
                    className="hidden"
                    onChange={handleChatFileUpload}
                  />
                  <Paperclip className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-purple-700">Uploader votre code</p>
                    <p className="text-xs text-purple-500">Fichier .py ou projet .zip</p>
                  </div>
                </label>
              </div>
            )}

            {/* Indexing loading */}
            {chatIndexing && (
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                  <div className="w-5 h-5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin flex-shrink-0" />
                  <p className="text-sm text-purple-700 font-medium">Indexation en cours...</p>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && !chatIndexing && (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                  <p className="text-sm text-gray-400">Uploadez un fichier .py ou .zip<br />et posez vos questions !</p>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    {msg.chunks && msg.chunks.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/20 flex flex-wrap gap-1">
                        {msg.chunks.map((c, j) => (
                          <span key={j} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                            {c.name} ({c.score})
                          </span>
                        ))}
                      </div>
                    )}
                    {msg.source && (
                      <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                        {msg.source === 'fine-tuned' ? '🤖 Modèle fine-tuné' : '🔄 DeepSeek API'}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100">
              {chatSessionId && (
                <div className="mb-2">
                  <label className="flex items-center gap-2 text-xs text-purple-600 cursor-pointer hover:text-purple-700">
                    <input type="file" accept=".py,.zip" className="hidden" onChange={handleChatFileUpload} />
                    <Paperclip className="w-3.5 h-3.5" />
                    Changer de fichier
                  </label>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                  placeholder={chatSessionId ? "Posez votre question..." : "Uploadez d'abord un fichier"}
                  disabled={!chatSessionId || chatLoading}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim() || !chatSessionId || chatLoading}
                  className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl flex items-center justify-center hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bouton flottant */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`relative w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all hover:scale-110 ${
            chatOpen
              ? 'bg-gray-600 hover:bg-gray-700'
              : 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:shadow-purple-500/50'
          }`}>
          {chatOpen
            ? <X className="w-6 h-6 text-white" />
            : <MessageCircle className="w-6 h-6 text-white" />
          }
          {!chatOpen && chatSessionId && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          )}
        </button>
      </div>

      {/* ── CSS ────────────────────────────────────────────── */}
      <style>{`
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

// ─── TRADUCTIONS PAR DÉFAUT ───────────────────────────────────────────────────
const defaultTranslations = {
  fr: {
    features:'Fonctionnalités', pricing:'Tarifs', docs:'Documentation', start:'Commencer',
    hero:'Revue de code,', heroHighlight:'Instantanément',
    heroDesc:"Optimisé par une IA qui comprend votre code. Détectez les erreurs, améliorez la qualité et générez la documentation automatiquement.",
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
