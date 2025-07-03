import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import VendorRegistrationPage from './pages/VendorRegistration';
import VendorRegistrationSuccess from './pages/VendorRegistrationSuccess';
import { QueryClient } from '@tanstack/react-query';
import VendorDashboard from './pages/VendorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import VendorRegistrationDuplicate from './pages/VendorRegistrationDuplicate';

function App() {
  return (
    <QueryClient>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/vendor-registration" element={<VendorRegistrationPage />} />
            <Route path="/vendor-registration/success" element={<VendorRegistrationSuccess />} />
            <Route path="/vendor-dashboard" element={<VendorDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/vendor-registration/duplicate" element={<VendorRegistrationDuplicate />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClient>
  );
}

export default App;
