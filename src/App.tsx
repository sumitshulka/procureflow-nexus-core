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
import Dashboard from './pages/Dashboard';
import Layout from '@/components/layout/Layout';
import { Building2, Users, FileText } from 'lucide-react';
import { UserRole } from '@/types';

// Homepage component for procurement management system
const HomePage = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    {/* Header */}
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Procurement Management System</h1>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/login"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Staff Login
            </a>
            <a
              href="/vendor-registration"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Vendor Registration
            </a>
          </div>
        </div>
      </div>
    </header>

    {/* Main Content */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Procurement Management System
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Streamline your procurement process with our comprehensive platform for managing requests, 
          RFPs, vendor relationships, and purchase orders.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        {/* Staff Access */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-center mb-3">Staff Access</h3>
          <p className="text-gray-600 text-center mb-6">
            Access procurement dashboard, manage requests, approvals, and system administration
          </p>
          <div className="space-y-3">
            <a
              href="/login"
              className="block w-full bg-blue-600 text-white text-center px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Staff Login
            </a>
            <p className="text-xs text-gray-500 text-center">
              For employees, procurement officers, and administrators
            </p>
          </div>
        </div>

        {/* Vendor Portal */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <Building2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-center mb-3">Vendor Portal</h3>
          <p className="text-gray-600 text-center mb-6">
            Vendor access to RFPs, bid submissions, order management, and communications
          </p>
          <div className="space-y-3">
            <a
              href="/login"
              className="block w-full bg-green-600 text-white text-center px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Vendor Login
            </a>
            <a
              href="/vendor-registration"
              className="block w-full border border-green-600 text-green-600 text-center px-4 py-2 rounded-md hover:bg-green-50 transition-colors"
            >
              New Vendor Registration
            </a>
          </div>
        </div>

        {/* System Features */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <FileText className="w-12 h-12 text-purple-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-center mb-3">Key Features</h3>
          <ul className="text-gray-600 space-y-2 text-sm">
            <li>• Procurement Request Management</li>
            <li>• RFP Creation & Management</li>
            <li>• Vendor Registration & Evaluation</li>
            <li>• Purchase Order Processing</li>
            <li>• Inventory Management</li>
            <li>• Approval Workflows</li>
            <li>• Analytics & Reporting</li>
          </ul>
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
      </Routes>
    </AuthProvider>
  );
}

export default App;
