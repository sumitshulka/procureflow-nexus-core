
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
import BatchManagement from '@/pages/inventory/BatchManagement';
import InventoryReports from '@/pages/inventory/InventoryReports';
import InventoryValuationReport from '@/pages/inventory/InventoryValuationReport';
import StockAgingReport from '@/pages/inventory/StockAgingReport';
import StockMovementReport from '@/pages/inventory/StockMovementReport';

// Procurement Pages
import ProcurementRequests from '@/pages/ProcurementRequests';
import ProcurementRequestDetail from '@/pages/ProcurementRequestDetail';

// RFP Pages
import RfpManagement from '@/pages/rfp/RfpManagement';
import CreateRfp from '@/pages/CreateRfp';
import ActiveRfps from '@/pages/rfp/ActiveRfps';
import RfpResponses from '@/pages/rfp/RfpResponses';
import RfpTemplates from '@/pages/rfp/RfpTemplates';
import CreateRfpTemplate from '@/pages/rfp/CreateRfpTemplate';
import CreatePricingTemplate from '@/pages/rfp/CreatePricingTemplate';
import CreateRfpWizard from '@/pages/rfp/CreateRfpWizard';

// Invoice Pages
import InvoiceManagement from '@/pages/invoices/InvoiceManagement';
import CreateInvoice from '@/pages/invoices/CreateInvoice';
import InvoiceDetail from '@/pages/invoices/InvoiceDetail';

// Purchase Order Pages
import PurchaseOrdersManagement from '@/pages/purchase-orders/PurchaseOrdersManagement';
import CreatePurchaseOrder from '@/pages/purchase-orders/CreatePurchaseOrder';
import PendingPurchaseOrders from '@/pages/purchase-orders/PendingPurchaseOrders';
import ActivePurchaseOrders from '@/pages/purchase-orders/ActivePurchaseOrders';
import PurchaseOrderHistory from '@/pages/purchase-orders/PurchaseOrderHistory';
import PurchaseOrderDetail from '@/pages/purchase-orders/PurchaseOrderDetail';

// GRN Pages
import GRNList from '@/pages/grn/GRNList';
import GRNDetail from '@/pages/grn/GRNDetail';
import CreateGRN from '@/pages/grn/CreateGRN';
import ThreeWayMatching from '@/pages/grn/ThreeWayMatching';

// Approval Pages
import Approvals from '@/pages/Approvals';

// Budget Pages
import BudgetOverview from '@/pages/budget/BudgetOverview';
import BudgetAllocation from '@/pages/budget/BudgetAllocation';
import BudgetReports from '@/pages/budget/BudgetReports';
import BudgetCycleDashboard from '@/pages/budget/BudgetCycleDashboard';

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

// Reports Center
import ReportsIndex from '@/pages/reports/ReportsIndex';

// Report Pages - Inventory
import InventoryValuationReportPage from '@/pages/reports/inventory/InventoryValuationReportPage';
import StockAgingReportPage from '@/pages/reports/inventory/StockAgingReportPage';
import StockMovementReportPage from '@/pages/reports/inventory/StockMovementReportPage';
import ReorderLevelReportPage from '@/pages/reports/inventory/ReorderLevelReportPage';
import WarehouseSummaryReportPage from '@/pages/reports/inventory/WarehouseSummaryReportPage';

// Report Pages - Purchase Orders
import POSummaryReportPage from '@/pages/reports/purchase-orders/POSummaryReportPage';
import POFulfillmentReportPage from '@/pages/reports/purchase-orders/POFulfillmentReportPage';
import POAgingReportPage from '@/pages/reports/purchase-orders/POAgingReportPage';
import POSpendReportPage from '@/pages/reports/purchase-orders/POSpendReportPage';

// Report Pages - Vendors
import VendorPerformanceReportPage from '@/pages/reports/vendors/VendorPerformanceReportPage';
import VendorSpendReportPage from '@/pages/reports/vendors/VendorSpendReportPage';
import VendorComparisonReportPage from '@/pages/reports/vendors/VendorComparisonReportPage';
import VendorRiskReportPage from '@/pages/reports/vendors/VendorRiskReportPage';

// Report Pages - Invoices
import InvoiceSummaryReportPage from '@/pages/reports/invoices/InvoiceSummaryReportPage';
import InvoiceAgingReportPage from '@/pages/reports/invoices/InvoiceAgingReportPage';
import PaymentHistoryReportPage from '@/pages/reports/invoices/PaymentHistoryReportPage';
import InvoiceReconciliationReportPage from '@/pages/reports/invoices/InvoiceReconciliationReportPage';

// Report Pages - Procurement
import ProcurementSummaryReportPage from '@/pages/reports/procurement/ProcurementSummaryReportPage';
import ApprovalCycleReportPage from '@/pages/reports/procurement/ApprovalCycleReportPage';
import DepartmentSpendReportPage from '@/pages/reports/procurement/DepartmentSpendReportPage';
import RfpAnalysisReportPage from '@/pages/reports/procurement/RfpAnalysisReportPage';

// Report Pages - Analytics
import SpendAnalyticsReportPage from '@/pages/reports/analytics/SpendAnalyticsReportPage';
import PerformanceMetricsReportPage from '@/pages/reports/analytics/PerformanceMetricsReportPage';
import BudgetVarianceReportPage from '@/pages/reports/analytics/BudgetVarianceReportPage';
import SavingsAnalysisReportPage from '@/pages/reports/analytics/SavingsAnalysisReportPage';

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
import VendorRfpDetail from '@/pages/vendor/VendorRfpDetail';
import VendorRfpResponse from '@/pages/vendor/VendorRfpResponse';
import VendorRfpResponseTwoPart from '@/pages/vendor/VendorRfpResponseTwoPart';
import VendorResponseView from '@/pages/vendor/VendorResponseView';
import VendorInvoices from '@/pages/vendor/VendorInvoices';
import VendorCreateInvoice from '@/pages/vendor/VendorCreateInvoice';
import VendorInvoiceDetail from '@/pages/vendor/VendorInvoiceDetail';
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

          {/* Protected Routes with Layout (permissions enforced in ProtectedRoute) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
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
            path="/inventory/batches"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><BatchManagement /></Layout>
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
            path="/rfp"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><RfpManagement /></Layout>
              </ProtectedRoute>
            }
          />
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
            path="/rfp/pricing-templates/create"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><CreatePricingTemplate /></Layout>
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
          <Route
            path="/rfp/create-wizard"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><CreateRfpWizard /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/rfp/:id/responses"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><RfpResponses /></Layout>
              </ProtectedRoute>
            }
          />
          {/* Invoice Management */}
          <Route
            path="/invoices"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><InvoiceManagement /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices/create"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><CreateInvoice /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices/:id"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><InvoiceDetail /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/purchase-orders"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><PurchaseOrdersManagement /></Layout>
              </ProtectedRoute>
            }
          />
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
          <Route
            path="/purchase-orders/:id"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><PurchaseOrderDetail /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders/edit/:id"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><CreatePurchaseOrder /></Layout>
              </ProtectedRoute>
            }
          />

          {/* GRN Management */}
          <Route
            path="/grn"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><GRNList /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grn/create"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><CreateGRN /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grn/:id"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><GRNDetail /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grn/matching"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><ThreeWayMatching /></Layout>
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
          <Route
            path="/budget/cycle/:cycleId"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><BudgetCycleDashboard /></Layout>
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

          {/* Reports Center */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><ReportsIndex /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Inventory Reports */}
          <Route
            path="/reports/inventory/valuation"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><InventoryValuationReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/inventory/aging"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><StockAgingReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/inventory/movement"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><StockMovementReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/inventory/reorder"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><ReorderLevelReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/inventory/warehouse-summary"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><WarehouseSummaryReportPage /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Purchase Order Reports */}
          <Route
            path="/reports/purchase-orders/summary"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><POSummaryReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/purchase-orders/fulfillment"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><POFulfillmentReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/purchase-orders/aging"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><POAgingReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/purchase-orders/spend"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><POSpendReportPage /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Vendor Reports */}
          <Route
            path="/reports/vendors/performance"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><VendorPerformanceReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/vendors/spend"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><VendorSpendReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/vendors/comparison"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><VendorComparisonReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/vendors/risk"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><VendorRiskReportPage /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Invoice Reports */}
          <Route
            path="/reports/invoices/summary"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><InvoiceSummaryReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/invoices/aging"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><InvoiceAgingReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/invoices/payments"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><PaymentHistoryReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/invoices/reconciliation"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><InvoiceReconciliationReportPage /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Procurement Reports */}
          <Route
            path="/reports/procurement/summary"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><ProcurementSummaryReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/procurement/approval-cycle"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><ApprovalCycleReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/procurement/department-spend"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><DepartmentSpendReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/procurement/rfp-analysis"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><RfpAnalysisReportPage /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Analytics Reports */}
          <Route
            path="/reports/analytics/spend"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><SpendAnalyticsReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/analytics/performance"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><PerformanceMetricsReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/analytics/budget-variance"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><BudgetVarianceReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/analytics/savings"
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Layout><SavingsAnalysisReportPage /></Layout>
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
            path="/vendor/rfps/:id"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorRfpDetail /></VendorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/rfps/:id/respond"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorRfpResponseTwoPart /></VendorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/rfps/:id/respond-legacy"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorRfpResponse /></VendorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/rfps/:id/response"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorResponseView /></VendorLayout>
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
            path="/vendor/invoices"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorInvoices /></VendorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/invoices/create"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorCreateInvoice /></VendorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/invoices/:id"
            element={
              <ProtectedRoute requireVendor={true}>
                <VendorLayout><VendorInvoiceDetail /></VendorLayout>
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
