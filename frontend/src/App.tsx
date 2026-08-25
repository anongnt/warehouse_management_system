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
import ExpenseSummaryPage from './pages/ExpenseSummaryPage';
import StockBalancePage from './pages/StockBalancePage';
import StockReceiptPage from './pages/StockReceiptPage';
import StockIssuePage from './pages/StockIssuePage';
import StockAdjustmentPage from './pages/StockAdjustmentPage';
import StockMovementPage from './pages/StockMovementPage';

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/categories" element={<CategoryListPage />} />
        <Route path="/reports" element={<ExpenseSummaryPage />} />
        <Route path="/expense-summary" element={<ExpenseSummaryPage />} />

        {/* Stock management */}
        <Route path="/stock/balances" element={<StockBalancePage />} />
        <Route path="/stock/receipts/new" element={<StockReceiptPage />} />
        <Route path="/stock/issues/new" element={<StockIssuePage />} />
        <Route path="/stock/movements" element={<StockMovementPage />} />
        <Route
          path="/stock/adjustments/new"
          element={
            <ProtectedRoute requiredRole="admin">
              <StockAdjustmentPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRole="admin">
              <UserListPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
