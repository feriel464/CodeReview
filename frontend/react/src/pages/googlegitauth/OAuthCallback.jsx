// src/pages/OAuthCallback.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Terminal } from 'lucide-react';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const userEncoded = searchParams.get('user');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Échec de la connexion OAuth. Veuillez réessayer.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!token || !userEncoded) {
      setError('Données d\'authentification manquantes.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    try {
  const user = JSON.parse(atob(userEncoded));

  // Validation : s'assurer que l'utilisateur a bien un id
  if (!user || !user.id) {
    setError('Données utilisateur invalides.');
    setTimeout(() => navigate('/login'), 3000);
    return;
  }

  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));

  if (user.role === 'admin') {
    navigate('/admin/dashboard', { replace: true });
  } else {
    navigate('/dashboard', { replace: true });
  }
} catch (e) {
  setError('Erreur lors du traitement des données.');
  setTimeout(() => navigate('/login'), 3000);
}
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Terminal className="w-8 h-8 text-white" />
        </div>
        {error ? (
          <>
            <p className="text-red-600 font-medium mb-2">{error}</p>
            <p className="text-gray-500 text-sm">Redirection vers la page de connexion...</p>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Connexion en cours...</p>
          </>
        )}
      </div>
    </div>
  );
}