// src/components/UserMenu.jsx
import React, { useState } from 'react';
import { ChevronDown, User, Settings, LogOut, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function UserMenu() {
  const [showMenu, setShowMenu] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  // Fonction de déconnexion
  const handleLogout = async () => {
    try {
      // Récupérer le token depuis le localStorage
      const token = localStorage.getItem('token');
      
      if (token) {
        // Appeler l'API de déconnexion
        const response = await fetch(' /auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        
        if (data.success) {
          console.log('Déconnexion réussie côté serveur');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // On continue quand même avec la déconnexion côté client
    } finally {
      // Supprimer le token et les données utilisateur du localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Rediriger vers la page de connexion
      window.location.href = '/login';
    }
  };
  const handleDashboard = () => {
    if (isAdmin) {
      navigate('/admin/dashboard');
    } else {
      navigate('/dashboard');
    }
    setShowMenu(false);
  };

  // Initiales de l'utilisateur
  const getInitials = () => {
    if (!user.name) return 'U';
    return user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg sm:rounded-xl hover:shadow-lg transition-all border-2 border-purple-200"
      >
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm ${
          isAdmin 
            ? 'bg-gradient-to-br from-purple-600 to-pink-600' 
            : 'bg-gradient-to-br from-blue-600 to-cyan-600'
        }`}>
          {getInitials()}
        </div>
        <div className="text-left hidden lg:block">
          <p className="text-sm font-bold text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-600">{user.email}</p>
        </div>
        <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-600 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border-2 border-gray-200 py-2 animate-fade-in z-50">
          {/* User Info (mobile) */}
          <div className="px-4 py-3 border-b border-gray-200 lg:hidden">
            <p className="text-sm font-bold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-600">{user.email}</p>
            {isAdmin && (
              <span className="inline-block mt-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                👑 Administrateur
              </span>
            )}
          </div>

          {/* Dashboard Link */}
          <button
            onClick={handleDashboard}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors text-sm text-gray-700"
          >
            <LayoutDashboard className="w-4 h-4" />
            {isAdmin ? 'Tableau de bord Admin' : 'Mon Dashboard'}
          </button>

          {/* Profile (for regular users) */}
          {!isAdmin && (
            <button
              onClick={() => {
                navigate('/profile');
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors text-sm text-gray-700"
            >
              <User className="w-4 h-4" />
              Mon Profil
            </button>
          )}

          {/* Settings */}
          <button
            onClick={() => {
              navigate('/settings');
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors text-sm text-gray-700"
          >
            <Settings className="w-4 h-4" />
            Paramètres
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-sm text-red-600 border-t border-gray-200"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
