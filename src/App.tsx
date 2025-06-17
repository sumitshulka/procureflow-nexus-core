
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/layout/Layout";

// Pages
import Index from "@/pages/Index";
import Dashboard from "@/pages/Dashboard";
import ProductCatalog from "@/pages/ProductCatalog";
import AddProduct from "@/pages/AddProduct";
import EditProduct from "@/pages/EditProduct";
import ProductDetail from "@/pages/ProductDetail";
import ProcurementRequests from "@/pages/ProcurementRequests";
import ProcurementRequestDetail from "@/pages/ProcurementRequestDetail";
import VendorManagement from "@/pages/VendorManagement";
import VendorRegistration from "@/pages/VendorRegistration";
import VendorRegistrationSuccess from "@/pages/VendorRegistrationSuccess";
import VendorPortal from "@/pages/VendorPortal";
import Approvals from "@/pages/Approvals";
import Settings from "@/pages/Settings";
import UserManagement from "@/pages/UserManagement";
import PerformanceAnalytics from "@/pages/analytics/PerformanceAnalytics";

// Auth pages
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import UpdatePasswordPage from "@/pages/auth/UpdatePasswordPage";
import UnauthorizedPage from "@/pages/auth/UnauthorizedPage";

// Inventory pages
import InventoryIndex from "@/pages/inventory/InventoryIndex";
import InventoryItems from "@/pages/inventory/InventoryItems";
import Warehouses from "@/pages/inventory/Warehouses";
import InventoryTransactions from "@/pages/inventory/InventoryTransactions";
import InventoryReports from "@/pages/inventory/InventoryReports";
import InventoryValuationReport from "@/pages/inventory/InventoryValuationReport";
import StockMovementReport from "@/pages/inventory/StockMovementReport";
import StockAgingReport from "@/pages/inventory/StockAgingReport";

// RFP pages
import CreateRfp from "@/pages/rfp/CreateRfp";
import CreateRfpWizard from "@/pages/rfp/CreateRfpWizard";
import ActiveRfps from "@/pages/rfp/ActiveRfps";
import RfpResponses from "@/pages/rfp/RfpResponses";

// Purchase Order pages
import CreatePurchaseOrder from "@/pages/purchase-orders/CreatePurchaseOrder";
import ActivePurchaseOrders from "@/pages/purchase-orders/ActivePurchaseOrders";
import PendingPurchaseOrders from "@/pages/purchase-orders/PendingPurchaseOrders";

import ProductPriceHistory from "@/pages/ProductPriceHistory";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            <Route path="/vendor-registration" element={<VendorRegistration />} />
            <Route path="/vendor-registration-success" element={<VendorRegistrationSuccess />} />
            <Route path="/vendor-portal" element={<VendorPortal />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/products" element={<ProductCatalog />} />
                      <Route path="/products/add" element={<AddProduct />} />
                      <Route path="/products/:id/edit" element={<EditProduct />} />
                      <Route path="/products/:id" element={<ProductDetail />} />
                      <Route path="/products/:id/price-history" element={<ProductPriceHistory />} />
                      <Route path="/procurement-requests" element={<ProcurementRequests />} />
                      <Route path="/procurement-requests/:id" element={<ProcurementRequestDetail />} />
                      <Route path="/vendors" element={<VendorManagement />} />
                      <Route path="/approvals" element={<Approvals />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/users" element={<UserManagement />} />
                      <Route path="/analytics/performance" element={<PerformanceAnalytics />} />

                      {/* Inventory routes */}
                      <Route path="/inventory" element={<InventoryIndex />} />
                      <Route path="/inventory/items" element={<InventoryItems />} />
                      <Route path="/inventory/warehouses" element={<Warehouses />} />
                      <Route path="/inventory/transactions" element={<InventoryTransactions />} />
                      <Route path="/inventory/reports" element={<InventoryReports />} />
                      <Route path="/inventory/reports/valuation" element={<InventoryValuationReport />} />
                      <Route path="/inventory/reports/stock-movement" element={<StockMovementReport />} />
                      <Route path="/inventory/reports/stock-aging" element={<StockAgingReport />} />

                      {/* RFP routes */}
                      <Route path="/rfp/create" element={<CreateRfp />} />
                      <Route path="/rfp/create-wizard" element={<CreateRfpWizard />} />
                      <Route path="/rfp/active" element={<ActiveRfps />} />
                      <Route path="/rfp/responses" element={<RfpResponses />} />

                      {/* Purchase Order routes */}
                      <Route path="/purchase-orders/create" element={<CreatePurchaseOrder />} />
                      <Route path="/purchase-orders/active" element={<ActivePurchaseOrders />} />
                      <Route path="/purchase-orders/pending" element={<PendingPurchaseOrders />} />

                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
