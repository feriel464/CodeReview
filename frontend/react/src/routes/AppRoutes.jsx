import { Routes, Route } from 'react-router-dom';
import CodeReview from '../pages/acceuil';
import Login from '../pages/login';
import Signup from '../pages/signup';
import AdminDashboard from '../pages/admin/Admindashboard';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CodeReview />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<AdminDashboard />}  />
    </Routes>
  );
}
