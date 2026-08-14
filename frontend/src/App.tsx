import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UserListPage from './pages/UserListPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ProductListPage from './pages/ProductListPage';
import CategoryListPage from './pages/CategoryListPage';
import ReportPage from './pages/ReportPage';

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/categories" element={<CategoryListPage />} />
        <Route path="/reports" element={<ReportPage />} />
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRole="admin">
              <UserListPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
