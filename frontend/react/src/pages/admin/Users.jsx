import React, { useState } from 'react';
import { 
  Search, Filter, Plus, Edit, Trash2, Mail, Phone, MapPin, 
  Calendar, MoreVertical, Eye, Ban, CheckCircle, Clock,
  ArrowUp, ArrowDown, Users as UsersIcon, UserCheck, UserX,
  Download, Upload, X, Save
} from 'lucide-react';

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    status: 'active'
  });

  const [users, setUsers] = useState([
    {
      id: 1,
      name: 'Marie Dubois',
      email: 'marie.dubois@example.com',
      phone: '+33 6 12 34 56 78',
      status: 'active',
      avatar: 'MD',
      location: 'Paris, France',
      joinDate: '15 Jan 2024',
      lastActive: '5 min',
      analyses: 234,
      score: 92
    },
    {
      id: 2,
      name: 'Jean Martin',
      email: 'jean.martin@example.com',
      phone: '+33 6 23 45 67 89',
      status: 'active',
      avatar: 'JM',
      location: 'Lyon, France',
      joinDate: '20 Fév 2024',
      lastActive: '12 min',
      analyses: 156,
      score: 88
    },
    {
      id: 3,
      name: 'Sophie Laurent',
      email: 'sophie.laurent@example.com',
      phone: '+33 6 34 56 78 90',
      status: 'active',
      avatar: 'SL',
      location: 'Marseille, France',
      joinDate: '10 Jan 2024',
      lastActive: '1 heure',
      analyses: 421,
      score: 95
    },
    {
      id: 4,
      name: 'Pierre Durand',
      email: 'pierre.durand@example.com',
      phone: '+33 6 45 67 89 01',
      status: 'inactive',
      avatar: 'PD',
      location: 'Toulouse, France',
      joinDate: '05 Mar 2024',
      lastActive: '2 jours',
      analyses: 78,
      score: 82
    },
    {
      id: 5,
      name: 'Claire Bernard',
      email: 'claire.bernard@example.com',
      phone: '+33 6 56 78 90 12',
      status: 'active',
      avatar: 'CB',
      location: 'Nice, France',
      joinDate: '25 Fév 2024',
      lastActive: '30 min',
      analyses: 189,
      score: 89
    },
    {
      id: 6,
      name: 'Thomas Petit',
      email: 'thomas.petit@example.com',
      phone: '+33 6 67 89 01 23',
      status: 'active',
      avatar: 'TP',
      location: 'Nantes, France',
      joinDate: '12 Jan 2024',
      lastActive: '15 min',
      analyses: 312,
      score: 91
    }
  ]);

  // Ouvrir le modal pour ajouter un utilisateur
  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      location: '',
      status: 'active'
    });
    setShowModal(true);
  };

  // Ouvrir le modal pour éditer un utilisateur
  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      status: user.status
    });
    setShowModal(true);
  };

  // Fermer le modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      location: '',
      status: 'active'
    });
  };

  // Gérer les changements dans le formulaire
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Sauvegarder l'utilisateur (ajout ou modification)
  const handleSaveUser = (e) => {
    e.preventDefault();
    
    if (editingUser) {
      // Modification d'un utilisateur existant
      setUsers(users.map(user => 
        user.id === editingUser.id 
          ? {
              ...user,
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              location: formData.location,
              status: formData.status,
              avatar: formData.name.split(' ').map(n => n[0]).join('').toUpperCase()
            }
          : user
      ));
    } else {
      // Ajout d'un nouvel utilisateur
      const newUser = {
        id: users.length + 1,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        status: formData.status,
        avatar: formData.name.split(' ').map(n => n[0]).join('').toUpperCase(),
        joinDate: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
        lastActive: 'À l\'instant',
        analyses: 0,
        score: 0
      };
      setUsers([...users, newUser]);
    }
    
    handleCloseModal();
  };

  // Filtrer les utilisateurs
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Statistiques
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    newToday: 3
  };

  const StatCard = ({ icon: Icon, title, value, change, gradient, trend }) => (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all group cursor-pointer transform hover:scale-105 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br ${gradient} rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
        </div>
        <div className={`flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-bold ${
          trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        }`}>
          {trend === 'up' ? <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4" />}
          {change}%
        </div>
      </div>
      <div>
        <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in min-h-screen p-3 sm:p-6 lg:p-8">
      {/* En-tête */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Utilisateurs</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 transition-all text-xs sm:text-sm font-semibold">
              <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Importer</span>
            </button>
            <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 transition-all text-xs sm:text-sm font-semibold">
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Exporter</span>
            </button>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <StatCard 
          icon={UsersIcon}
          title="Total utilisateurs"
          value={stats.total}
          change={12.5}
          gradient="from-purple-500 to-purple-600"
          trend="up"
        />
        <StatCard 
          icon={UserCheck}
          title="Utilisateurs actifs"
          value={stats.active}
          change={8.3}
          gradient="from-green-500 to-green-600"
          trend="up"
        />
        <StatCard 
          icon={UserX}
          title="Utilisateurs inactifs"
          value={stats.inactive}
          change={-3.2}
          gradient="from-red-500 to-red-600"
          trend="down"
        />
        <StatCard 
          icon={Clock}
          title="Nouveaux aujourd'hui"
          value={stats.newToday}
          change={15.7}
          gradient="from-blue-500 to-blue-600"
          trend="up"
        />
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-100 rounded-xl border-2 border-transparent focus:border-purple-500 focus:bg-white transition-all outline-none text-xs sm:text-sm"
            />
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                filterStatus === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                filterStatus === 'active'
                  ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Actifs
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                filterStatus === 'inactive'
                  ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inactifs
            </button>
            <button className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all text-xs sm:text-sm font-semibold">
              <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Plus de filtres</span>
              <span className="sm:hidden">Filtres</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table des utilisateurs - Version compacte et responsive */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Liste des utilisateurs</h2>
              <p className="text-xs sm:text-sm text-gray-600">{filteredUsers.length} utilisateur(s) trouvé(s)</p>
            </div>
          </div>
        </div>

        {/* Vue mobile - Cards */}
        <div className="block lg:hidden divide-y divide-gray-200">
          {filteredUsers.map((user) => (
            <div key={user.id} className="p-4 hover:bg-purple-50 transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                  {user.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{user.location}</span>
                  </p>
                  {user.status === 'active' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold mt-2">
                      <CheckCircle className="w-3 h-3" />
                      Actif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold mt-2">
                      <Ban className="w-3 h-3" />
                      Inactif
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-1.5 mb-3 text-xs">
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-3 h-3 text-purple-600 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="w-3 h-3 text-purple-600 flex-shrink-0" />
                  <span>{user.phone}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-gray-500">Analyses:</span>
                    <span className="font-bold text-gray-900 ml-1">{user.analyses}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Score:</span>
                    <span className="font-bold text-gray-900 ml-1">{user.score}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleEditUser(user)}
                    className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button 
                    className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Vue desktop - Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Utilisateur</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Analyses</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Score</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Activité</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-purple-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {user.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {user.location}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-xs text-gray-700">
                        <Mail className="w-3 h-3 text-purple-600" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-700">
                        <Phone className="w-3 h-3 text-purple-600" />
                        <span>{user.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.status === 'active' ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold w-fit">
                        <CheckCircle className="w-3 h-3" />
                        Actif
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold w-fit">
                        <Ban className="w-3 h-3" />
                        Inactif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-gray-900 text-sm">{user.analyses}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5 w-12">
                        <div 
                          className={`h-1.5 rounded-full ${
                            user.score >= 90 ? 'bg-green-500' : user.score >= 80 ? 'bg-blue-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${user.score}%` }}
                        />
                      </div>
                      <span className="font-bold text-gray-900 text-xs">{user.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600">{user.lastActive}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button 
                        className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors group"
                        title="Voir le profil"
                      >
                        <Eye className="w-4 h-4 text-gray-600 group-hover:text-purple-600" />
                      </button>
                      <button 
                        onClick={() => handleEditUser(user)}
                        className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors group"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                      </button>
                      <button 
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors group"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                      </button>
                      <button 
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Plus d'options"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t-2 border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-gray-600">
              Affichage de <span className="font-bold">1-{filteredUsers.length}</span> sur <span className="font-bold">{users.length}</span> utilisateurs
            </p>
            <div className="flex items-center gap-1 sm:gap-2">
              <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-all text-xs sm:text-sm font-semibold">
                Préc.
              </button>
              <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg shadow-lg text-xs sm:text-sm font-semibold">
                1
              </button>
              <button className="hidden sm:block px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-all text-sm font-semibold">
                2
              </button>
              <button className="hidden sm:block px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-all text-sm font-semibold">
                3
              </button>
              <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-all text-xs sm:text-sm font-semibold">
                Suiv.
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message si aucun résultat */}
      {filteredUsers.length === 0 && (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-lg border-2 border-gray-200 mt-6 sm:mt-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 sm:w-12 sm:h-12 text-purple-600" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
          <p className="text-sm sm:text-base text-gray-600">Essayez de modifier vos critères de recherche</p>
        </div>
      )}

      {/* Modal de formulaire (Ajout/Modification) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in border-2 border-gray-200">
            {/* En-tête du modal */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                </h2>
                <p className="text-purple-100 text-xs mt-0.5">
                  {editingUser ? 'Modifiez les informations' : 'Ajoutez un nouvel utilisateur'}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSaveUser} className="p-6">
              <div className="space-y-4">
                {/* Nom complet */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Nom complet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Ex: Marie Dubois"
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all outline-none"
                  />
                </div>

                {/* Email et Téléphone sur la même ligne en desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="exemple@email.com"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Téléphone */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Téléphone <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        placeholder="+33 6 12 34 56 78"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Localisation */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Localisation <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      required
                      placeholder="Paris, France"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Statut <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      <input
                        type="radio"
                        name="status"
                        value="active"
                        checked={formData.status === 'active'}
                        onChange={handleInputChange}
                        className="hidden peer"
                      />
                      <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl cursor-pointer transition-all peer-checked:border-green-500 peer-checked:bg-green-50 peer-checked:text-green-700 hover:border-green-300">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-semibold text-sm">Actif</span>
                      </div>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="status"
                        value="inactive"
                        checked={formData.status === 'inactive'}
                        onChange={handleInputChange}
                        className="hidden peer"
                      />
                      <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl cursor-pointer transition-all peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:text-red-700 hover:border-red-300">
                        <Ban className="w-4 h-4" />
                        <span className="font-semibold text-sm">Inactif</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl transition-all font-semibold text-sm"
                >
                  <Save className="w-4 h-4" />
                  {editingUser ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}