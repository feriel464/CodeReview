// src/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import CodeReview from '../pages/acceuil';
import Login from '../pages/login';
import Signup from '../pages/signup';
import AdminDashboard from '../pages/admin/Admindashboard';
import UserDashboard from '../pages/User/UserDashboard';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminRoute from '../components/AdminRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CodeReview />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Route Admin - Seulement accessible aux admins */}
      <Route 
        path="/admin/dashboard" 
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } 
      />
      
      {/* Route User - Accessible aux utilisateurs authentifiés */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        } 
      />

      {/* Redirection par défaut vers la page d'accueil */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
