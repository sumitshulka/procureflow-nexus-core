import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/types';

// Import pages
import Index from '@/pages/Index';
import LoginPage from '@/pages/LoginPage';
import Dashboard from '@/pages/Dashboard';
import VendorManagement from '@/pages/VendorManagement';
import ProductVendorRelationships from '@/pages/ProductVendorRelationships';
import ProfilePage from '@/pages/ProfilePage';
import ProcurementRequestPage from '@/pages/ProcurementRequestPage';
import InventoryDashboard from '@/pages/inventory/InventoryDashboard';
import InventoryRequestPage from '@/pages/inventory/InventoryRequestPage';
import InventoryManagementPage from '@/pages/inventory/InventoryManagementPage';
import VendorRegistrationPage from '@/pages/VendorRegistrationPage';
import VendorProducts from '@/pages/vendor/VendorProducts';
import RFQManagement from '@/pages/RFQManagement';
import CreateRFQ from '@/pages/CreateRFQ';
import ViewRFQ from '@/pages/ViewRFQ';
import ProductManagement from '@/pages/ProductManagement';
import CategoryManagement from '@/pages/CategoryManagement';
import UnitManagement from '@/pages/UnitManagement';
import ProductDetailsPage from '@/pages/ProductDetailsPage';
import CreateProduct from '@/pages/CreateProduct';
import EditProduct from '@/pages/EditProduct';
import RFQResponsePage from '@/pages/RFQResponsePage';
import OrderManagementPage from '@/pages/OrderManagementPage';
import OrderDetailsPage from '@/pages/OrderDetailsPage';
import CreateOrderPage from '@/pages/CreateOrderPage';
import PaymentManagementPage from '@/pages/PaymentManagementPage';
import PaymentDetailsPage from '@/pages/PaymentDetailsPage';
import CreatePaymentPage from '@/pages/CreatePaymentPage';
import UserManagementPage from '@/pages/UserManagementPage';
import CreateUserPage from '@/pages/CreateUserPage';
import EditUserPage from '@/pages/EditUserPage';
import ActivityLogsPage from '@/pages/ActivityLogsPage';
import ApprovalManagementPage from '@/pages/ApprovalManagementPage';
import SettingsPage from '@/pages/SettingsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected Admin Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER, UserRole.REQUESTER, UserRole.INVENTORY_MANAGER]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/vendors"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <VendorManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/product-vendors"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <ProductVendorRelationships />
                </ProtectedRoute>
              }
            />
            
            {/* Protected Requester Routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER, UserRole.REQUESTER, UserRole.INVENTORY_MANAGER]}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/procurement-requests"
              element={
                <ProtectedRoute allowedRoles={[UserRole.REQUESTER]}>
                  <ProcurementRequestPage />
                </ProtectedRoute>
              }
            />
          
            {/* Protected Inventory Routes */}
            <Route
              path="/inventory"
              element={
                <ProtectedRoute allowedRoles={[UserRole.INVENTORY_MANAGER]}>
                  <InventoryDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory-requests"
              element={
                <ProtectedRoute allowedRoles={[UserRole.INVENTORY_MANAGER]}>
                  <InventoryRequestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory-management"
              element={
                <ProtectedRoute allowedRoles={[UserRole.INVENTORY_MANAGER]}>
                  <InventoryManagementPage />
                </ProtectedRoute>
              }
            />
          
            {/* Vendor Routes */}
            <Route path="/vendor-registration" element={<VendorRegistrationPage />} />
            <Route
              path="/vendor-products"
              element={
                <ProtectedRoute allowedRoles={[UserRole.VENDOR]}>
                  <VendorProducts />
                </ProtectedRoute>
              }
            />
          
            {/* RFQ Routes */}
            <Route
              path="/rfq-management"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <RFQManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-rfq"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <CreateRFQ />
                </ProtectedRoute>
              }
            />
            <Route
              path="/view-rfq/:id"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER, UserRole.VENDOR]}>
                  <ViewRFQ />
                </ProtectedRoute>
              }
            />
            <Route
              path="/respond-rfq/:id"
              element={
                <ProtectedRoute allowedRoles={[UserRole.VENDOR]}>
                  <RFQResponsePage />
                </ProtectedRoute>
              }
            />
          
            {/* Product Routes */}
            <Route
              path="/product-management"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <ProductManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-product"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <CreateProduct />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-product/:id"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <EditProduct />
                </ProtectedRoute>
              }
            />
            <Route
              path="/product/:id"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <ProductDetailsPage />
                </ProtectedRoute>
              }
            />
          
            {/* Category Routes */}
            <Route
              path="/category-management"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <CategoryManagement />
                </ProtectedRoute>
              }
            />
          
            {/* Unit Routes */}
            <Route
              path="/unit-management"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <UnitManagement />
                </ProtectedRoute>
              }
            />
          
            {/* Order Routes */}
            <Route
              path="/order-management"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <OrderManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order/:id"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <OrderDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-order"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <CreateOrderPage />
                </ProtectedRoute>
              }
            />
          
            {/* Payment Routes */}
            <Route
              path="/payment-management"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <PaymentManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/:id"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <PaymentDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-payment"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <CreatePaymentPage />
                </ProtectedRoute>
              }
            />
          
            {/* User Routes */}
            <Route
              path="/user-management"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-user"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <CreateUserPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-user/:id"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <EditUserPage />
                </ProtectedRoute>
              }
            />
          
            {/* Activity Logs Route */}
            <Route
              path="/activity-logs"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <ActivityLogsPage />
                </ProtectedRoute>
              }
            />
          
            {/* Approval Management Route */}
            <Route
              path="/approval-management"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]}>
                  <ApprovalManagementPage />
                </ProtectedRoute>
              }
            />
          
            {/* Settings Route */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
