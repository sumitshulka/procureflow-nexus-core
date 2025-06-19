import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import UpdatePasswordPage from "@/pages/auth/UpdatePasswordPage";
import UnauthorizedPage from "@/pages/auth/UnauthorizedPage";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import ProcurementRequests from "@/pages/ProcurementRequests";
import ProcurementRequestDetail from "@/pages/ProcurementRequestDetail";
import ProductCatalog from "@/pages/ProductCatalog";
import AddProduct from "@/pages/AddProduct";
import ProductDetail from "@/pages/ProductDetail";
import EditProduct from "@/pages/EditProduct";
import ProductPriceHistory from "@/pages/ProductPriceHistory";
import ActiveRfps from "@/pages/rfp/ActiveRfps";
import CreateRfp from "@/pages/CreateRfp";
import CreateRfpWizard from "@/pages/rfp/CreateRfpWizard";
import RfpTemplates from "@/pages/rfp/RfpTemplates";
import RfpResponses from "@/pages/rfp/RfpResponses";
import ActivePurchaseOrders from "@/pages/purchase-orders/ActivePurchaseOrders";
import PendingPurchaseOrders from "@/pages/purchase-orders/PendingPurchaseOrders";
import CreatePurchaseOrder from "@/pages/purchase-orders/CreatePurchaseOrder";
import PurchaseOrderHistory from "@/pages/purchase-orders/PurchaseOrderHistory";
import InventoryIndex from "@/pages/inventory/InventoryIndex";
import InventoryItems from "@/pages/inventory/InventoryItems";
import InventoryTransactions from "@/pages/inventory/InventoryTransactions";
import Warehouses from "@/pages/inventory/Warehouses";
import InventoryReports from "@/pages/inventory/InventoryReports";
import StockMovementReport from "@/pages/inventory/StockMovementReport";
import StockAgingReport from "@/pages/inventory/StockAgingReport";
import InventoryValuationReport from "@/pages/inventory/InventoryValuationReport";
import VendorManagement from "@/pages/VendorManagement";
import VendorPortal from "@/pages/VendorPortal";
import VendorRegistration from "@/pages/VendorRegistration";
import VendorRegistrationSuccess from "@/pages/VendorRegistrationSuccess";
import SpendAnalysis from "@/pages/analytics/SpendAnalysis";
import VendorPerformance from "@/pages/analytics/VendorPerformance";
import PerformanceAnalytics from "@/pages/analytics/PerformanceAnalytics";
import CustomReports from "@/pages/analytics/CustomReports";
import BudgetOverview from "@/pages/budget/BudgetOverview";
import BudgetAllocation from "@/pages/budget/BudgetAllocation";
import BudgetReports from "@/pages/budget/BudgetReports";
import RiskAssessment from "@/pages/risk/RiskAssessment";
import RiskMonitoring from "@/pages/risk/RiskMonitoring";
import RiskReports from "@/pages/risk/RiskReports";
import AuditTrail from "@/pages/compliance/AuditTrail";
import PolicyManagement from "@/pages/compliance/PolicyManagement";
import ComplianceReports from "@/pages/compliance/ComplianceReports";
import Approvals from "@/pages/Approvals";
import NotificationsList from "@/pages/NotificationsList";
import Settings from "@/pages/Settings";
import UserManagement from "@/pages/UserManagement";
import AppLayout from "@/layouts/AppLayout";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Layout routes */}
          <Route path="/" element={<AppLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Procurement Routes */}
            <Route path="procurement" element={<ProcurementRequests />} />
            <Route path="procurement/:requestId" element={<ProcurementRequestDetail />} />
            
            {/* Product Routes */}
            <Route path="products" element={<ProductCatalog />} />
            <Route path="products/add" element={<AddProduct />} />
            <Route path="products/:productId" element={<ProductDetail />} />
            <Route path="products/:productId/edit" element={<EditProduct />} />
            <Route path="products/:productId/price-history" element={<ProductPriceHistory />} />
            
            {/* RFP Routes */}
            <Route path="rfp/active" element={<ActiveRfps />} />
            <Route path="rfp/create" element={<CreateRfp />} />
            <Route path="rfp/create-wizard" element={<CreateRfpWizard />} />
            <Route path="rfp/templates" element={<RfpTemplates />} />
            <Route path="rfp/:rfpId/responses" element={<RfpResponses />} />
            
            {/* Purchase Order Routes */}
            <Route path="purchase-orders/active" element={<ActivePurchaseOrders />} />
            <Route path="purchase-orders/pending" element={<PendingPurchaseOrders />} />
            <Route path="purchase-orders/create" element={<CreatePurchaseOrder />} />
            <Route path="purchase-orders/history" element={<PurchaseOrderHistory />} />
            
            {/* Inventory Routes */}
            <Route path="inventory" element={<InventoryIndex />} />
            <Route path="inventory/items" element={<InventoryItems />} />
            <Route path="inventory/transactions" element={<InventoryTransactions />} />
            <Route path="inventory/warehouses" element={<Warehouses />} />
            <Route path="inventory/reports" element={<InventoryReports />} />
            <Route path="inventory/reports/stock-movement" element={<StockMovementReport />} />
            <Route path="inventory/reports/stock-aging" element={<StockAgingReport />} />
            <Route path="inventory/reports/valuation" element={<InventoryValuationReport />} />
            
            {/* Vendor Routes */}
            <Route path="vendors" element={<VendorManagement />} />
            <Route path="vendor-portal" element={<VendorPortal />} />
            <Route path="vendor-registration" element={<VendorRegistration />} />
            <Route path="vendor-registration/success" element={<VendorRegistrationSuccess />} />
            
            {/* Analytics Routes */}
            <Route path="analytics/spend" element={<SpendAnalysis />} />
            <Route path="analytics/vendor-performance" element={<VendorPerformance />} />
            <Route path="analytics/performance" element={<PerformanceAnalytics />} />
            <Route path="analytics/reports" element={<CustomReports />} />
            
            {/* Budget Routes */}
            <Route path="budget/overview" element={<BudgetOverview />} />
            <Route path="budget/allocation" element={<BudgetAllocation />} />
            <Route path="budget/reports" element={<BudgetReports />} />
            
            {/* Risk Routes */}
            <Route path="risk/assessment" element={<RiskAssessment />} />
            <Route path="risk/monitoring" element={<RiskMonitoring />} />
            <Route path="risk/reports" element={<RiskReports />} />
            
            {/* Compliance Routes */}
            <Route path="compliance/audit" element={<AuditTrail />} />
            <Route path="compliance/policies" element={<PolicyManagement />} />
            <Route path="compliance/reports" element={<ComplianceReports />} />
            
            {/* Other Routes */}
            <Route path="approvals" element={<Approvals />} />
            <Route path="notifications" element={<NotificationsList />} />
            <Route path="settings" element={<Settings />} />
            <Route path="users" element={<UserManagement />} />
          </Route>
          
          {/* Auth Routes */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/signup" element={<SignupPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/update-password" element={<UpdatePasswordPage />} />
          <Route path="/auth/unauthorized" element={<UnauthorizedPage />} />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
