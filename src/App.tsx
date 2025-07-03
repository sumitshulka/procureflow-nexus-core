import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import VendorRegistrationPage from './pages/VendorRegistration';
import VendorRegistrationSuccess from './pages/VendorRegistrationSuccess';
import VendorRegistrationDuplicate from './pages/VendorRegistrationDuplicate';
import VendorDashboard from './pages/VendorDashboard';
import { Building2, Users } from 'lucide-react';
import { UserRole } from '@/types';

// Simple HomePage component
const HomePage = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="max-w-4xl mx-auto text-center px-4">
      <div className="bg-white rounded-lg shadow-xl p-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Building2 className="w-12 h-12 text-blue-600" />
          <h1 className="text-4xl font-bold text-gray-900">Vendor Portal</h1>
        </div>
        <p className="text-xl text-gray-600 mb-8">
          Your gateway to procurement opportunities and vendor management
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-3">Existing Vendors</h2>
            <p className="text-gray-600 mb-4">
              Access your vendor dashboard to manage RFPs, orders, and communications
            </p>
            <a
              href="/login"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Login to Portal
            </a>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg">
            <Building2 className="w-8 h-8 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-3">New Vendors</h2>
            <p className="text-gray-600 mb-4">
              Register your company to join our vendor network and start bidding
            </p>
            <a
              href="/vendor-registration"
              className="inline-block bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Register Now
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Toaster />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/vendor-registration" element={<VendorRegistrationPage />} />
        <Route path="/vendor-registration/success" element={<VendorRegistrationSuccess />} />
        <Route path="/vendor-registration/duplicate" element={<VendorRegistrationDuplicate />} />
        <Route 
          path="/vendor-dashboard" 
          element={
            <ProtectedRoute requiredRole={UserRole.VENDOR}>
              <VendorDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
