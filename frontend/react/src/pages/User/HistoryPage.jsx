// src/pages/User/HistoryPage.jsx
import React, { useState, useEffect } from 'react';
import { Terminal, ArrowLeft, Code, Calendar, TrendingUp, FileText, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import UserMenu from '../../components/UserMenu';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [floatingElements, setFloatingElements] = useState([]);

  useEffect(() => {
    loadHistory();
    
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

  const loadHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const response = await axios.get(`${API_URL}/analyze/history`, { headers });
      
      if (response.data.success) {
        setHistory(response.data.history);
      }
    } catch (error) {
      console.error('❌ Erreur chargement historique:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                Historique
              </span>
            </div>
          </div>

          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Mes Analyses
          </h1>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader className="w-10 h-10 text-purple-600 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-16 text-center shadow-xl">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Aucune analyse
              </h3>
              <p className="text-gray-600 mb-6">
                Vous n'avez pas encore effectué d'analyse
              </p>
              <button
                onClick={() => navigate('/analyze')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl transition-all font-medium"
              >
                Commencer une analyse
              </button>
            </div>
          ) : (
            <div className="grid gap-6">
              {history.map((item) => (
                <div
                  key={item.project_id}
                  className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all cursor-pointer group"
                  onClick={() => navigate(`/analyze/${item.project_id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Code className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {item.project_name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {item.file_name || `code.${item.programming_language}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDate(item.created_at)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4" />
                          {item.programming_language}
                        </div>
                      </div>
                    </div>

                    {item.quality_score && (
                      <div className="text-right">
                        <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 text-transparent bg-clip-text mb-1">
                          {item.quality_score}/100
                        </div>
                        <p className="text-xs text-gray-600 font-medium">
                          Score de qualité
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
      `}</style>
    </div>
  );
}