
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
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
          
          {/* Protected Admin Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/vendors"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <VendorManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/product-vendors"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <ProductVendorRelationships />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/edit-product/:id"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <EditProduct />
              </ProtectedRoute>
            }
          />

          <Route
            path="/create-rfp"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <CreateRfp />
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
