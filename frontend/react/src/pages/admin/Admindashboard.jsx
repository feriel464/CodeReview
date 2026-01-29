import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, FileCode, Settings, TrendingUp, Activity, 
  Search, Bell, LogOut, ChevronDown, Menu, X, BarChart3, 
  Code, Shield, Zap, Clock, AlertCircle, CheckCircle, 
  Calendar, Download, Filter, MoreVertical, Terminal, Globe,
  ArrowUp, ArrowDown, Sparkles, Bug, FileText, Eye
} from 'lucide-react';

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [floatingElements, setFloatingElements] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 12458,
    activeAnalyses: 1247,
    codeReviews: 45821,
    successRate: 94.2
  });

  useEffect(() => {
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

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord', color: 'purple' },
    { id: 'users', icon: Users, label: 'Utilisateurs', color: 'pink' },
    { id: 'reviews', icon: FileCode, label: 'Revues de code', color: 'blue' },
    { id: 'analytics', icon: BarChart3, label: 'Analytiques', color: 'green' },
    { id: 'settings', icon: Settings, label: 'Paramètres', color: 'orange' },
  ];

  const recentAnalyses = [
    { id: 1, user: 'Marie Dubois', file: 'app.py', language: 'Python', score: 92, status: 'completed', time: '5 min' },
    { id: 2, user: 'Jean Martin', file: 'index.js', language: 'JavaScript', score: 88, status: 'completed', time: '12 min' },
    { id: 3, user: 'Sophie Laurent', file: 'main.cpp', language: 'C++', score: 95, status: 'completed', time: '18 min' },
    { id: 4, user: 'Pierre Durand', file: 'server.go', language: 'Go', score: 91, status: 'processing', time: 'En cours' },
    { id: 5, user: 'Claire Bernard', file: 'api.ts', language: 'TypeScript', score: 89, status: 'completed', time: '25 min' },
  ];

  const StatCard = ({ icon: Icon, title, value, change, gradient, trend }) => (
    <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all group cursor-pointer transform hover:scale-105 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
          <Icon className="w-7 h-7" />
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
          trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        }`}>
          {trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          {change}%
        </div>
      </div>
      <div>
        <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
      </div>
    </div>
  );

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

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-white/80 backdrop-blur-xl border-r-2 border-gray-200 transition-all duration-300 z-40 ${
        sidebarOpen ? 'w-72' : 'w-20'
      }`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            {sidebarOpen && (
              <div className="flex items-center gap-3 animate-slide-in-left">
                <div className="relative group">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Terminal className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl blur-lg opacity-50" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text">
                  CodeReview
                </span>
              </div>
            )}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const isActive = activeSection === item.id;
              const gradientClass = isActive 
                ? item.color === 'purple' ? 'bg-gradient-to-r from-purple-600 to-purple-500'
                : item.color === 'pink' ? 'bg-gradient-to-r from-pink-600 to-pink-500'
                : item.color === 'blue' ? 'bg-gradient-to-r from-blue-600 to-blue-500'
                : item.color === 'green' ? 'bg-gradient-to-r from-green-600 to-green-500'
                : 'bg-gradient-to-r from-orange-600 to-orange-500'
                : '';
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} px-4 py-3 rounded-xl transition-all group ${
                    isActive
                      ? `${gradientClass} text-white shadow-lg`
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={!sidebarOpen ? item.label : ''}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${
                    isActive ? 'animate-bounce-slow' : ''
                  }`} />
                  {sidebarOpen && (
                    <span className="font-semibold text-sm">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>


      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-20'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b-2 border-gray-200 shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher des utilisateurs, analyses, fichiers..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl border-2 border-transparent focus:border-purple-500 focus:bg-white transition-all outline-none text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 ml-6">
              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-3 bg-gray-100 hover:bg-purple-100 rounded-xl transition-all relative"
                >
                  <Bell className="w-5 h-5 text-gray-700" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 py-3 animate-fade-in">
                    <div className="px-4 pb-3 border-b border-gray-200">
                      <h3 className="font-bold text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="px-4 py-3 hover:bg-purple-50 transition-colors cursor-pointer border-b border-gray-100">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">Analyse terminée</p>
                              <p className="text-xs text-gray-600">Le fichier app.py a été analysé avec succès</p>
                              <p className="text-xs text-gray-400 mt-1">Il y a 5 minutes</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl hover:shadow-lg transition-all border-2 border-purple-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    AD
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-bold text-gray-900">Admin</p>
                    <p className="text-xs text-gray-600">admin@codereview.fr</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border-2 border-gray-200 py-2 animate-fade-in">
                    <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors text-sm text-gray-700">
                      <Settings className="w-4 h-4" />
                      Paramètres
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors text-sm text-gray-700 border-t border-gray-200">
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-8 relative z-10">
          {activeSection === 'dashboard' && (
            <div className="animate-fade-in">
              {/* Welcome Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-4xl font-bold text-gray-900">
                    Tableau de bord
                  </h1>
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 transition-all text-sm font-semibold">
                      <Calendar className="w-4 h-4" />
                      Aujourd'hui
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl transition-all text-sm font-semibold">
                      <Download className="w-4 h-4" />
                      Exporter
                    </button>
                  </div>
                </div>
                <p className="text-gray-600">Bienvenue sur votre tableau de bord administrateur</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                  icon={Users}
                  title="Utilisateurs totaux"
                  value={stats.totalUsers}
                  change={12.5}
                  gradient="from-purple-500 to-purple-600"
                  trend="up"
                />
                <StatCard 
                  icon={Activity}
                  title="Analyses actives"
                  value={stats.activeAnalyses}
                  change={8.3}
                  gradient="from-pink-500 to-pink-600"
                  trend="up"
                />
                <StatCard 
                  icon={FileCode}
                  title="Revues de code"
                  value={stats.codeReviews}
                  change={15.7}
                  gradient="from-blue-500 to-blue-600"
                  trend="up"
                />
                <StatCard 
                  icon={TrendingUp}
                  title="Taux de réussite"
                  value={stats.successRate}
                  change={2.1}
                  gradient="from-green-500 to-green-600"
                  trend="up"
                />
              </div>

              {/* Recent Analyses Table */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden mb-8">
                <div className="px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Analyses récentes</h2>
                      <p className="text-sm text-gray-600">Dernières revues de code effectuées</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-purple-500 transition-all text-sm font-semibold">
                      <Filter className="w-4 h-4" />
                      Filtrer
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Utilisateur</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Fichier</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Langage</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Score</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Statut</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Temps</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recentAnalyses.map((analysis) => (
                        <tr key={analysis.id} className="hover:bg-purple-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {analysis.user.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="font-semibold text-gray-900">{analysis.user}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Code className="w-4 h-4 text-purple-600" />
                              <span className="font-mono text-sm text-gray-700">{analysis.file}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                              {analysis.language}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 w-16">
                                <div 
                                  className={`h-2 rounded-full ${
                                    analysis.score >= 90 ? 'bg-green-500' : analysis.score >= 80 ? 'bg-blue-500' : 'bg-yellow-500'
                                  }`}
                                  style={{ width: `${analysis.score}%` }}
                                />
                              </div>
                              <span className="font-bold text-gray-900 text-sm">{analysis.score}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {analysis.status === 'completed' ? (
                              <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold w-fit">
                                <CheckCircle className="w-3 h-3" />
                                Terminé
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold w-fit">
                                <Clock className="w-3 h-3 animate-spin" />
                                En cours
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{analysis.time}</span>
                          </td>
                          <td className="px-6 py-4">
                            <button className="p-2 hover:bg-purple-100 rounded-lg transition-colors">
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Popular Languages */}
                <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Langages populaires</h3>
                  <div className="space-y-4">
                    {[
                      { lang: 'Python', count: 12458, color: 'from-blue-500 to-blue-600', percent: 35 },
                      { lang: 'JavaScript', count: 10234, color: 'from-yellow-500 to-yellow-600', percent: 28 },
                      { lang: 'TypeScript', count: 8921, color: 'from-cyan-500 to-cyan-600', percent: 25 },
                      { lang: 'Java', count: 4567, color: 'from-red-500 to-red-600', percent: 12 },
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-700">{item.lang}</span>
                          <span className="text-sm text-gray-600">{item.count.toLocaleString()} analyses</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full bg-gradient-to-r ${item.color}`}
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Issues Detected */}
                <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Problèmes détectés</h3>
                  <div className="space-y-4">
                    {[
                      { type: 'Bugs critiques', count: 342, icon: Bug, gradient: 'from-red-400 to-red-500', bgColor: 'bg-red-100', textColor: 'text-red-700' },
                      { type: 'Code smells', count: 1247, icon: AlertCircle, gradient: 'from-orange-400 to-orange-500', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
                      { type: 'Optimisations', count: 2156, icon: Zap, gradient: 'from-yellow-400 to-yellow-500', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
                      { type: 'Documentation', count: 892, icon: FileText, gradient: 'from-blue-400 to-blue-500', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-purple-50 transition-all cursor-pointer group transform hover:scale-[1.02]">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 bg-gradient-to-br ${item.gradient} rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                            <item.icon className="w-6 h-6 text-white" />
                          </div>
                          <span className="font-semibold text-gray-700">{item.type}</span>
                        </div>
                        <span className={`px-4 py-2 ${item.bgColor} ${item.textColor} rounded-lg font-bold`}>
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other sections placeholder */}
          {activeSection !== 'dashboard' && (
            <div className="text-center py-20 animate-fade-in">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-12 h-12 text-purple-600 animate-spin-slow" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Section {menuItems.find(m => m.id === activeSection)?.label}
              </h2>
              <p className="text-gray-600">
                Contenu en cours de développement
              </p>
            </div>
          )}
        </main>
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
        
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
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
        
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}