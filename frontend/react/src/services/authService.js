// src/services/authService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';

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
  isAuthenticated() {
    return !!localStorage.getItem('token');
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
}

export default new AuthService();