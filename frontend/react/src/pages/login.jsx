// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Terminal, Sparkles, Github, Chrome, Globe, ChevronDown, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState('fr');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [floatingElements, setFloatingElements] = useState([]);
  const navigate = useNavigate();

  const translations = {
    fr: {
      welcome: 'Bienvenue sur',
      login: 'Connexion',
      email: 'Adresse email',
      password: 'Mot de passe',
      forgotPassword: 'Mot de passe oublié ?',
      noAccount: 'Pas encore de compte ?',
      signupLink: 'Créer un compte',
      continueWith: 'Ou continuer avec',
      loginButton: 'Se connecter',
      features: [
        'Analyse illimitée de code',
        'Support multi-langages',
        'Documentation automatique',
        'Détection de vulnérabilités'
      ]
    },
    en: {
      welcome: 'Welcome to',
      login: 'Login',
      email: 'Email address',
      password: 'Password',
      forgotPassword: 'Forgot password?',
      noAccount: 'Don\'t have an account?',
      signupLink: 'Create account',
      continueWith: 'Or continue with',
      loginButton: 'Sign in',
      features: [
        'Unlimited code analysis',
        'Multi-language support',
        'Automatic documentation',
        'Vulnerability detection'
      ]
    },
    ar: {
      welcome: 'مرحباً بك في',
      login: 'تسجيل الدخول',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      forgotPassword: 'نسيت كلمة المرور؟',
      noAccount: 'ليس لديك حساب؟',
      signupLink: 'إنشاء حساب',
      continueWith: 'أو تابع مع',
      loginButton: 'تسجيل الدخول',
      features: [
        'تحليل غير محدود للكود',
        'دعم لغات متعددة',
        'توثيق تلقائي',
        'كشف الثغرات الأمنية'
      ]
    }
  };

  const t = translations[language];

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  ];

  useEffect(() => {
    const elements = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 60 + 20,
      delay: Math.random() * 5,
      duration: Math.random() * 20 + 15
    }));
    setFloatingElements(elements);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Logique de connexion ici
    console.log('Login:', { email, password });
    // Redirection après connexion
    // navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 relative overflow-hidden flex items-center justify-center p-4">
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

      {/* Language Selector - Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <div className="relative">
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-xl shadow-lg hover:shadow-xl transition-all border border-gray-200"
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
      </div>

      {/* Back to Home Button */}
      <Link 
        to="/"
        className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-xl shadow-lg hover:shadow-xl transition-all border border-gray-200 text-gray-700 hover:text-purple-600"
      >
        <ArrowRight className="w-4 h-4 rotate-180" />
        <span className="text-sm font-medium">Retour</span>
      </Link>

      {/* Main Container */}
      <div className="w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left Side - Branding & Features */}
        <div className="hidden md:block space-y-8 animate-slide-in-left">
          {/* Logo */}
          <div className="flex items-center gap-3">
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

          {/* Welcome Text */}
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
              {t.welcome}
              <br />
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text">
                CodeReview
              </span>
            </h1>
            <p className="text-xl text-gray-600">
              L'outil d'analyse de code intelligent propulsé par l'IA
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-4">
            {t.features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-gray-700 font-medium">{feature}</span>
              </div>
            ))}
          </div>

          {/* Decorative Element */}
          <div className="pt-8">
            <div className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full border border-purple-200">
              <Sparkles className="w-5 h-5 text-purple-600 animate-spin-slow" />
              <span className="text-sm font-semibold text-purple-700">
                Déjà 10,000+ développeurs nous font confiance
              </span>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full animate-fade-in">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/20">
            {/* Form Header */}
            <div className="text-center mb-8">
              <div className="md:hidden flex items-center justify-center gap-2 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Terminal className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text">
                  CodeReview
                </span>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {t.login}
              </h2>
              <p className="text-gray-600">
                {t.noAccount}{' '}
                <Link
                  to="/signup"
                  className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
                >
                  {t.signupLink}
                </Link>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t.email}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-100 outline-none transition-all text-gray-900 placeholder-gray-400"
                    placeholder="exemple@email.com"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t.password}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-100 outline-none transition-all text-gray-900 placeholder-gray-400"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-purple-600 hover:text-purple-700 font-semibold transition-colors"
                >
                  {t.forgotPassword}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center gap-2 group"
              >
                {t.loginButton}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">
                  {t.continueWith}
                </span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all font-medium text-gray-700 group">
                <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">GitHub</span>
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all font-medium text-gray-700 group">
                <Chrome className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Google</span>
              </button>
            </div>

            {/* Terms & Privacy */}
            <p className="mt-6 text-center text-xs text-gray-500">
              En continuant, vous acceptez nos{' '}
              <a href="#" className="text-purple-600 hover:text-purple-700 font-medium">
                Conditions d'utilisation
              </a>{' '}
              et notre{' '}
              <a href="#" className="text-purple-600 hover:text-purple-700 font-medium">
                Politique de confidentialité
              </a>
            </p>
          </div>
        </div>
      </div>

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
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
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
        
        .animate-slide-in-left {
          animation: slide-in-left 0.8s ease-out;
        }
        
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}