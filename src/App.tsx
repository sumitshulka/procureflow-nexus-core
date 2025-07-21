
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import VendorLayout from '@/components/layout/VendorLayout';
import { UserRole } from '@/types';

// Auth Pages
import Index from '@/pages/Index';
import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import UpdatePasswordPage from '@/pages/auth/UpdatePasswordPage';
import UnauthorizedPage from '@/pages/auth/UnauthorizedPage';

// Main Pages
import Dashboard from '@/pages/Dashboard';
import ProductCatalog from '@/pages/ProductCatalog';
import ProductDetail from '@/pages/ProductDetail';
import AddProduct from '@/pages/AddProduct';
import EditProduct from '@/pages/EditProduct';
import ProductPriceHistory from '@/pages/ProductPriceHistory';
import ProductVendorRelationships from '@/pages/ProductVendorRelationships';

// Inventory Pages
import InventoryIndex from '@/pages/inventory/InventoryIndex';
import InventoryItems from '@/pages/inventory/InventoryItems';
import InventoryTransactions from '@/pages/inventory/InventoryTransactions';
import Warehouses from '@/pages/inventory/Warehouses';
import InventoryReports from '@/pages/inventory/InventoryReports';
import InventoryValuationReport from '@/pages/inventory/InventoryValuationReport';
import StockAgingReport from '@/pages/inventory/StockAgingReport';
import StockMovementReport from '@/pages/inventory/StockMovementReport';

// Procurement Pages
import ProcurementRequests from '@/pages/ProcurementRequests';
import ProcurementRequestDetail from '@/pages/ProcurementRequestDetail';

// RFP Pages
import CreateRfp from '@/pages/CreateRfp';
import ActiveRfps from '@/pages/rfp/ActiveRfps';
import RfpResponses from '@/pages/rfp/RfpResponses';
import RfpTemplates from '@/pages/rfp/RfpTemplates';
import CreateRfpTemplate from '@/pages/rfp/CreateRfpTemplate';
import CreateRfpWizard from '@/pages/rfp/CreateRfpWizard';

// Purchase Order Pages
import CreatePurchaseOrder from '@/pages/purchase-orders/CreatePurchaseOrder';
import PendingPurchaseOrders from '@/pages/purchase-orders/PendingPurchaseOrders';
import ActivePurchaseOrders from '@/pages/purchase-orders/ActivePurchaseOrders';
import PurchaseOrderHistory from '@/pages/purchase-orders/PurchaseOrderHistory';

// Approval Pages
import Approvals from '@/pages/Approvals';

// Budget Pages
import BudgetOverview from '@/pages/budget/BudgetOverview';
import BudgetAllocation from '@/pages/budget/BudgetAllocation';
import BudgetReports from '@/pages/budget/BudgetReports';

// Compliance Pages
import AuditTrail from '@/pages/compliance/AuditTrail';
import ComplianceReports from '@/pages/compliance/ComplianceReports';
import PolicyManagement from '@/pages/compliance/PolicyManagement';

// Risk Management Pages
import RiskAssessment from '@/pages/risk/RiskAssessment';
import RiskMonitoring from '@/pages/risk/RiskMonitoring';
import RiskReports from '@/pages/risk/RiskReports';

// Analytics Pages
import PerformanceAnalytics from '@/pages/analytics/PerformanceAnalytics';
import SpendAnalysis from '@/pages/analytics/SpendAnalysis';
import VendorPerformance from '@/pages/analytics/VendorPerformance';
import CustomReports from '@/pages/analytics/CustomReports';

// Vendor Pages
import VendorManagement from '@/pages/VendorManagement';
import VendorPortal from '@/pages/VendorPortal';
import VendorRegistration from '@/pages/VendorRegistration';
import VendorRegistrationSuccess from '@/pages/VendorRegistrationSuccess';
import VendorRegistrationDuplicate from '@/pages/VendorRegistrationDuplicate';
import VendorDashboard from '@/pages/VendorDashboard';
import VendorDashboardDetail from '@/pages/VendorDashboardDetail';

// Vendor Portal Pages
import VendorProfile from '@/pages/vendor/VendorProfile';
import VendorRfps from '@/pages/vendor/VendorRfps';
import VendorPurchaseOrders from '@/pages/vendor/VendorPurchaseOrders';
import VendorProducts from '@/pages/vendor/VendorProducts';
import VendorFinances from '@/pages/vendor/VendorFinances';
import VendorMessages from '@/pages/vendor/VendorMessages';
import VendorAnalytics from '@/pages/vendor/VendorAnalytics';
import VendorSettings from '@/pages/vendor/VendorSettings';

// Settings & Administration
import Settings from '@/pages/Settings';
import UserManagement from '@/pages/UserManagement';
import NotificationsList from '@/pages/NotificationsList';
import FeatureDocumentation from '@/pages/FeatureDocumentation';
import NotFound from '@/pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/vendor-registration" element={<VendorRegistration />} />
          <Route path="/vendor-registration-success" element={<VendorRegistrationSuccess />} />
          <Route path="/vendor-registration-duplicate" element={<VendorRegistrationDuplicate />} />

          {/* Protected Admin Routes with Layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Product Management */}
          <Route
            path="/products"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><ProductCatalog /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><ProductDetail /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/product/:id"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><ProductDetail /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/add"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><AddProduct /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-product/:id"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><EditProduct /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id/edit"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><EditProduct /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-product"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><AddProduct /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id/price-history"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><ProductPriceHistory /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/product-vendors"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><ProductVendorRelationships /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Inventory Management */}
          <Route
            path="/inventory"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><InventoryIndex /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/items"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><InventoryItems /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/transactions"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><InventoryTransactions /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/warehouses"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><Warehouses /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/reports"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><InventoryReports /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/valuation-report"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><InventoryValuationReport /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/aging-report"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><StockAgingReport /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/movement-report"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><StockMovementReport /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Procurement Requests */}
          <Route
            path="/requests"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><ProcurementRequests /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests/:id"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><ProcurementRequestDetail /></Layout>
              </ProtectedRoute>
            }
          />

          {/* RFP Management */}
          <Route
            path="/rfp/create"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><CreateRfp /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-rfp"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><CreateRfp /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/rfp/active"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><ActiveRfps /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/rfp/responses"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><RfpResponses /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/rfp/templates"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><RfpTemplates /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/rfp/templates/create"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><CreateRfpTemplate /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/rfp/wizard"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><CreateRfpWizard /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Purchase Orders */}
          <Route
            path="/purchase-orders/create"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><CreatePurchaseOrder /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders/pending"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><PendingPurchaseOrders /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders/active"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><ActivePurchaseOrders /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders/history"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><PurchaseOrderHistory /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Approvals */}
          <Route
            path="/approvals"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><Approvals /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Budget Management */}
          <Route
            path="/budget/overview"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><BudgetOverview /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/budget/allocation"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><BudgetAllocation /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/budget/reports"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><BudgetReports /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Compliance & Audit */}
          <Route
            path="/compliance/audit-trail"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><AuditTrail /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/compliance/reports"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><ComplianceReports /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/compliance/policies"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><PolicyManagement /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Risk Management */}
          <Route
            path="/risk/assessment"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><RiskAssessment /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/risk/monitoring"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><RiskMonitoring /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/risk/reports"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><RiskReports /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Analytics & Reports */}
          <Route
            path="/analytics/performance"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><PerformanceAnalytics /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/spend"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><SpendAnalysis /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/vendor-performance"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><VendorPerformance /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/custom"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><CustomReports /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Vendor Management */}
          <Route
            path="/vendors"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><VendorManagement /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor-dashboard/:vendorId"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><VendorDashboardDetail /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Vendor Portal Routes */}
          <Route
            path="/vendor-portal"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorPortal /></VendorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor-dashboard"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorDashboard /></VendorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/profile"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorProfile /></VendorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/rfps"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorRfps /></VendorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/purchase-orders"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorPurchaseOrders /></VendorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/products"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorProducts /></VendorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/finances"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorFinances /></VendorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/messages"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorMessages /></VendorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/analytics"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorAnalytics /></VendorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/settings"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorSettings /></VendorLayout>
              </ProtectedRoute>
            }
          />

          {/* Settings & Administration */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><Settings /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><UserManagement /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><NotificationsList /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Documentation */}
          <Route
            path="/documentation/features"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><FeatureDocumentation /></Layout>
              </ProtectedRoute>
            }
          />

          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </div>
    </AuthProvider>
  );
}

export default App;
