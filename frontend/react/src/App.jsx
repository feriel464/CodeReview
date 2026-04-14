import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/login';
import Signup from './pages/signup';
import CodeReview from './pages/acceuil';
import AdminDashboard from './pages/admin/Admindashboard';
import UserDashboard from './pages/User/UserDashboard';
import AnalysisPage from './pages/User/AnalysisPage';
import HistoryPage from './pages/User/HistoryPage';
import SettingsPage from './pages/admin/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import SecurityAnalysis from './pages/SecurityAnalysis';
import OAuthCallback from './pages/googlegitauth/OAuthCallback';
import ResetPassword from './pages/ResetPassword';

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
      <Route path="/oauth-callback" element={<OAuthCallback />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Routes protégées - Admin */}
      <Route 
        path="/admin/dashboard" 
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } 
      />
      
      <Route 
        path="/settings" 
        element={
          <AdminRoute>
            <SettingsPage />
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

      {/* 🆕 Route d'analyse pour utilisateurs connectés */}
      <Route 
        path="/analyze" 
        element={
          <ProtectedRoute>
            {isAdmin ? <Navigate to="/admin/dashboard" replace /> : <AnalysisPage />}
          </ProtectedRoute>
        } 
      />

      {/* 🆕 Route d'historique pour utilisateurs connectés */}
      <Route 
        path="/history" 
        element={
          <ProtectedRoute>
            {isAdmin ? <Navigate to="/admin/dashboard" replace /> : <HistoryPage />}
          </ProtectedRoute>
        } 
      />
      <Route path="/security" element={<SecurityAnalysis />} />

      {/* Redirection par défaut */}
      <Route 
        path="*" 
        element={<Navigate to={isAuthenticated ? (isAdmin ? "/admin/dashboard" : "/dashboard") : "/"} replace />} 
      />
    </Routes>
  );
}

export default App;