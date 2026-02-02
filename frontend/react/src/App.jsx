// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/login';
import Signup from './pages/signup';
import CodeReview from './pages/acceuil';
import AdminDashboard from './pages/admin/Admindashboard';
import UserDashboard from './pages/User/UserDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Routes publiques */}
      <Route path="/" element={<CodeReview />} />
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} replace /> : <Login />} 
      />
      <Route 
        path="/signup" 
        element={isAuthenticated ? <Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} replace /> : <Signup />} 
      />
      
      {/* Routes protégées - Admin */}
      <Route 
        path="/admin/dashboard" 
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } 
      />
      
      {/* Routes protégées - User normal */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            {isAdmin ? <Navigate to="/admin/dashboard" replace /> : <UserDashboard />}
          </ProtectedRoute>
        } 
      />
      
      {/* Redirection par défaut */}
      <Route 
        path="*" 
        element={<Navigate to={isAuthenticated ? (isAdmin ? "/admin/dashboard" : "/dashboard") : "/"} replace />} 
      />
    </Routes>
  );
}

export default App;