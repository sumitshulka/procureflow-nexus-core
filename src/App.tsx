import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import UpdatePasswordPage from '@/pages/auth/UpdatePasswordPage';
import UnauthorizedPage from '@/pages/auth/UnauthorizedPage';

// Main pages
import Index from '@/pages/Index';
import Dashboard from '@/pages/Dashboard';
import NotFound from '@/pages/NotFound';

// Product pages
import ProductCatalog from '@/pages/ProductCatalog';
import ProductDetail from '@/pages/ProductDetail';
import AddProduct from '@/pages/AddProduct';
import EditProduct from '@/pages/EditProduct';
import ProductPriceHistory from '@/pages/ProductPriceHistory';

// Vendor pages
import VendorProfile from '@/pages/vendor/VendorProfile';
import VendorRfps from '@/pages/vendor/VendorRfps';
import VendorPurchaseOrders from '@/pages/vendor/VendorPurchaseOrders';
import VendorFinances from '@/pages/vendor/VendorFinances';
import VendorSettings from '@/pages/vendor/VendorSettings';
import VendorMessages from '@/pages/vendor/VendorMessages';
import VendorProducts from '@/pages/vendor/VendorProducts';
import VendorAnalytics from '@/pages/vendor/VendorAnalytics';

// Procurement pages
import ProcurementRequests from '@/pages/ProcurementRequests';
import ProcurementRequestDetail from '@/pages/ProcurementRequestDetail';
import Approvals from '@/pages/Approvals';

// RFP pages
import CreateRfp from '@/pages/CreateRfp';

// Vendor pages
import VendorManagement from '@/pages/VendorManagement';
import VendorPortal from '@/pages/VendorPortal';
import VendorDashboard from '@/pages/VendorDashboard';
import VendorRegistration from '@/pages/VendorRegistration';
import VendorRegistrationSuccess from '@/pages/VendorRegistrationSuccess';
import VendorRegistrationDuplicate from '@/pages/VendorRegistrationDuplicate';

// Settings and admin pages
import Settings from '@/pages/Settings';
import UserManagement from '@/pages/UserManagement';
import NotificationsList from '@/pages/NotificationsList';
import FeatureDocumentation from '@/pages/FeatureDocumentation';

// Analytics pages
import CustomReportsPage from '@/pages/analytics/CustomReports';
import SpendAnalysisPage from '@/pages/analytics/SpendAnalysis';
import VendorPerformancePage from '@/pages/analytics/VendorPerformance';

// Budget pages
import BudgetAllocationPage from '@/pages/budget/BudgetAllocation';
import BudgetOverviewPage from '@/pages/budget/BudgetOverview';
import BudgetReportsPage from '@/pages/budget/BudgetReports';

// Compliance pages
import AuditTrailPage from '@/pages/compliance/AuditTrail';
import ComplianceReportsPage from '@/pages/compliance/ComplianceReports';
import PolicyManagementPage from '@/pages/compliance/PolicyManagement';

// Inventory pages
import InventoryIndex from '@/pages/inventory/InventoryIndex';
import InventoryItems from '@/pages/inventory/InventoryItems';
import InventoryTransactions from '@/pages/inventory/InventoryTransactions';
import InventoryReports from '@/pages/inventory/InventoryReports';
import Warehouses from '@/pages/inventory/Warehouses';
import StockMovementReport from '@/pages/inventory/StockMovementReport';
import StockAgingReport from '@/pages/inventory/StockAgingReport';
import InventoryValuationReport from '@/pages/inventory/InventoryValuationReport';

// Purchase Order pages
import ActivePurchaseOrders from '@/pages/purchase-orders/ActivePurchaseOrders';
import PendingPurchaseOrders from '@/pages/purchase-orders/PendingPurchaseOrders';
import CreatePurchaseOrder from '@/pages/purchase-orders/CreatePurchaseOrder';
import PurchaseOrderHistory from '@/pages/purchase-orders/PurchaseOrderHistory';

// RFP management pages
import ActiveRfps from '@/pages/rfp/ActiveRfps';
import CreateRfpWizard from '@/pages/rfp/CreateRfpWizard';
import RfpResponses from '@/pages/rfp/RfpResponses';
import RfpTemplates from '@/pages/rfp/RfpTemplates';

// Risk management pages
import RiskAssessment from '@/pages/risk/RiskAssessment';
import RiskMonitoring from '@/pages/risk/RiskMonitoring';
import RiskReports from '@/pages/risk/RiskReports';

// Performance Analytics pages
import PerformanceAnalytics from '@/pages/analytics/PerformanceAnalytics';

import { UserRole } from '@/types';
import { Building2, Users, FileText } from 'lucide-react';


function App() {
  return (
    <AuthProvider>
      <Toaster />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/update-password" element={<UpdatePasswordPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        {/* Vendor registration routes */}
        <Route path="/vendor-registration" element={<VendorRegistration />} />
        <Route path="/vendor-registration/success" element={<VendorRegistrationSuccess />} />
        <Route path="/vendor-registration/duplicate" element={<VendorRegistrationDuplicate />} />
        
        {/* Protected routes with Layout */}
        <Route path="/index" element={
          <ProtectedRoute>
            <Layout><Index /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin-dashboard" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/vendor-dashboard" element={
          <ProtectedRoute requireVendor={true}>
            <VendorDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/vendor/profile" element={
          <ProtectedRoute requireVendor={true}>
            <VendorProfile />
          </ProtectedRoute>
        } />
        
        <Route path="/vendor/rfps" element={
          <ProtectedRoute requireVendor={true}>
            <VendorRfps />
          </ProtectedRoute>
        } />
        
        <Route path="/vendor/purchase-orders" element={
          <ProtectedRoute requireVendor={true}>
            <VendorPurchaseOrders />
          </ProtectedRoute>
        } />
        
        <Route path="/vendor/finances" element={
          <ProtectedRoute requireVendor={true}>
            <VendorFinances />
          </ProtectedRoute>
        } />
        
        <Route path="/vendor/settings" element={
          <ProtectedRoute requireVendor={true}>
            <VendorSettings />
          </ProtectedRoute>
        } />
        
        <Route path="/vendor/messages" element={
          <ProtectedRoute requireVendor={true}>
            <VendorMessages />
          </ProtectedRoute>
        } />
        
        <Route path="/vendor/products" element={
          <ProtectedRoute requireVendor={true}>
            <VendorProducts />
          </ProtectedRoute>
        } />
        
        <Route path="/vendor/analytics" element={
          <ProtectedRoute requireVendor={true}>
            <VendorAnalytics />
          </ProtectedRoute>
        } />
        
        {/* Product management */}
        <Route path="/products" element={
          <ProtectedRoute>
            <Layout><ProductCatalog /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/product/:id" element={
          <ProtectedRoute>
            <Layout><ProductDetail /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/add-product" element={
          <ProtectedRoute>
            <Layout><AddProduct /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/products/:id/edit" element={
          <ProtectedRoute>
            <Layout><EditProduct /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/products/:id/price-history" element={
          <ProtectedRoute>
            <Layout><ProductPriceHistory /></Layout>
          </ProtectedRoute>
        } />
        
        {/* Procurement */}
        <Route path="/requests" element={
          <ProtectedRoute>
            <Layout><ProcurementRequests /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/procurement-requests" element={
          <ProtectedRoute>
            <Layout><ProcurementRequests /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/requests/:id" element={
          <ProtectedRoute>
            <Layout><ProcurementRequestDetail /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/approvals" element={
          <ProtectedRoute>
            <Layout><Approvals /></Layout>
          </ProtectedRoute>
        } />
        
        {/* RFP */}
        <Route path="/rfp/create" element={
          <ProtectedRoute>
            <Layout><CreateRfp /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/rfp/active" element={
          <ProtectedRoute>
            <Layout><ActiveRfps /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/rfp/create-wizard" element={
          <ProtectedRoute>
            <Layout><CreateRfpWizard /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/rfp/responses" element={
          <ProtectedRoute>
            <Layout><RfpResponses /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/rfp/templates" element={
          <ProtectedRoute>
            <Layout><RfpTemplates /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/rfp/templates/create" element={
          <ProtectedRoute>
            <Layout><RfpTemplates /></Layout>
          </ProtectedRoute>
        } />
        
        {/* Vendor management */}
        <Route path="/vendors" element={
          <ProtectedRoute>
            <Layout><VendorManagement /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/vendor-portal" element={
          <ProtectedRoute>
            <Layout><VendorPortal /></Layout>
          </ProtectedRoute>
        } />
        
        {/* Inventory */}
        <Route path="/inventory" element={
          <ProtectedRoute>
            <Layout><InventoryIndex /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/inventory/items" element={
          <ProtectedRoute>
            <Layout><InventoryItems /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/inventory/transactions" element={
          <ProtectedRoute>
            <Layout><InventoryTransactions /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/inventory/reports" element={
          <ProtectedRoute>
            <Layout><InventoryReports /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/inventory/warehouses" element={
          <ProtectedRoute>
            <Layout><Warehouses /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/inventory/reports/stock-movement" element={
          <ProtectedRoute>
            <Layout><StockMovementReport /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/inventory/reports/stock-aging" element={
          <ProtectedRoute>
            <Layout><StockAgingReport /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/inventory/reports/valuation" element={
          <ProtectedRoute>
            <Layout><InventoryValuationReport /></Layout>
          </ProtectedRoute>
        } />
        
        {/* Purchase Orders */}
        <Route path="/purchase-orders/active" element={
          <ProtectedRoute>
            <Layout><ActivePurchaseOrders /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/purchase-orders/pending" element={
          <ProtectedRoute>
            <Layout><PendingPurchaseOrders /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/purchase-orders/create" element={
          <ProtectedRoute>
            <Layout><CreatePurchaseOrder /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/purchase-orders/history" element={
          <ProtectedRoute>
            <Layout><PurchaseOrderHistory /></Layout>
          </ProtectedRoute>
        } />
        
        {/* Analytics */}
        <Route path="/analytics/custom-reports" element={
          <ProtectedRoute>
            <Layout><CustomReportsPage /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/analytics/spend-analysis" element={
          <ProtectedRoute>
            <Layout><SpendAnalysisPage /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/analytics/vendor-performance" element={
          <ProtectedRoute>
            <Layout><VendorPerformancePage /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/analytics/performance" element={
          <ProtectedRoute>
            <Layout><PerformanceAnalytics /></Layout>
          </ProtectedRoute>
        } />
        
        {/* Budget */}
        <Route path="/budget/allocation" element={
          <ProtectedRoute>
            <Layout><BudgetAllocationPage /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/budget/overview" element={
          <ProtectedRoute>
            <Layout><BudgetOverviewPage /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/budget/reports" element={
          <ProtectedRoute>
            <Layout><BudgetReportsPage /></Layout>
          </ProtectedRoute>
        } />
        
        {/* Compliance */}
        <Route path="/compliance/audit-trail" element={
          <ProtectedRoute>
            <Layout><AuditTrailPage /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/compliance/reports" element={
          <ProtectedRoute>
            <Layout><ComplianceReportsPage /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/compliance/policies" element={
          <ProtectedRoute>
            <Layout><PolicyManagementPage /></Layout>
          </ProtectedRoute>
        } />
        
        {/* Risk Management */}
        <Route path="/risk/assessment" element={
          <ProtectedRoute>
            <Layout><RiskAssessment /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/risk/monitoring" element={
          <ProtectedRoute>
            <Layout><RiskMonitoring /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/risk/reports" element={
          <ProtectedRoute>
            <Layout><RiskReports /></Layout>
          </ProtectedRoute>
        } />
        
        {/* Settings and Admin */}
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout><Settings /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/users" element={
          <ProtectedRoute>
            <Layout><UserManagement /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/user-management" element={
          <ProtectedRoute>
            <Layout><UserManagement /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Layout><NotificationsList /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/documentation" element={
          <ProtectedRoute>
            <Layout><FeatureDocumentation /></Layout>
          </ProtectedRoute>
        } />
        
        {/* 404 page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
