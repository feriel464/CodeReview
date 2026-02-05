// src/hooks/useAuth.js
import { useState, useEffect } from 'react';
import authService from '../services/authService';
//sert a gerer l'état d'ath coté client
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const authenticated = authService.isAuthenticated();
        const currentUser = authService.getCurrentUser();
        
        setIsAuthenticated(authenticated);
        setUser(currentUser);
        setIsAdmin(currentUser && currentUser.role === 'admin');
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
        setUser(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return {
    isAuthenticated,
    isAdmin,
    user,
    loading
  };
};
//user → pour afficher nom, email et initiales

//isAdmin → pour afficher le menu admin ou utilisateur normal

//isAuthenticated → pour éventuellement afficher ou cacher le menu

//loading → pour gérer le rendu conditionnel si nécessaire