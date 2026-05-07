import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Terminal } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  // Validation force du mot de passe
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const isStrong = Object.values(checks).every(Boolean);
  const passwordsMatch = password === confirm && confirm !== '';

  const handleSubmit = async () => {
    if (!token) {
      setErrorMsg('Token manquant ou invalide.');
      setStatus('error');
      return;
    }
    if (!isStrong) {
      setErrorMsg('Votre mot de passe ne respecte pas les critères requis.');
      return;
    }
    if (!passwordsMatch) {
      setErrorMsg('Les mots de passe ne correspondent pas.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus('success');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setErrorMsg(data.message || 'Erreur lors de la réinitialisation.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Erreur réseau. Réessayez.');
      setStatus('error');
    }
  };

  // ─── Token manquant ───────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h2>
          <p className="text-gray-500 mb-6">Ce lien de réinitialisation est invalide ou a expiré.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  // ─── Succès ───────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Mot de passe modifié !</h2>
          <p className="text-gray-500 mb-2">Votre mot de passe a été réinitialisé avec succès.</p>
          <p className="text-sm text-purple-600 font-medium">Redirection vers la connexion...</p>
        </div>
      </div>
    );
  }

  // ─── Formulaire principal ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 max-w-md w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text">
              CodeReview
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Nouveau mot de passe</h2>
          <p className="text-gray-500 text-sm">Choisissez un mot de passe fort et sécurisé</p>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}

        {/* Champ mot de passe */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-11 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white outline-none transition-all"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Indicateurs de force */}
        {password && (
          <div className="mb-5 grid grid-cols-2 gap-2">
            {[
              { key: 'length', label: '8 caractères min.' },
              { key: 'upper', label: 'Une majuscule' },
              { key: 'number', label: 'Un chiffre' },
              { key: 'special', label: 'Un caractère spécial' },
            ].map(({ key, label }) => (
              <div key={key} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${checks[key] ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${checks[key] ? 'text-green-500' : 'text-gray-300'}`} />
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Confirmation */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`w-full pl-11 pr-11 py-3.5 bg-gray-50 border-2 rounded-xl outline-none transition-all ${
                confirm
                  ? passwordsMatch
                    ? 'border-green-400 focus:border-green-500'
                    : 'border-red-300 focus:border-red-400'
                  : 'border-gray-200 focus:border-purple-500 focus:bg-white'
              }`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirm && !passwordsMatch && (
            <p className="mt-1.5 text-xs text-red-500">Les mots de passe ne correspondent pas</p>
          )}
          {confirm && passwordsMatch && (
            <p className="mt-1.5 text-xs text-green-600">✓ Les mots de passe correspondent</p>
          )}
        </div>

        {/* Bouton submit */}
        <button
          onClick={handleSubmit}
          disabled={status === 'loading' || !isStrong || !passwordsMatch}
          className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Enregistrement...' : 'Réinitialiser le mot de passe'}
        </button>

      </div>
    </div>
  );
}
