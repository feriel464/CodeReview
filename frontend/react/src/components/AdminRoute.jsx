// src/components/AdminRoute.jsx
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

const AdminRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      const user = authService.getCurrentUser();
      
      setIsAuthenticated(authenticated);
      setIsAdmin(user && user.role === 'admin');
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Vérification des droits...</p>
        </div>
      </div>
    );
  }

  // Si non authentifié, rediriger vers login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si authentifié mais pas admin, rediriger vers dashboard utilisateur
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Si admin, afficher le contenu
  return children;
};

export default AdminRoute;