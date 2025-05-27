import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import ProductCatalog from "@/pages/ProductCatalog";
import ProductDetail from "@/pages/ProductDetail";
import InventoryItems from "@/pages/inventory/InventoryItems";
import InventoryTransactions from "@/pages/inventory/InventoryTransactions";
import InventoryIndex from "@/pages/inventory/InventoryIndex";
import Warehouses from "@/pages/inventory/Warehouses";
import InventoryReports from "@/pages/inventory/InventoryReports";
import ProcurementRequests from "@/pages/ProcurementRequests";
import ProcurementRequestDetail from "@/pages/ProcurementRequestDetail";
import Settings from "@/pages/Settings";
import Approvals from "@/pages/Approvals";
import UserManagement from "@/pages/UserManagement";
import VendorRegistration from "@/pages/VendorRegistration";
import VendorRegistrationSuccess from "@/pages/VendorRegistrationSuccess";
import VendorManagement from "@/pages/VendorManagement";
import VendorPortal from "@/pages/VendorPortal";
import CreateRfp from "@/pages/rfp/CreateRfp";
import ActiveRfps from "@/pages/rfp/ActiveRfps";
import RfpResponses from "@/pages/rfp/RfpResponses";
import CreatePurchaseOrder from "@/pages/purchase-orders/CreatePurchaseOrder";
import PendingPurchaseOrders from "@/pages/purchase-orders/PendingPurchaseOrders";
import ActivePurchaseOrders from "@/pages/purchase-orders/ActivePurchaseOrders";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import NotFoundPage from "@/components/common/NotFoundPage";
import LoginPage from "@/pages/auth/LoginPage";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import CreateRfpWizard from "@/pages/rfp/CreateRfpWizard";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/vendor-register" element={<VendorRegistration />} />
          <Route path="/vendor-registration-success" element={<VendorRegistrationSuccess />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="/catalog" element={<ProductCatalog />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/inventory" element={<InventoryIndex />}>
                <Route index element={<InventoryItems />} />
                <Route path="items" element={<InventoryItems />} />
                <Route path="transactions" element={<InventoryTransactions />} />
                <Route path="warehouses" element={<Warehouses />} />
                <Route path="reports" element={<InventoryReports />} />
              </Route>
              <Route path="/requests" element={<ProcurementRequests />} />
              <Route path="/requests/:id" element={<ProcurementRequestDetail />} />
              
              {/* RFP Routes */}
              <Route path="/rfp/create" element={<CreateRfp />} />
              <Route path="/rfp/create/wizard" element={<CreateRfpWizard />} />
              <Route path="/rfp/active" element={<ActiveRfps />} />
              <Route path="/rfp/:rfpId/responses" element={<RfpResponses />} />
              
              {/* Purchase Order Routes */}
              <Route path="/purchase-orders/create" element={<CreatePurchaseOrder />} />
              <Route path="/purchase-orders/pending" element={<PendingPurchaseOrders />} />
              <Route path="/purchase-orders/active" element={<ActivePurchaseOrders />} />
              
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/vendors" element={<VendorManagement />} />
              <Route path="/vendor-portal" element={<VendorPortal />} />
              {/* Catch-all route for undefined paths */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
