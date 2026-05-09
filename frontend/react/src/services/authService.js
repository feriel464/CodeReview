// src/services/authService.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL + '/auth' 
  : 'http://localhost:5000/api/auth';
// Configuration d'axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter le token à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

class AuthService {


  // Ajouter dans la classe AuthService, appeler dans le constructeur
constructor() {
  this._cleanupIfInvalid();
}

_cleanupIfInvalid() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (token && user) {
    try {
      const parsed = JSON.parse(user);
      if (!parsed || !parsed.id) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
}
  // Inscription
  async signup(name, email, password) {
    try {
      const response = await api.post('/signup', {
        name,
        email,
        password
      });

      if (response.data.success && response.data.data.token) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }

      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Erreur de connexion au serveur' };
    }
  }

  // Connexion
  async login(email, password) {
    try {
      const response = await api.post('/login', {
        email,
        password
      });

      if (response.data.success && response.data.data.token) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }

      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Erreur de connexion au serveur' };
    }
  }

  // Déconnexion
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Vérifier si l'utilisateur est connecté
  // Remplacer isAuthenticated() dans authService.js
isAuthenticated() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (!token || !user) return false;
  
  try {
    const parsed = JSON.parse(user);
    // Un utilisateur valide doit avoir au minimum un id
    return !!(parsed && parsed.id);
  } catch {
    // JSON corrompu → nettoyer et retourner false
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return false;
  }
}

  // Obtenir l'utilisateur actuel
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // Obtenir le token
  getToken() {
    return localStorage.getItem('token');
  }

  // Vérifier le token
  async verifyToken() {
    try {
      const response = await api.get('/verify');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Erreur de vérification du token' };
    }
  }

  // Lancer le flux OAuth Google
loginWithGoogle() {
  const backendUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace('/api', '') 
    : 'http://localhost:5000';
  window.location.href = `${backendUrl}/api/auth/google`;
}

loginWithGithub() {
  const backendUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace('/api', '') 
    : 'http://localhost:5000';
  window.location.href = `${backendUrl}/api/auth/github`;
}
}
// Ajouter dans la classe AuthService


export default new AuthService();
