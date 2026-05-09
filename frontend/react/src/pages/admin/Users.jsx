import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, Plus, Edit, Trash2, Mail, Phone, MapPin,
  Calendar, MoreVertical, Eye, Ban, CheckCircle, Clock,
  ArrowUp, ArrowDown, Users as UsersIcon, UserCheck, UserX,
  Download, Upload, X, Save, Loader2, AlertCircle
} from 'lucide-react';

// ─── Config ──────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || ' ';

// ─── Helpers ─────────────────────────────────────────────────
const getAvatar = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) : '—';

// ─── Toast ───────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => (
  <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold transition-all ${
    type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
  }`}>
    {type === 'error'
      ? <AlertCircle className="w-4 h-4 flex-shrink-0" />
      : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
    {message}
    <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100">
      <X className="w-4 h-4" />
    </button>
  </div>
);

// ─── StatCard ─────────────────────────────────────────────────
const StatCard = ({ icon: Icon, title, value, change, gradient, trend }) => (
  <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all group cursor-pointer transform hover:scale-105">
    <div className="flex items-center justify-between mb-3 sm:mb-4">
      <div className={`w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br ${gradient} rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
      </div>
      <div className={`flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-bold ${
        trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
      }`}>
        {trend === 'up'
          ? <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4" />
          : <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4" />}
        {change}%
      </div>
    </div>
    <div>
      <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════
// Composant principal
// ═════════════════════════════════════════════════════════════
export default function UsersPage() {
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal]       = useState(false);
  const [editingUser, setEditingUser]   = useState(null);
  const [saving, setSaving]             = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [toast, setToast]               = useState(null);
  const [formData, setFormData]         = useState({ name: '', email: '', role: 'user' });

  // ── Toast helper ────────────────────────────────────────────
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch users ─────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm)              params.set('search', searchTerm);
      if (filterStatus !== 'all') params.set('status', filterStatus);

      const res = await fetch(`${API_BASE}/users?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setError('Impossible de charger les utilisateurs. Vérifiez que le serveur est démarré.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, searchTerm ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchUsers, searchTerm]);


  // ── Stats calculées côté client ─────────────────────────────
  const stats = {
    total:    users.length,
    active:   users.filter(u => u.role !== 'banned').length,
    inactive: users.filter(u => u.role === 'banned').length,
  };

  // ── Export PDF ──────────────────────────────────────────────
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      // On passe les mêmes filtres actifs au backend
      const params = new URLSearchParams();
      if (searchTerm)              params.set('search', searchTerm);
      if (filterStatus !== 'all') params.set('status', filterStatus);

      const res = await fetch(`${API_BASE}/users/export/pdf?${params}`, {
        method: 'GET',
        headers: {
          // Décommente si tu as un middleware JWT :
          // Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!res.ok) throw new Error('Erreur lors de la génération du PDF');

      // Déclenche le téléchargement dans le navigateur
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = url;
      link.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast('PDF téléchargé avec succès');
    } catch (err) {
      showToast(err.message || 'Erreur export PDF', 'error');
    } finally {
      setExporting(false);
    }
  };

  // ── Modal helpers ───────────────────────────────────────────
  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'user' });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, role: user.role });
    setShowModal(true);
  };

  const handleCloseModal = () => { setShowModal(false); setEditingUser(null); };

  // ── Save (POST / PUT) ───────────────────────────────────────
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url    = editingUser ? `${API_BASE}/users/${editingUser.id}` : `${API_BASE}/users`;
      const method = editingUser ? 'PUT' : 'POST';
      const body   = editingUser
        ? { name: formData.name, email: formData.email, role: formData.role }
        : { name: formData.name, email: formData.email, role: formData.role };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Erreur serveur');
      }
      handleCloseModal();
      fetchUsers();
      showToast(editingUser ? 'Utilisateur modifié' : 'Utilisateur ajouté');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────
  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Supprimer "${name}" ?`)) return;
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur lors de la suppression');
      fetchUsers();
      showToast('Utilisateur supprimé');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-3 sm:p-6 lg:p-8">

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* En-tête */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Utilisateurs</h1>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
          

            {/* ── Exporter PDF ── */}
            <button
              onClick={handleExportPDF}
              disabled={exporting || loading}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 transition-all text-xs sm:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting
                ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-purple-500" />
                : <Download className="w-3 h-3 sm:w-4 sm:h-4" />}
              <span className="hidden sm:inline">
                {exporting ? 'Génération…' : 'Exporter PDF'}
              </span>
              <span className="sm:hidden">{exporting ? '…' : 'PDF'}</span>
            </button>

            {/* Nouvel utilisateur */}
            <button
              onClick={handleAddUser}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl transition-all text-xs sm:text-sm font-semibold"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Nouvel utilisateur</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
          </div>
        </div>
        <p className="text-sm sm:text-base text-gray-600">Gérez tous vos utilisateurs et leurs accès</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <StatCard icon={UsersIcon} title="Total utilisateurs"    value={stats.total}    change={12.5} gradient="from-purple-500 to-purple-600" trend="up" />
        <StatCard icon={UserCheck} title="Utilisateurs actifs"   value={stats.active}   change={8.3}  gradient="from-green-500 to-green-600"  trend="up" />
        <StatCard icon={UserX}     title="Utilisateurs inactifs" value={stats.inactive} change={3.2}  gradient="from-red-500 to-red-600"     trend="down" />
      </div>

      {/* Recherche & filtres */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-100 rounded-xl border-2 border-transparent focus:border-purple-500 focus:bg-white transition-all outline-none text-xs sm:text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', 'active', 'inactive'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                  filterStatus === s
                    ? s === 'all'    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
                    : s === 'active' ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg'
                                     : 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {{ all: 'Tous', active: 'Actifs', inactive: 'Inactifs' }[s]}
              </button>
            ))}
           
          </div>
        </div>
      </div>

      {/* Chargement */}
      {loading && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-12 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Chargement des utilisateurs…</p>
        </div>
      )}

      {/* Erreur */}
      {!loading && error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 flex flex-col items-center gap-3">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <p className="text-red-700 font-semibold text-sm text-center">{error}</p>
          <button onClick={fetchUsers} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all">
            Réessayer
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Liste des utilisateurs</h2>
              <p className="text-xs sm:text-sm text-gray-600">{users.length} utilisateur(s) trouvé(s)</p>
            </div>
            {/* Bouton export rapide dans le header de la table */}
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 transition-all text-xs font-semibold disabled:opacity-50"
            >
              {exporting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Download className="w-3.5 h-3.5" />}
              {exporting ? 'Génération…' : 'Exporter PDF'}
            </button>
          </div>

          {/* Vue mobile — Cards */}
          <div className="block lg:hidden divide-y divide-gray-200">
            {users.map((user) => (
              <div key={user.id} className="p-4 hover:bg-purple-50 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                    {getAvatar(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mt-2 ${
                      user.role === 'admin'  ? 'bg-purple-100 text-purple-700' :
                      user.role === 'banned' ? 'bg-red-100 text-red-700'       :
                                               'bg-green-100 text-green-700'
                    }`}>
                      {user.role === 'banned' ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                      {user.role}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Inscrit le {formatDate(user.created_at)}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEditUser(user)} className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors">
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button onClick={() => handleDeleteUser(user.id, user.name)} className="p-1.5 hover:bg-red-100 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Vue desktop — Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Utilisateur', 'Email', 'Rôle', 'Inscrit le', 'Mis à jour', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-purple-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0">
                          {getAvatar(user.name)}
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-700">
                        <Mail className="w-3 h-3 text-purple-600 flex-shrink-0" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold w-fit ${
                        user.role === 'admin'  ? 'bg-purple-100 text-purple-700' :
                        user.role === 'banned' ? 'bg-red-100 text-red-700'       :
                                                 'bg-green-100 text-green-700'
                      }`}>
                        {user.role === 'banned' ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {formatDate(user.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {formatDate(user.updated_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors group"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="p-1.5 hover:bg-red-100 rounded-lg transition-colors group"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Aucun résultat */}
          {users.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
              <p className="text-sm text-gray-600">Essayez de modifier vos critères de recherche</p>
            </div>
          )}
        </div>
      )}

      {/* Modal ajout / édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-2 border-gray-200">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingUser ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
                </h2>
                <p className="text-purple-100 text-xs mt-0.5">
                  {editingUser ? 'Modifiez les informations' : 'Ajoutez un nouvel utilisateur'}
                </p>
              </div>
              <button onClick={handleCloseModal} className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" required
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex : Marie Dubois"
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email" required
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="exemple@email.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Rôle</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all outline-none"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                  <option value="banned">banned</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl transition-all font-semibold text-sm disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingUser ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
