
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import ProductCatalog from "./pages/ProductCatalog";
import AddProduct from "./pages/AddProduct";
import ProcurementRequests from "./pages/ProcurementRequests";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import UpdatePasswordPage from "./pages/auth/UpdatePasswordPage";
import UnauthorizedPage from "./pages/auth/UnauthorizedPage";
import NotFound from "./pages/NotFound";
import { UserRole } from "./types";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                
                {/* Catalog routes - accessible by specific roles */}
                <Route 
                  element={
                    <ProtectedRoute 
                      requiredRoles={[
                        UserRole.ADMIN, 
                        UserRole.PROCUREMENT_OFFICER, 
                        UserRole.INVENTORY_MANAGER
                      ]} 
                    />
                  }
                >
                  <Route path="/catalog" element={<ProductCatalog />} />
                  <Route path="/add-product" element={<AddProduct />} />
                </Route>
                
                {/* Procurement requests - accessible by all authenticated users */}
                <Route path="/requests" element={<ProcurementRequests />} />
                
                {/* Additional protected routes will be added here */}
              </Route>
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
