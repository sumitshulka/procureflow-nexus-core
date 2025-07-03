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

// Homepage component for procurement management system
const HomePage = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    {/* Header */}
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Procurement Management System</h1>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/login"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Staff Login
            </a>
            <a
              href="/vendor-registration"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Vendor Registration
            </a>
          </div>
        </div>
      </div>
    </header>

    {/* Main Content */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Procurement Management System
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Streamline your procurement process with our comprehensive platform for managing requests, 
          RFPs, vendor relationships, and purchase orders.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        {/* Staff Access */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-center mb-3">Staff Access</h3>
          <p className="text-gray-600 text-center mb-6">
            Access procurement dashboard, manage requests, approvals, and system administration
          </p>
          <div className="space-y-3">
            <a
              href="/login"
              className="block w-full bg-blue-600 text-white text-center px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Staff Login
            </a>
            <p className="text-xs text-gray-500 text-center">
              For employees, procurement officers, and administrators
            </p>
          </div>
        </div>

        {/* Vendor Portal */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <Building2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-center mb-3">Vendor Portal</h3>
          <p className="text-gray-600 text-center mb-6">
            Vendor access to RFPs, bid submissions, order management, and communications
          </p>
          <div className="space-y-3">
            <a
              href="/login"
              className="block w-full bg-green-600 text-white text-center px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Vendor Login
            </a>
            <a
              href="/vendor-registration"
              className="block w-full border border-green-600 text-green-600 text-center px-4 py-2 rounded-md hover:bg-green-50 transition-colors"
            >
              New Vendor Registration
            </a>
          </div>
        </div>

        {/* System Features */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <FileText className="w-12 h-12 text-purple-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-center mb-3">Key Features</h3>
          <ul className="text-gray-600 space-y-2 text-sm">
            <li>• Procurement Request Management</li>
            <li>• RFP Creation & Management</li>
            <li>• Vendor Registration & Evaluation</li>
            <li>• Purchase Order Processing</li>
            <li>• Inventory Management</li>
            <li>• Approval Workflows</li>
            <li>• Analytics & Reporting</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Toaster />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
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
          <ProtectedRoute requiredRole={UserRole.VENDOR}>
            <VendorDashboard />
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
