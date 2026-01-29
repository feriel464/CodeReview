import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, Edit, Trash2, Eye, Clock, Download,
  ArrowUp, ArrowDown, BarChart3, Shield, CheckCircle, AlertTriangle,
  TrendingUp, TrendingDown, Activity, Zap, FileCode, Calendar,
  Code, GitBranch, Target, Award, AlertCircle, XCircle
} from 'lucide-react';

export default function AnalyticsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterQuality, setFilterQuality] = useState('all');
  const [filterSecurity, setFilterSecurity] = useState('all');
  const [isMobile, setIsMobile] = useState(false);

  const [analytics, setAnalytics] = useState([
    {
      id: 1,
      code_version_id: 101,
      project_name: 'Application E-Commerce',
      file_name: 'app.py',
      language: 'Python',
      quality_score: 92,
      security_score: 88,
      created_at: '2024-01-29 14:30:00',
      user: 'Marie Dubois',
      status: 'excellent',
      issues_found: 3,
      vulnerabilities: 1
    },
    {
      id: 2,
      code_version_id: 102,
      project_name: 'Dashboard Analytics',
      file_name: 'index.js',
      language: 'JavaScript',
      quality_score: 78,
      security_score: 72,
      created_at: '2024-01-29 13:15:00',
      user: 'Jean Martin',
      status: 'good',
      issues_found: 8,
      vulnerabilities: 3
    },
    {
      id: 3,
      code_version_id: 103,
      project_name: 'API REST Backend',
      file_name: 'server.ts',
      language: 'TypeScript',
      quality_score: 95,
      security_score: 94,
      created_at: '2024-01-29 12:45:00',
      user: 'Sophie Laurent',
      status: 'excellent',
      issues_found: 2,
      vulnerabilities: 0
    },
    {
      id: 4,
      code_version_id: 104,
      project_name: 'Mobile App Flutter',
      file_name: 'main.dart',
      language: 'Dart',
      quality_score: 65,
      security_score: 58,
      created_at: '2024-01-29 11:20:00',
      user: 'Pierre Durand',
      status: 'warning',
      issues_found: 15,
      vulnerabilities: 5
    },
    {
      id: 5,
      code_version_id: 105,
      project_name: 'Site Web Corporate',
      file_name: 'index.html',
      language: 'HTML/CSS',
      quality_score: 82,
      security_score: 79,
      created_at: '2024-01-29 10:00:00',
      user: 'Claire Bernard',
      status: 'good',
      issues_found: 6,
      vulnerabilities: 2
    },
    {
      id: 6,
      code_version_id: 106,
      project_name: 'Service Microservices',
      file_name: 'service.go',
      language: 'Go',
      quality_score: 89,
      security_score: 91,
      created_at: '2024-01-28 16:30:00',
      user: 'Thomas Petit',
      status: 'excellent',
      issues_found: 4,
      vulnerabilities: 1
    },
    {
      id: 7,
      code_version_id: 107,
      project_name: 'Authentication Service',
      file_name: 'auth.py',
      language: 'Python',
      quality_score: 45,
      security_score: 38,
      created_at: '2024-01-28 15:00:00',
      user: 'Alice Moreau',
      status: 'critical',
      issues_found: 25,
      vulnerabilities: 12
    }
  ]);

  // Détecter la taille de l'écran
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filtrer les analytics
  const filteredAnalytics = analytics.filter(item => {
    const matchesSearch = 
      item.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesQuality = 
      filterQuality === 'all' || 
      (filterQuality === 'excellent' && item.quality_score >= 90) ||
      (filterQuality === 'good' && item.quality_score >= 70 && item.quality_score < 90) ||
      (filterQuality === 'warning' && item.quality_score >= 50 && item.quality_score < 70) ||
      (filterQuality === 'critical' && item.quality_score < 50);
    
    const matchesSecurity = 
      filterSecurity === 'all' || 
      (filterSecurity === 'excellent' && item.security_score >= 90) ||
      (filterSecurity === 'good' && item.security_score >= 70 && item.security_score < 90) ||
      (filterSecurity === 'warning' && item.security_score >= 50 && item.security_score < 70) ||
      (filterSecurity === 'critical' && item.security_score < 50);
    
    return matchesSearch && matchesQuality && matchesSecurity;
  });

  // Statistiques
  const stats = {
    total: analytics.length,
    avgQuality: Math.round(analytics.reduce((acc, a) => acc + a.quality_score, 0) / analytics.length),
    avgSecurity: Math.round(analytics.reduce((acc, a) => acc + a.security_score, 0) / analytics.length),
    totalIssues: analytics.reduce((acc, a) => acc + a.issues_found, 0),
    totalVulnerabilities: analytics.reduce((acc, a) => acc + a.vulnerabilities, 0)
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, change, gradient, trend }) => (
    <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all group cursor-pointer transform hover:scale-105 animate-fade-in-up">
      <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-14 lg:h-14 bg-gradient-to-br ${gradient} rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7" />
        </div>
        {change && (
          <div className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-bold ${
            trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          }`}>
            {trend === 'up' ? <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" /> : <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />}
            <span className="hidden sm:inline">{change}%</span>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">{title}</h3>
        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );

  const getScoreColor = (score) => {
    if (score >= 90) return { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' };
    if (score >= 70) return { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-500' };
    if (score >= 50) return { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-500' };
    return { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' };
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'excellent':
        return { icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-700', label: 'Excellent' };
      case 'good':
        return { icon: Target, bg: 'bg-blue-100', text: 'text-blue-700', label: 'Bon' };
      case 'warning':
        return { icon: AlertTriangle, bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Attention' };
      case 'critical':
        return { icon: XCircle, bg: 'bg-red-100', text: 'text-red-700', label: 'Critique' };
      default:
        return { icon: AlertCircle, bg: 'bg-gray-100', text: 'text-gray-700', label: 'Inconnu' };
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const AnalyticsCard = ({ item }) => {
    const qualityColor = getScoreColor(item.quality_score);
    const securityColor = getScoreColor(item.security_score);
    const statusBadge = getStatusBadge(item.status);
    const StatusIcon = statusBadge.icon;
    
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:shadow-xl transition-all hover:border-purple-300">
        {/* En-tête de la carte */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-base mb-1 truncate">{item.project_name}</h3>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
              <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate font-mono">{item.file_name}</span>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${statusBadge.bg} ${statusBadge.text} rounded-lg text-xs font-bold`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusBadge.label}
            </span>
          </div>
        </div>
        
        {/* Scores */}
        <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
          {/* Score Qualité */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-gray-700">Qualité</span>
              </div>
              <span className={`text-sm font-bold ${qualityColor.text}`}>{item.quality_score}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${qualityColor.bar}`}
                style={{ width: `${item.quality_score}%` }}
              />
            </div>
          </div>

          {/* Score Sécurité */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-gray-700">Sécurité</span>
              </div>
              <span className={`text-sm font-bold ${securityColor.text}`}>{item.security_score}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${securityColor.bar}`}
                style={{ width: `${item.security_score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">ID</p>
            <p className="text-sm font-bold text-gray-900">#{item.code_version_id}</p>
          </div>
          <div className="text-center border-x border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Problèmes</p>
            <p className="text-sm font-bold text-red-600">{item.issues_found}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Vulnérabilités</p>
            <p className="text-sm font-bold text-orange-600">{item.vulnerabilities}</p>
          </div>
        </div>

        {/* Informations */}
        <div className="flex items-center justify-between text-xs text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(item.created_at)}</span>
          </div>
          <span className="font-semibold truncate">{item.user.split(' ')[0]}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button 
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all text-xs font-semibold"
          >
            <Eye className="w-3.5 h-3.5" />
            Détails
          </button>
          <button 
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            Rapport
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* En-tête */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-2">
          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900">
            Analytics IA
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 lg:px-4 py-2 bg-white border-2 border-gray-200 rounded-lg sm:rounded-xl hover:border-purple-500 transition-all text-xs sm:text-sm font-semibold">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Période</span>
            </button>
            <button className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 lg:px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg sm:rounded-xl hover:shadow-xl transition-all text-xs sm:text-sm font-semibold whitespace-nowrap">
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Exporter</span>
              <span className="xs:hidden">Export</span>
            </button>
          </div>
        </div>
        <p className="text-xs sm:text-sm lg:text-base text-gray-600">
          Résultats des analyses IA de qualité et sécurité du code
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 xl:gap-6 mb-4 sm:mb-6 lg:mb-8">
        <StatCard 
          icon={Activity}
          title="Total analyses"
          value={stats.total}
          change={18.5}
          gradient="from-purple-500 to-purple-600"
          trend="up"
        />
        <StatCard 
          icon={Target}
          title="Qualité moyenne"
          value={`${stats.avgQuality}%`}
          change={5.2}
          gradient="from-green-500 to-green-600"
          trend="up"
        />
        <StatCard 
          icon={Shield}
          title="Sécurité moyenne"
          value={`${stats.avgSecurity}%`}
          change={3.8}
          gradient="from-blue-500 to-blue-600"
          trend="up"
        />
        <StatCard 
          icon={AlertCircle}
          title="Problèmes"
          value={stats.totalIssues}
          gradient="from-yellow-500 to-yellow-600"
        />
        <StatCard 
          icon={AlertTriangle}
          title="Vulnérabilités"
          value={stats.totalVulnerabilities}
          gradient="from-red-500 to-red-600"
        />
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 shadow-xl p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 lg:mb-8">
        <div className="flex flex-col gap-3">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par projet, fichier, utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-2.5 lg:py-3 bg-gray-100 rounded-lg sm:rounded-xl border-2 border-transparent focus:border-purple-500 focus:bg-white transition-all outline-none text-xs sm:text-sm"
            />
          </div>

          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Filtre Qualité */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-2">Score de qualité</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterQuality('all')}
                  className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                    filterQuality === 'all'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setFilterQuality('excellent')}
                  className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                    filterQuality === 'excellent'
                      ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Excellent (90+)
                </button>
                <button
                  onClick={() => setFilterQuality('good')}
                  className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                    filterQuality === 'good'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Bon (70-89)
                </button>
                <button
                  onClick={() => setFilterQuality('warning')}
                  className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                    filterQuality === 'warning'
                      ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Attention (50-69)
                </button>
                <button
                  onClick={() => setFilterQuality('critical')}
                  className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                    filterQuality === 'critical'
                      ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Critique (&lt;50)
                </button>
              </div>
            </div>

            {/* Séparateur vertical (visible uniquement sur desktop) */}
            <div className="hidden sm:block w-px bg-gray-300"></div>

            {/* Filtre Sécurité */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-2">Score de sécurité</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterSecurity('all')}
                  className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                    filterSecurity === 'all'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setFilterSecurity('excellent')}
                  className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                    filterSecurity === 'excellent'
                      ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Excellent (90+)
                </button>
                <button
                  onClick={() => setFilterSecurity('good')}
                  className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                    filterSecurity === 'good'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Bon (70-89)
                </button>
                <button
                  onClick={() => setFilterSecurity('warning')}
                  className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                    filterSecurity === 'warning'
                      ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Attention (50-69)
                </button>
                <button
                  onClick={() => setFilterSecurity('critical')}
                  className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                    filterSecurity === 'critical'
                      ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Critique (&lt;50)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des analytics - Vue adaptative */}
      {filteredAnalytics.length > 0 ? (
        <>
          {/* Vue cartes pour mobile et tablette */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:hidden">
            {filteredAnalytics.map((item) => (
              <AnalyticsCard key={item.id} item={item} />
            ))}
          </div>

          {/* Vue tableau pour desktop */}
          <div className="hidden lg:block bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Résultats d'analyses</h2>
                  <p className="text-sm text-gray-600">{filteredAnalytics.length} analyse(s) trouvée(s)</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Projet</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Fichier</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Qualité</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Sécurité</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Problèmes</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Vulnérabilités</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAnalytics.map((item) => {
                    const qualityColor = getScoreColor(item.quality_score);
                    const securityColor = getScoreColor(item.security_score);
                    const statusBadge = getStatusBadge(item.status);
                    const StatusIcon = statusBadge.icon;
                    
                    return (
                      <tr key={item.id} className="hover:bg-purple-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-bold text-purple-600">#{item.code_version_id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                              <GitBranch className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-gray-900 text-sm">{item.project_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs">
                            <FileCode className="w-3 h-3 text-purple-600" />
                            <span className="font-mono text-gray-700">{item.file_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5 w-12">
                              <div 
                                className={`h-1.5 rounded-full ${qualityColor.bar}`}
                                style={{ width: `${item.quality_score}%` }}
                              />
                            </div>
                            <span className={`font-bold text-xs ${qualityColor.text}`}>{item.quality_score}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5 w-12">
                              <div 
                                className={`h-1.5 rounded-full ${securityColor.bar}`}
                                style={{ width: `${item.security_score}%` }}
                              />
                            </div>
                            <span className={`font-bold text-xs ${securityColor.text}`}>{item.security_score}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-sm text-red-600">{item.issues_found}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-sm text-orange-600">{item.vulnerabilities}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 ${statusBadge.bg} ${statusBadge.text} rounded-full text-xs font-bold`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600">{formatDate(item.created_at)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button 
                              className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors group"
                              title="Voir les détails"
                            >
                              <Eye className="w-4 h-4 text-gray-600 group-hover:text-purple-600" />
                            </button>
                            <button 
                              className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors group"
                              title="Télécharger le rapport"
                            >
                              <Download className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t-2 border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                  Affichage de <span className="font-bold">1-{filteredAnalytics.length}</span> sur <span className="font-bold">{analytics.length}</span> analyses
                </p>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-all text-sm font-semibold">
                    Préc.
                  </button>
                  <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg shadow-lg text-sm font-semibold">
                    1
                  </button>
                  <button className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-all text-sm font-semibold">
                    2
                  </button>
                  <button className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-all text-sm font-semibold">
                    Suiv.
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Message si aucun résultat */
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-lg border-2 border-gray-200">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 sm:w-12 sm:h-12 text-purple-600" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Aucune analyse trouvée</h3>
          <p className="text-sm sm:text-base text-gray-600">Essayez de modifier vos critères de recherche</p>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}