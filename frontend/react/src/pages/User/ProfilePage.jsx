import React, { useState, useEffect } from 'react';
import { useNavigate , Link  } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight  } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/Navbar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getInitials = (name = '') =>
  name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

// ─── Floating blobs ────────────────────────────────────────────────────────────
function FloatingBlobs() {
  const blobs = [
    { x: 85, y: -5,  size: 220, color: '#8B5CF6', delay: 0,  duration: 22 },
    { x: -5, y: 60,  size: 160, color: '#EC4899', delay: 4,  duration: 18 },
    { x: 90, y: 55,  size: 130, color: '#3B82F6', delay: 8,  duration: 20 },
    { x: 10, y: 10,  size: 100, color: '#10B981', delay: 2,  duration: 25 },
    { x: 50, y: 80,  size: 180, color: '#8B5CF6', delay: 6,  duration: 16 },
  ];
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-[0.07] animate-float-slow"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: b.size,
            height: b.size,
            background: b.color,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Password Modal ────────────────────────────────────────────────────────────
function PasswordModal({ onClose, token }) {
  const [form, setForm]       = useState({ current: '', next: '', confirm: '' });
  const [show, setShow]       = useState({ current: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const toggle = (field) => setShow(s => ({ ...s, [field]: !s[field] }));

  const handleSubmit = async () => {
    setError('');
    if (!form.current || !form.next || !form.confirm)
      return setError('Tous les champs sont obligatoires.');
    if (form.next.length < 8)
      return setError('Le mot de passe doit contenir au moins 8 caractères.');
    if (form.next !== form.confirm)
      return setError('Les mots de passe ne correspondent pas.');
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
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-purple-100 animate-scale-in">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
            <Lock className="w-4 h-4 text-purple-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Changer le mot de passe</h2>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Mot de passe mis à jour !</p>
          </div>
        ) : (
          <>
            {['current', 'next', 'confirm'].map((field, i) => (
              <div key={field} className={i < 2 ? 'mb-3' : 'mb-4'}>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  {field === 'current'
                    ? 'Mot de passe actuel'
                    : field === 'next'
                    ? 'Nouveau mot de passe'
                    : 'Confirmer le nouveau mot de passe'}
                </label>
                <div className="relative">
                  <input
                    type={show[field] ? 'text' : 'password'}
                    value={form[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl bg-gray-50
                               focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400
                               transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => toggle(field)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {show[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}

            {error && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-2 mt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl
                           text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2.5 text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600
                           text-white rounded-xl hover:opacity-90 hover:shadow-lg transition-all
                           disabled:opacity-60 shadow-md shadow-purple-200"
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

// ─── Profile Page ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const navigate          = useNavigate();
  const { user, logout }  = useAuth();
  const token             = localStorage.getItem('token');

  const [scrollY, setScrollY]   = useState(0);
  const [languages, setLanguages] = useState([]);
  const [language, setLanguage]   = useState('fr');

  const [profileUser, setProfileUser]           = useState(null);
  const [form, setForm]                         = useState({ name: '', email: '' });
  const [loading, setLoading]                   = useState(true);
  const [saving, setSaving]                     = useState(false);
  const [error, setError]                       = useState('');
  const [success, setSuccess]                   = useState('');
  const [showPwdModal, setShowPwdModal]         = useState(false);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const r = await axios.get(`${API_URL}/translations/languages`);
        if (r.data.success) {
          setLanguages(
            r.data.languages
              .filter(l => l.is_active)
              .map(l => ({ code: l.code, name: l.name, flag: l.flag }))
          );
        }
      } catch {
        setLanguages([
          { code: 'fr', name: 'Français', flag: '🇫🇷' },
          { code: 'en', name: 'English',  flag: '🇬🇧' },
          { code: 'ar', name: 'العربية',  flag: '🇸🇦' },
        ]);
      }
    };
    loadLanguages();
  }, []);

  useEffect(() => {
    if (!token) return navigate('/login');
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const u = res.data.user;
      setProfileUser(u);
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
    if (!form.name.trim() || !form.email.trim())
      return setError("Le nom et l'email sont obligatoires.");
    try {
      setSaving(true);
      await axios.put(
        `${API_URL}/users/me`,
        { name: form.name, email: form.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Profil mis à jour avec succès.');
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, name: form.name, email: form.email }));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="relative">
          <div className="w-12 h-12 border-[3px] border-purple-100 border-t-purple-600 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    /* ── 1. Conteneur racine : h-screen + overflow-hidden = page non-scrollable ── */
    <div className="h-screen overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 relative">

      {/* Fond animé */}
      <FloatingBlobs />

      {/* Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        languages={languages}
        language={language}
        onLangChange={setLanguage}
        scrollY={scrollY}
      />

      {/* Bouton retour — sous la navbar */}
      <Link
        to="/"
        className="absolute top-20 left-6 z-50 flex items-center gap-2 px-4 py-2
                   bg-white/80 backdrop-blur-md rounded-xl shadow-lg hover:shadow-xl
                   transition-all border border-gray-200 text-gray-700 hover:text-purple-600"
      >
        <ArrowRight className="w-4 h-4 rotate-180" />
        <span className="text-sm font-medium">Retour</span>
      </Link>

      {/* ── 2. Zone scrollable interne ── */}
      <div className="relative z-10 h-full overflow-y-auto pt-24 sm:pt-28 pb-10 px-4">
        <div className="max-w-xl mx-auto">

          {/* Titre */}
          <div className="mb-7">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Compte</p>
            <h1 className="text-3xl font-bold text-gray-900">Mon profil</h1>
          </div>

          {/* Carte principale */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-purple-100
                          shadow-xl shadow-purple-100/40 overflow-hidden mb-4">

            {/* Header avatar */}
            <div className="flex items-center gap-4 px-6 py-5 border-b border-purple-100/60
                            bg-gradient-to-r from-purple-50/80 via-pink-50/80 to-blue-50/60">
              <div
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500
                           flex items-center justify-center text-white text-xl font-bold
                           flex-shrink-0 shadow-lg shadow-purple-200"
              >
                {getInitials(profileUser?.name)}
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">{profileUser?.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{profileUser?.email}</p>
                <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5
                                 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold
                                 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Compte actif
                </span>
              </div>
            </div>

            {/* Formulaire */}
            <div className="px-6 py-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
                Informations personnelles
              </p>

              <div className="space-y-4">
                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Nom complet
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50/80
                                 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400
                                 focus:bg-white transition-all"
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
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50/80
                                 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400
                                 focus:bg-white transition-all"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>
              </div>

              {/* Feedback */}
              {error && (
                <div className="flex items-center gap-2 mt-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 mt-4 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl animate-fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <p className="text-xs text-emerald-700">{success}</p>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600
                             text-white rounded-xl hover:opacity-90 hover:shadow-lg hover:shadow-purple-200
                             hover:scale-[1.02] transition-all disabled:opacity-60
                             shadow-md shadow-purple-100"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </div>
          </div>

          {/* Carte mot de passe */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-purple-100
                          shadow-xl shadow-purple-100/40 px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100
                               flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Mot de passe</p>
                  <p className="text-xs text-gray-400 mt-0.5">Modifiez votre mot de passe de connexion</p>
                </div>
              </div>
              <button
                onClick={() => setShowPwdModal(true)}
                className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl
                           text-gray-700 hover:border-purple-400 hover:text-purple-700
                           hover:bg-purple-50 transition-all flex-shrink-0"
              >
                Changer
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Modal mot de passe */}
      {showPwdModal && (
        <PasswordModal onClose={() => setShowPwdModal(false)} token={token} />
      )}

      {/* Animations */}
      <style>{`
        @keyframes float-slow {
          0%,100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-28px) scale(1.04); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .animate-float-slow  { animation: float-slow 20s ease-in-out infinite; }
        .animate-fade-in     { animation: fade-in .4s ease-out; }
        .animate-scale-in    { animation: scale-in .25s ease-out; }
      `}</style>
    </div>
  );
}
