import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/common/PageHeader";
import {
  Package,
  ShoppingCart,
  Building2,
  FileText,
  TrendingUp,
  ClipboardList,
  Calculator,
  BarChart3,
  PieChart,
  LineChart,
  ArrowRight,
  FileSpreadsheet,
  DollarSign,
  Users,
  Truck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Archive,
} from "lucide-react";

interface ReportItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

interface ReportCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  reports: ReportItem[];
}

const reportCategories: ReportCategory[] = [
  {
    id: "inventory",
    title: "Inventory Reports",
    description: "Track stock levels, movements, valuations, and aging analysis",
    icon: Package,
    color: "bg-blue-500",
    reports: [
      {
        id: "inventory-valuation",
        title: "Inventory Valuation Report",
        description: "Complete valuation of all inventory items using FIFO, LIFO, or weighted average methods",
        icon: DollarSign,
        href: "/reports/inventory/valuation",
      },
      {
        id: "stock-aging",
        title: "Stock Aging Report",
        description: "Analyze aging of inventory items to identify slow-moving and obsolete stock",
        icon: Clock,
        href: "/reports/inventory/aging",
      },
      {
        id: "stock-movement",
        title: "Stock Movement Report",
        description: "Track all stock movements including check-ins, check-outs, and transfers",
        icon: Truck,
        href: "/reports/inventory/movement",
      },
      {
        id: "reorder-report",
        title: "Reorder Level Report",
        description: "Items that have reached or fallen below reorder levels",
        icon: AlertTriangle,
        href: "/reports/inventory/reorder",
        badge: "Critical",
        badgeVariant: "destructive",
      },
      {
        id: "warehouse-summary",
        title: "Warehouse Summary",
        description: "Stock summary across all warehouses with capacity utilization",
        icon: Archive,
        href: "/reports/inventory/warehouse-summary",
      },
    ],
  },
  {
    id: "purchase-orders",
    title: "Purchase Order Reports",
    description: "Analyze PO performance, trends, and fulfillment rates",
    icon: ShoppingCart,
    color: "bg-green-500",
    reports: [
      {
        id: "po-summary",
        title: "PO Summary Report",
        description: "Overview of all purchase orders with status breakdown and values",
        icon: FileSpreadsheet,
        href: "/reports/purchase-orders/summary",
      },
      {
        id: "po-fulfillment",
        title: "PO Fulfillment Report",
        description: "Track delivery performance and fulfillment rates against POs",
        icon: CheckCircle,
        href: "/reports/purchase-orders/fulfillment",
      },
      {
        id: "po-aging",
        title: "PO Aging Report",
        description: "Analyze open POs by age and identify delayed orders",
        icon: Clock,
        href: "/reports/purchase-orders/aging",
      },
      {
        id: "po-spend",
        title: "PO Spend Analysis",
        description: "Detailed breakdown of spending by category, vendor, and time period",
        icon: BarChart3,
        href: "/reports/purchase-orders/spend",
      },
    ],
  },
  {
    id: "vendors",
    title: "Vendor Reports",
    description: "Evaluate vendor performance, spend, and relationships",
    icon: Building2,
    color: "bg-purple-500",
    reports: [
      {
        id: "vendor-performance",
        title: "Vendor Performance Report",
        description: "Comprehensive vendor scorecards with delivery, quality, and pricing metrics",
        icon: TrendingUp,
        href: "/reports/vendors/performance",
      },
      {
        id: "vendor-spend",
        title: "Vendor Spend Analysis",
        description: "Analyze spending patterns and trends across vendors",
        icon: PieChart,
        href: "/reports/vendors/spend",
      },
      {
        id: "vendor-comparison",
        title: "Vendor Comparison Report",
        description: "Side-by-side comparison of vendors on key performance indicators",
        icon: BarChart3,
        href: "/reports/vendors/comparison",
      },
      {
        id: "vendor-risk",
        title: "Vendor Risk Assessment",
        description: "Identify and assess risks associated with vendor relationships",
        icon: AlertTriangle,
        href: "/reports/vendors/risk",
      },
    ],
  },
  {
    id: "invoices",
    title: "Invoice Reports",
    description: "Track invoices, payments, and financial reconciliation",
    icon: FileText,
    color: "bg-orange-500",
    reports: [
      {
        id: "invoice-summary",
        title: "Invoice Summary Report",
        description: "Overview of all invoices with status, amounts, and aging analysis",
        icon: FileSpreadsheet,
        href: "/reports/invoices/summary",
      },
      {
        id: "invoice-aging",
        title: "Invoice Aging Report",
        description: "Analyze unpaid invoices by age buckets (30/60/90+ days)",
        icon: Clock,
        href: "/reports/invoices/aging",
      },
      {
        id: "payment-history",
        title: "Payment History Report",
        description: "Track payment history and trends over time",
        icon: DollarSign,
        href: "/reports/invoices/payments",
      },
      {
        id: "invoice-reconciliation",
        title: "PO-Invoice Reconciliation",
        description: "Match invoices against purchase orders and identify discrepancies",
        icon: CheckCircle,
        href: "/reports/invoices/reconciliation",
      },
    ],
  },
  {
    id: "procurement",
    title: "Procurement Reports",
    description: "Monitor procurement requests and approval workflows",
    icon: ClipboardList,
    color: "bg-indigo-500",
    reports: [
      {
        id: "request-summary",
        title: "Request Summary Report",
        description: "Overview of procurement requests by status, department, and priority",
        icon: FileSpreadsheet,
        href: "/reports/procurement/summary",
      },
      {
        id: "approval-cycle",
        title: "Approval Cycle Report",
        description: "Analyze approval times and identify bottlenecks in the workflow",
        icon: Clock,
        href: "/reports/procurement/approval-cycle",
      },
      {
        id: "department-spend",
        title: "Department Spend Report",
        description: "Spending analysis by department with budget comparisons",
        icon: Users,
        href: "/reports/procurement/department-spend",
      },
      {
        id: "rfp-analysis",
        title: "RFP Analysis Report",
        description: "Track RFP performance, response rates, and award outcomes",
        icon: BarChart3,
        href: "/reports/procurement/rfp-analysis",
      },
    ],
  },
  {
    id: "analytics",
    title: "Analytics Reports",
    description: "Advanced analytics and trend analysis across all modules",
    icon: TrendingUp,
    color: "bg-teal-500",
    reports: [
      {
        id: "spend-analytics",
        title: "Spend Analytics Dashboard",
        description: "Comprehensive spend analysis with trends, forecasts, and savings opportunities",
        icon: LineChart,
        href: "/reports/analytics/spend",
      },
      {
        id: "performance-metrics",
        title: "Performance Metrics Report",
        description: "Key performance indicators across procurement, inventory, and finance",
        icon: TrendingUp,
        href: "/reports/analytics/performance",
      },
      {
        id: "budget-variance",
        title: "Budget Variance Report",
        description: "Compare actual spending against budgets with variance analysis",
        icon: Calculator,
        href: "/reports/analytics/budget-variance",
      },
      {
        id: "savings-report",
        title: "Savings Analysis Report",
        description: "Track cost savings achieved through negotiations and process improvements",
        icon: DollarSign,
        href: "/reports/analytics/savings",
      },
    ],
  },
];

const ReportsIndex = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports Center"
        description="Access comprehensive reports across all modules. Click on any report to view detailed analysis."
      />

      <div className="grid gap-8">
        {reportCategories.map((category) => (
          <div key={category.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${category.color}`}>
                <category.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{category.title}</h2>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {category.reports.map((report) => (
                <Card
                  key={report.id}
                  className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50 group"
                  onClick={() => navigate(report.href)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className={`p-2 rounded-md bg-muted`}>
                        <report.icon className="h-4 w-4 text-foreground" />
                      </div>
                      {report.badge && (
                        <Badge variant={report.badgeVariant || "secondary"}>
                          {report.badge}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base flex items-center gap-2 mt-2">
                      {report.title}
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="line-clamp-2">
                      {report.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsIndex;
