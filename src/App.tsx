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
import SpendAnalysisPage from "@/pages/analytics/SpendAnalysis";
import VendorPerformancePage from "@/pages/analytics/VendorPerformance";
import CustomReportsPage from "@/pages/analytics/CustomReports";

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
import RfpTemplates from "@/pages/rfp/RfpTemplates";

// Purchase Order pages
import CreatePurchaseOrder from "@/pages/purchase-orders/CreatePurchaseOrder";
import ActivePurchaseOrders from "@/pages/purchase-orders/ActivePurchaseOrders";
import PendingPurchaseOrders from "@/pages/purchase-orders/PendingPurchaseOrders";
import PurchaseOrderHistory from "@/pages/purchase-orders/PurchaseOrderHistory";

// Budget Management pages
import BudgetOverviewPage from "@/pages/budget/BudgetOverview";
import BudgetAllocationPage from "@/pages/budget/BudgetAllocation";
import BudgetReportsPage from "@/pages/budget/BudgetReports";

// Compliance & Audit pages
import AuditTrailPage from "@/pages/compliance/AuditTrail";
import ComplianceReportsPage from "@/pages/compliance/ComplianceReports";
import PolicyManagementPage from "@/pages/compliance/PolicyManagement";

import ProductPriceHistory from "@/pages/ProductPriceHistory";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

import RiskAssessment from "@/pages/risk/RiskAssessment";
import RiskMonitoring from "@/pages/risk/RiskMonitoring";
import RiskReports from "@/pages/risk/RiskReports";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
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
            <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            
            {/* Product Catalog routes - supporting both /products and /catalog */}
            <Route path="/products" element={<ProtectedRoute><Layout><ProductCatalog /></Layout></ProtectedRoute>} />
            <Route path="/catalog" element={<ProtectedRoute><Layout><ProductCatalog /></Layout></ProtectedRoute>} />
            <Route path="/products/add" element={<ProtectedRoute><Layout><AddProduct /></Layout></ProtectedRoute>} />
            <Route path="/products/:id/edit" element={<ProtectedRoute><Layout><EditProduct /></Layout></ProtectedRoute>} />
            <Route path="/products/:id" element={<ProtectedRoute><Layout><ProductDetail /></Layout></ProtectedRoute>} />
            <Route path="/products/:id/price-history" element={<ProtectedRoute><Layout><ProductPriceHistory /></Layout></ProtectedRoute>} />
            
            {/* Procurement routes - supporting both formats */}
            <Route path="/procurement-requests" element={<ProtectedRoute><Layout><ProcurementRequests /></Layout></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute><Layout><ProcurementRequests /></Layout></ProtectedRoute>} />
            <Route path="/procurement-requests/:id" element={<ProtectedRoute><Layout><ProcurementRequestDetail /></Layout></ProtectedRoute>} />
            <Route path="/requests/:id" element={<ProtectedRoute><Layout><ProcurementRequestDetail /></Layout></ProtectedRoute>} />
            
            <Route path="/vendors" element={<ProtectedRoute><Layout><VendorManagement /></Layout></ProtectedRoute>} />
            <Route path="/approvals" element={<ProtectedRoute><Layout><Approvals /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Layout><UserManagement /></Layout></ProtectedRoute>} />
            <Route path="/analytics/performance" element={<ProtectedRoute><Layout><PerformanceAnalytics /></Layout></ProtectedRoute>} />
            <Route path="/analytics/spend" element={<ProtectedRoute><Layout><SpendAnalysisPage /></Layout></ProtectedRoute>} />
            <Route path="/analytics/vendor-performance" element={<ProtectedRoute><Layout><VendorPerformancePage /></Layout></ProtectedRoute>} />
            <Route path="/analytics/custom" element={<ProtectedRoute><Layout><CustomReportsPage /></Layout></ProtectedRoute>} />

            {/* Inventory routes */}
            <Route path="/inventory" element={<ProtectedRoute><Layout><InventoryIndex /></Layout></ProtectedRoute>} />
            <Route path="/inventory/items" element={<ProtectedRoute><Layout><InventoryItems /></Layout></ProtectedRoute>} />
            <Route path="/inventory/warehouses" element={<ProtectedRoute><Layout><Warehouses /></Layout></ProtectedRoute>} />
            <Route path="/inventory/transactions" element={<ProtectedRoute><Layout><InventoryTransactions /></Layout></ProtectedRoute>} />
            <Route path="/inventory/reports" element={<ProtectedRoute><Layout><InventoryReports /></Layout></ProtectedRoute>} />
            <Route path="/inventory/reports/valuation" element={<ProtectedRoute><Layout><InventoryValuationReport /></Layout></ProtectedRoute>} />
            <Route path="/inventory/reports/stock-movement" element={<ProtectedRoute><Layout><StockMovementReport /></Layout></ProtectedRoute>} />
            <Route path="/inventory/reports/stock-aging" element={<ProtectedRoute><Layout><StockAgingReport /></Layout></ProtectedRoute>} />

            {/* RFP routes */}
            <Route path="/rfp/create" element={<ProtectedRoute><Layout><CreateRfp /></Layout></ProtectedRoute>} />
            <Route path="/rfp/create-wizard" element={<ProtectedRoute><Layout><CreateRfpWizard /></Layout></ProtectedRoute>} />
            <Route path="/rfp/active" element={<ProtectedRoute><Layout><ActiveRfps /></Layout></ProtectedRoute>} />
            <Route path="/rfp/responses" element={<ProtectedRoute><Layout><RfpResponses /></Layout></ProtectedRoute>} />
            <Route path="/rfp/:rfpId/responses" element={<ProtectedRoute><Layout><RfpResponses /></Layout></ProtectedRoute>} />
            <Route path="/rfp/templates" element={<ProtectedRoute><Layout><RfpTemplates /></Layout></ProtectedRoute>} />

            {/* Purchase Order routes */}
            <Route path="/purchase-orders/create" element={<ProtectedRoute><Layout><CreatePurchaseOrder /></Layout></ProtectedRoute>} />
            <Route path="/purchase-orders/active" element={<ProtectedRoute><Layout><ActivePurchaseOrders /></Layout></ProtectedRoute>} />
            <Route path="/purchase-orders/pending" element={<ProtectedRoute><Layout><PendingPurchaseOrders /></Layout></ProtectedRoute>} />
            <Route path="/purchase-orders/history" element={<ProtectedRoute><Layout><PurchaseOrderHistory /></Layout></ProtectedRoute>} />

            {/* Budget Management routes */}
            <Route path="/budget/overview" element={<ProtectedRoute><Layout><BudgetOverviewPage /></Layout></ProtectedRoute>} />
            <Route path="/budget/allocation" element={<ProtectedRoute><Layout><BudgetAllocationPage /></Layout></ProtectedRoute>} />
            <Route path="/budget/reports" element={<ProtectedRoute><Layout><BudgetReportsPage /></Layout></ProtectedRoute>} />

            {/* Compliance & Audit routes */}
            <Route path="/compliance/audit-trail" element={<ProtectedRoute><Layout><AuditTrailPage /></Layout></ProtectedRoute>} />
            <Route path="/compliance/reports" element={<ProtectedRoute><Layout><ComplianceReportsPage /></Layout></ProtectedRoute>} />
            <Route path="/compliance/policies" element={<ProtectedRoute><Layout><PolicyManagementPage /></Layout></ProtectedRoute>} />

            {/* Risk Management routes */}
            <Route path="/risk/assessment" element={<ProtectedRoute><Layout><RiskAssessment /></Layout></ProtectedRoute>} />
            <Route path="/risk/monitoring" element={<ProtectedRoute><Layout><RiskMonitoring /></Layout></ProtectedRoute>} />
            <Route path="/risk/reports" element={<ProtectedRoute><Layout><RiskReports /></Layout></ProtectedRoute>} />

            <Route path="*" element={<ProtectedRoute><Layout><NotFound /></Layout></ProtectedRoute>} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
