import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, Edit, Trash2, Eye, Clock, Download,
  ArrowUp, ArrowDown, FileCode, Code, Calendar, MapPin,
  CheckCircle, XCircle, AlertCircle, Upload, File, Image,
  FileText, MoreVertical, X, GitBranch, Activity, Zap
} from 'lucide-react';

export default function CodeReviewsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [filterSourceType, setFilterSourceType] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [codeVersions, setCodeVersions] = useState([
    {
      id: 1,
      project_name: 'Application E-Commerce',
      project_id: 101,
      uploaded_at: '2024-01-29 14:30:00',
      language: 'Python',
      code_path: '/projects/ecommerce/app.py',
      source_type: 'file',
      file_name: 'app.py',
      user: 'Marie Dubois',
      score: 92,
      issues: 5,
      status: 'analyzed'
    },
    {
      id: 2,
      project_name: 'Dashboard Analytics',
      project_id: 102,
      uploaded_at: '2024-01-29 13:15:00',
      language: 'JavaScript',
      code_path: '/projects/dashboard/index.js',
      source_type: 'file',
      file_name: 'index.js',
      user: 'Jean Martin',
      score: 88,
      issues: 8,
      status: 'analyzed'
    },
    {
      id: 3,
      project_name: 'API REST Backend',
      project_id: 103,
      uploaded_at: '2024-01-29 12:45:00',
      language: 'TypeScript',
      code_path: '/projects/api/server.ts',
      source_type: 'file',
      file_name: 'server.ts',
      user: 'Sophie Laurent',
      score: 95,
      issues: 2,
      status: 'analyzed'
    },
    {
      id: 4,
      project_name: 'Mobile App Flutter',
      project_id: 104,
      uploaded_at: '2024-01-29 11:20:00',
      language: 'Dart',
      code_path: '/projects/mobile/main.dart',
      source_type: 'document',
      file_name: 'main.dart',
      user: 'Pierre Durand',
      score: 85,
      issues: 12,
      status: 'processing'
    },
    {
      id: 5,
      project_name: 'Site Web Corporate',
      project_id: 105,
      uploaded_at: '2024-01-29 10:00:00',
      language: 'HTML/CSS',
      code_path: '/projects/website/index.html',
      source_type: 'image',
      file_name: 'index.html',
      user: 'Claire Bernard',
      score: 78,
      issues: 15,
      status: 'analyzed'
    },
    {
      id: 6,
      project_name: 'Service Microservices',
      project_id: 106,
      uploaded_at: '2024-01-28 16:30:00',
      language: 'Go',
      code_path: '/projects/microservices/service.go',
      source_type: 'file',
      file_name: 'service.go',
      user: 'Thomas Petit',
      score: 91,
      issues: 6,
      status: 'analyzed'
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

  // Filtrer les versions de code
  const filteredVersions = codeVersions.filter(version => {
    const matchesSearch = 
      version.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      version.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      version.user.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLanguage = 
      filterLanguage === 'all' || version.language === filterLanguage;
    
    const matchesSourceType = 
      filterSourceType === 'all' || version.source_type === filterSourceType;
    
    return matchesSearch && matchesLanguage && matchesSourceType;
  });

  // Statistiques
  const stats = {
    total: codeVersions.length,
    analyzed: codeVersions.filter(v => v.status === 'analyzed').length,
    processing: codeVersions.filter(v => v.status === 'processing').length,
    avgScore: Math.round(codeVersions.reduce((acc, v) => acc + v.score, 0) / codeVersions.length)
  };

  const StatCard = ({ icon: Icon, title, value, change, gradient, trend }) => (
    <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all group cursor-pointer transform hover:scale-105 animate-fade-in-up">
      <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-14 lg:h-14 bg-gradient-to-br ${gradient} rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7" />
        </div>
        <div className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-bold ${
          trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        }`}>
          {trend === 'up' ? <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" /> : <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />}
          <span className="hidden sm:inline">{change}%</span>
        </div>
      </div>
      <div>
        <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">{title}</h3>
        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );

  const getSourceTypeIcon = (type) => {
    switch(type) {
      case 'file': return File;
      case 'document': return FileText;
      case 'image': return Image;
      default: return File;
    }
  };

  const getLanguageColor = (language) => {
    const colors = {
      'Python': 'bg-blue-100 text-blue-700',
      'JavaScript': 'bg-yellow-100 text-yellow-700',
      'TypeScript': 'bg-cyan-100 text-cyan-700',
      'Dart': 'bg-teal-100 text-teal-700',
      'HTML/CSS': 'bg-orange-100 text-orange-700',
      'Go': 'bg-indigo-100 text-indigo-700',
      'Java': 'bg-red-100 text-red-700',
      'C++': 'bg-purple-100 text-purple-700'
    };
    return colors[language] || 'bg-gray-100 text-gray-700';
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

  const CodeVersionCard = ({ version }) => {
    const SourceIcon = getSourceTypeIcon(version.source_type);
    
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:shadow-xl transition-all hover:border-purple-300">
        {/* En-tête de la carte */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
            <Code className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-base mb-1 truncate">{version.project_name}</h3>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
              <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate font-mono">{version.file_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${getLanguageColor(version.language)} rounded-lg text-xs font-bold`}>
                <Code className="w-3.5 h-3.5" />
                {version.language}
              </span>
              {version.status === 'analyzed' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Analysé
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  En cours
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Informations */}
        <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-700">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <SourceIcon className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <span className="text-gray-500">Source: </span>
              <span className="font-semibold capitalize">{version.source_type}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-700">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-purple-600" />
            </div>
            <span className="truncate">{formatDate(version.uploaded_at)}</span>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Score</p>
            <p className="text-lg font-bold text-gray-900">{version.score}</p>
          </div>
          <div className="text-center border-x border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Problèmes</p>
            <p className="text-lg font-bold text-red-600">{version.issues}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Par</p>
            <p className="text-xs font-bold text-gray-900 truncate">{version.user.split(' ')[0]}</p>
          </div>
        </div>

        {/* Barre de progression du score */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-600 font-medium">Qualité du code</span>
            <span className="text-xs font-bold text-gray-900">{version.score}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                version.score >= 90 ? 'bg-green-500' : version.score >= 80 ? 'bg-blue-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${version.score}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button 
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all text-xs font-semibold"
          >
            <Eye className="w-3.5 h-3.5" />
            Voir
          </button>
          <button 
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger
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
            Revues de Code
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 lg:px-4 py-2 bg-white border-2 border-gray-200 rounded-lg sm:rounded-xl hover:border-purple-500 transition-all text-xs sm:text-sm font-semibold">
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Exporter</span>
            </button>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 lg:px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg sm:rounded-xl hover:shadow-xl transition-all text-xs sm:text-sm font-semibold whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Nouveau code</span>
              <span className="xs:hidden">+</span>
            </button>
          </div>
        </div>
        <p className="text-xs sm:text-sm lg:text-base text-gray-600">
          Historique des versions de code analysées
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 xl:gap-6 mb-4 sm:mb-6 lg:mb-8">
        <StatCard 
          icon={FileCode}
          title="Total versions"
          value={stats.total}
          change={15.3}
          gradient="from-purple-500 to-purple-600"
          trend="up"
        />
        <StatCard 
          icon={CheckCircle}
          title="Analysées"
          value={stats.analyzed}
          change={8.7}
          gradient="from-green-500 to-green-600"
          trend="up"
        />
        <StatCard 
          icon={Activity}
          title="En traitement"
          value={stats.processing}
          change={-2.1}
          gradient="from-yellow-500 to-yellow-600"
          trend="down"
        />
        <StatCard 
          icon={Zap}
          title="Score moyen"
          value={stats.avgScore}
          change={5.2}
          gradient="from-blue-500 to-blue-600"
          trend="up"
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
          <div className="flex flex-wrap gap-2">
            {/* Filtre par langage */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterLanguage('all')}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                  filterLanguage === 'all'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tous
              </button>
              {['Python', 'JavaScript', 'TypeScript', 'Go'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setFilterLanguage(lang)}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                    filterLanguage === lang
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Séparateur vertical (visible uniquement sur desktop) */}
            <div className="hidden lg:block w-px bg-gray-300 mx-2"></div>

            {/* Filtre par type de source */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'Toutes sources' },
                { key: 'file', label: 'Fichiers', icon: File },
                { key: 'document', label: 'Documents', icon: FileText },
                { key: 'image', label: 'Images', icon: Image }
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setFilterSourceType(item.key)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                    filterSourceType === item.key
                      ? 'bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {item.icon && <item.icon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.key === 'all' ? 'Tous' : item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Liste des versions - Vue adaptative */}
      {filteredVersions.length > 0 ? (
        <>
          {/* Vue cartes pour mobile et tablette */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:hidden">
            {filteredVersions.map((version) => (
              <CodeVersionCard key={version.id} version={version} />
            ))}
          </div>

          {/* Vue tableau pour desktop */}
          <div className="hidden lg:block bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Versions de code</h2>
                  <p className="text-sm text-gray-600">{filteredVersions.length} version(s) trouvée(s)</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Projet</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Fichier</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Langage</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Problèmes</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredVersions.map((version) => {
                    const SourceIcon = getSourceTypeIcon(version.source_type);
                    return (
                      <tr key={version.id} className="hover:bg-purple-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                              <GitBranch className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{version.project_name}</p>
                              <p className="text-xs text-gray-500">ID: {version.project_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs">
                            <FileCode className="w-3 h-3 text-purple-600" />
                            <span className="font-mono text-gray-700">{version.file_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 ${getLanguageColor(version.language)} rounded-full text-xs font-bold`}>
                            <Code className="w-3 h-3" />
                            {version.language}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-gray-700">
                            <SourceIcon className="w-4 h-4 text-purple-600" />
                            <span className="capitalize">{version.source_type}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5 w-12">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  version.score >= 90 ? 'bg-green-500' : version.score >= 80 ? 'bg-blue-500' : 'bg-yellow-500'
                                }`}
                                style={{ width: `${version.score}%` }}
                              />
                            </div>
                            <span className="font-bold text-gray-900 text-xs">{version.score}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold text-sm ${
                            version.issues > 10 ? 'text-red-600' : version.issues > 5 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {version.issues}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {version.status === 'analyzed' ? (
                            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold w-fit">
                              <CheckCircle className="w-3 h-3" />
                              Analysé
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold w-fit">
                              <Clock className="w-3 h-3 animate-spin" />
                              En cours
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600">{formatDate(version.uploaded_at)}</span>
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
                              title="Télécharger"
                            >
                              <Download className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                            </button>
                            <button 
                              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors group"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
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
                  Affichage de <span className="font-bold">1-{filteredVersions.length}</span> sur <span className="font-bold">{codeVersions.length}</span> versions
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
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Aucune version trouvée</h3>
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