
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
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import UpdatePasswordPage from "./pages/auth/UpdatePasswordPage";
import UnauthorizedPage from "./pages/auth/UnauthorizedPage";
import NotFound from "./pages/NotFound";

// Inventory pages
import InventoryIndex from "./pages/inventory/InventoryIndex";
import InventoryItems from "./pages/inventory/InventoryItems";
import Warehouses from "./pages/inventory/Warehouses";
import InventoryTransactions from "./pages/inventory/InventoryTransactions";

import { UserRole } from "./types";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
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
                
                {/* Inventory routes - accessible by admin and inventory managers */}
                <Route 
                  element={
                    <ProtectedRoute 
                      requiredRoles={[
                        UserRole.ADMIN, 
                        UserRole.INVENTORY_MANAGER
                      ]} 
                    />
                  }
                >
                  <Route path="/inventory" element={<InventoryIndex />}>
                    <Route index element={<InventoryItems />} />
                    <Route path="warehouses" element={<Warehouses />} />
                    <Route path="transactions" element={<InventoryTransactions />} />
                  </Route>
                </Route>
                
                {/* User Management - accessible by admins */}
                <Route 
                  element={
                    <ProtectedRoute 
                      requiredRoles={[UserRole.ADMIN]} 
                    />
                  }
                >
                  <Route path="/users" element={<UserManagement />} />
                </Route>
                
                {/* Settings - accessible by admins */}
                <Route 
                  element={
                    <ProtectedRoute 
                      requiredRoles={[UserRole.ADMIN]} 
                    />
                  }
                >
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
            </Route>
            
            {/* Redirect root to dashboard */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
