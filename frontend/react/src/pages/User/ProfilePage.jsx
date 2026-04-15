import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getInitials = (name = '') =>
  name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

// ─── Password Modal ──────────────────────────────────────────
function PasswordModal({ onClose, token }) {
  const [form, setForm]       = useState({ current: '', next: '', confirm: '' });
  const [show, setShow]       = useState({ current: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const toggle = (field) => setShow(s => ({ ...s, [field]: !s[field] }));

  const handleSubmit = async () => {
    setError('');
    if (!form.current || !form.next || !form.confirm) {
      return setError('Tous les champs sont obligatoires.');
    }
    if (form.next.length < 8) {
      return setError('Le mot de passe doit contenir au moins 8 caractères.');
    }
    if (form.next !== form.confirm) {
      return setError('Les mots de passe ne correspondent pas.');
    }
    try {
      setLoading(true);
      await axios.put(
        `${API_URL}/users/me/password`,
        { currentPassword: form.current, newPassword: form.next },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(true);
      setTimeout(onClose, 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du changement de mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
            <Lock className="w-4 h-4 text-purple-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Changer le mot de passe</h2>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
            <p className="text-sm font-medium text-gray-700">Mot de passe mis à jour !</p>
          </div>
        ) : (
          <>
            {['current', 'next', 'confirm'].map((field, i) => (
              <div key={field} className={i < 2 ? 'mb-3' : 'mb-4'}>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  {field === 'current' ? 'Mot de passe actuel'
                    : field === 'next' ? 'Nouveau mot de passe'
                    : 'Confirmer le nouveau mot de passe'}
                </label>
                <div className="relative">
                  <input
                    type={show[field] ? 'text' : 'password'}
                    value={form[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => toggle(field)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {show[field]
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}

            {error && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loading ? 'Enregistrement...' : 'Confirmer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Profile Page ────────────────────────────────────────────
export default function ProfilePage() {
  const navigate = useNavigate();
  const token    = localStorage.getItem('token');

  const [user, setUser]             = useState(null);
  const [form, setForm]             = useState({ name: '', email: '' });
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [showPwdModal, setShowPwdModal] = useState(false);

  useEffect(() => {
    if (!token) return navigate('/login');
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const u = res.data.user;
      setUser(u);
      setForm({ name: u.name || '', email: u.email || '' });
    } catch {
      setError('Impossible de charger votre profil.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    if (!form.name.trim() || !form.email.trim()) {
      return setError('Le nom et l\'email sont obligatoires.');
    }
    try {
      setSaving(true);
      await axios.put(
        `${API_URL}/users/me`,
        { name: form.name, email: form.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Profil mis à jour avec succès.');
      // Mettre à jour le user dans localStorage si besoin
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, name: form.name, email: form.email }));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        {/* Page title */}
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Compte</p>
          <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        </div>

        {/* Avatar + identité */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
          <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow">
              {getInitials(user?.name)}
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                Compte actif
              </span>
            </div>
          </div>

          {/* Formulaire */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Informations personnelles
            </p>

            <div className="space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all"
                    placeholder="Votre nom"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Feedback */}
            {error && (
              <div className="flex items-center gap-2 mt-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 mt-4 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-xs text-emerald-600">{success}</p>
              </div>
            )}

            <div className="flex justify-end mt-5">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 shadow-sm"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </div>

        {/* Section mot de passe */}
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Mot de passe</p>
                <p className="text-xs text-gray-400">Modifiez votre mot de passe de connexion</p>
              </div>
            </div>
            <button
              onClick={() => setShowPwdModal(true)}
              className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Changer
            </button>
          </div>
        </div>

      </div>

      {showPwdModal && (
        <PasswordModal onClose={() => setShowPwdModal(false)} token={token} />
      )}
    </div>
  );
}