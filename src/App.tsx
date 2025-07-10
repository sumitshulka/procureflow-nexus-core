
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import { UserRole } from '@/types';

// Import pages that actually exist
import Index from '@/pages/Index';
import LoginPage from '@/pages/auth/LoginPage';
import Dashboard from '@/pages/Dashboard';
import VendorManagement from '@/pages/VendorManagement';
import ProductVendorRelationships from '@/pages/ProductVendorRelationships';
import EditProduct from '@/pages/EditProduct';
import CreateRfp from '@/pages/CreateRfp';
import VendorRegistration from '@/pages/VendorRegistration';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/vendor-registration" element={<VendorRegistration />} />
          
          {/* Protected Admin Routes with Layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/vendors"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout>
                  <VendorManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/product-vendors"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout>
                  <ProductVendorRelationships />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/edit-product/:id"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout>
                  <EditProduct />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/create-rfp"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout>
                  <CreateRfp />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster />
      </div>
    </AuthProvider>
  );
}

export default App;
