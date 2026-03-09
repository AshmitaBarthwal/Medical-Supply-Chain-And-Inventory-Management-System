import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import AddStock from './pages/AddStock';
import Billing from './pages/Billing';
import Sales from './pages/Sales';
import Alerts from './pages/Alerts';
import Predictions from './pages/Predictions';
import CustomerLedger from './pages/CustomerLedger';
import ProductSales from './pages/ProductSales';
import Users from './pages/Users';
import ChangePassword from './pages/ChangePassword';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div className="spinner"></div>;
  }

  if (isAuthenticated && user?.mustChangePassword && window.location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
};

// App Routes
const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/stock"
        element={
          <ProtectedRoute>
            <Layout>
              <Stock />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/add-stock"
        element={
          <ProtectedRoute>
            <Layout>
              <AddStock />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <Layout>
              <Billing />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/sales"
        element={
          <ProtectedRoute>
            <Layout>
              <Sales />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <Layout>
              <Alerts />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/predictions"
        element={
          <ProtectedRoute>
            <Layout>
              <Predictions />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ledger"
        element={
          <ProtectedRoute>
            <Layout>
              <CustomerLedger />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Layout>
              <Users />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/product-sales"
        element={
          <ProtectedRoute>
            <Layout>
              <ProductSales />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/change-password"
        element={
          isAuthenticated ? <ChangePassword /> : <Navigate to="/" replace />
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
