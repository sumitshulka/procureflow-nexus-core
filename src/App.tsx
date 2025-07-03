import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import VendorRegistrationPage from './pages/VendorRegistration';
import VendorRegistrationSuccess from './pages/VendorRegistrationSuccess';
import VendorRegistrationDuplicate from './pages/VendorRegistrationDuplicate';

// Simple HomePage component
const HomePage = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-foreground mb-4">Welcome to Vendor Portal</h1>
      <a href="/vendor-registration" className="text-primary hover:underline">
        Go to Vendor Registration
      </a>
    </div>
  </div>
);

function App() {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/vendor-registration" element={<VendorRegistrationPage />} />
        <Route path="/vendor-registration/success" element={<VendorRegistrationSuccess />} />
        <Route path="/vendor-registration/duplicate" element={<VendorRegistrationDuplicate />} />
      </Routes>
    </>
  );
}

export default App;
