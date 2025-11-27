
import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Package, ShoppingCart, FileText, Users, TrendingUp, Shield, AlertTriangle, Calculator, Building2, Store, Settings, LayoutDashboard, ListChecks, ClipboardList, Receipt, Wallet, BarChart3, Clock, ExternalLink } from "lucide-react";
import jsPDF from "jspdf";

interface Feature {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  category: string;
  route?: string;
}

const FeatureListDocument = () => {
  const navigate = useNavigate();
  
  const features: Feature[] = [
    // Core Dashboard
    {
      title: "Dashboard",
      description: "Central command center providing real-time overview of procurement activities, key metrics, pending approvals, and system-wide statistics. Features interactive charts and quick access to critical functions.",
      icon: LayoutDashboard,
      category: "Core System",
      route: "/dashboard"
    },
    
    // Product Management
    {
      title: "Product Catalog Management",
      description: "Comprehensive product database with categorization, classification, pricing history, and detailed specifications. Supports product creation, editing, tagging, and price tracking with historical data visualization.",
      icon: Package,
      category: "Product Management",
      route: "/products"
    },
    {
      title: "Product Price History",
      description: "Track and analyze product pricing trends over time with visual charts and detailed price change records. Helps in market analysis and cost optimization decisions.",
      icon: TrendingUp,
      category: "Product Management",
      route: "/products"
    },
    
    // Inventory Management
    {
      title: "Inventory Management",
      description: "Real-time inventory tracking across multiple warehouses with stock levels, reorder points, and automated alerts. Includes inventory valuation and movement tracking.",
      icon: Package,
      category: "Inventory Management",
      route: "/inventory/items"
    },
    {
      title: "Inventory Transactions",
      description: "Complete transaction history for all inventory movements including check-ins, check-outs, transfers, and adjustments with detailed audit trails.",
      icon: ListChecks,
      category: "Inventory Management",
      route: "/inventory/transactions"
    },
    {
      title: "Warehouse Management",
      description: "Multi-location warehouse management with location-based inventory tracking, warehouse-specific reporting, and transfer capabilities between locations.",
      icon: Building2,
      category: "Inventory Management",
      route: "/inventory/warehouses"
    },
    {
      title: "Inventory Valuation Reports",
      description: "Advanced inventory valuation with support for FIFO, LIFO, and Weighted Average costing methods. Provides detailed cost calculations, total inventory value, and valuation method indicators for financial compliance and accurate inventory costing.",
      icon: Calculator,
      category: "Inventory Management",
      route: "/inventory/reports"
    },
    {
      title: "Stock Movement Reports",
      description: "Comprehensive tracking of all inventory movements including check-ins, check-outs, transfers, and adjustments. Filterable by warehouse, product, and transaction type with detailed audit trails and exportable reports.",
      icon: TrendingUp,
      category: "Inventory Management",
      route: "/inventory/reports"
    },
    {
      title: "Stock Aging Reports",
      description: "Identify slow-moving and stagnant inventory with aging analysis showing days since last update. Categorizes stock as fresh, aging, slow-moving, or stagnant to optimize inventory turnover and reduce carrying costs.",
      icon: Clock,
      category: "Inventory Management",
      route: "/inventory/reports"
    },
    
    // Procurement Process
    {
      title: "Procurement Requests",
      description: "Digital procurement request system with workflow management, approval routing, status tracking, and integration with product catalog for streamlined requesting process.",
      icon: ListChecks,
      category: "Procurement Process",
      route: "/procurement-requests"
    },
    {
      title: "Request for Proposal (RFP) Management",
      description: "End-to-end RFP lifecycle management including creation, vendor selection, response collection, evaluation, and comparison with customizable templates and criteria.",
      icon: FileText,
      category: "Procurement Process",
      route: "/rfp/active"
    },
    {
      title: "RFP Templates",
      description: "Pre-built and customizable RFP templates for different procurement categories with dynamic field creation, evaluation criteria setup, and reusable components.",
      icon: FileText,
      category: "Procurement Process",
      route: "/rfp/templates"
    },
    {
      title: "RFP Wizard",
      description: "Step-by-step guided RFP creation process with basic information capture, BOQ management, vendor selection, terms definition, and review workflow.",
      icon: Settings,
      category: "Procurement Process",
      route: "/rfp/create-wizard"
    },
    {
      title: "Purchase Order Management",
      description: "Complete purchase order lifecycle from creation to delivery tracking, including PO generation from RFP responses, vendor management, and delivery scheduling.",
      icon: ShoppingCart,
      category: "Procurement Process",
      route: "/purchase-orders/management"
    },
    
    // Invoice Management
    {
      title: "Invoice Management",
      description: "Comprehensive invoice lifecycle management with multi-currency support, PO linkage, line item tracking, and payment status monitoring. Supports both PO-based and non-PO invoices with complete audit trails and approval workflows.",
      icon: Receipt,
      category: "Invoice Management",
      route: "/invoices/management"
    },
    {
      title: "Invoice Approval Matrix",
      description: "Configurable multi-level invoice approval system with amount-based routing, role-based approvers, department-specific workflows, and sequential approval tracking. Ensures financial controls and compliance with organizational policies.",
      icon: ClipboardList,
      category: "Invoice Management",
      route: "/settings"
    },
    {
      title: "Vendor Invoice Creation",
      description: "Self-service invoice creation portal for vendors with product selection from their portfolio, custom line items, multi-currency support, tax calculations, and PDF attachment capabilities. Vendors can track invoice status and approval progress in real-time.",
      icon: Wallet,
      category: "Invoice Management",
      route: "/vendor/invoices"
    },
    {
      title: "Invoice Tracking & Payment",
      description: "Complete invoice status tracking from draft to payment with approval history, payment recording, dispute management, and professional invoice formatting. Supports multiple currencies with proper symbol display and amount-in-words conversion.",
      icon: BarChart3,
      category: "Invoice Management",
      route: "/invoices/management"
    },
    
    // Approval System
    {
      title: "Approval Workflow",
      description: "Configurable multi-level approval system with role-based routing, automated notifications, approval tracking, and escalation management for all procurement activities.",
      icon: ClipboardList,
      category: "Approval System",
      route: "/approvals"
    },
    {
      title: "Approval Hierarchy",
      description: "Department-wise approval hierarchy configuration with role-based approver assignment, level-based routing, and flexible approval rule management.",
      icon: Users,
      category: "Approval System",
      route: "/user-management"
    },
    
    // Vendor Management
    {
      title: "Vendor Management",
      description: "Comprehensive vendor database with registration, qualification, performance tracking, communication history, and document management for vendor relationships.",
      icon: Building2,
      category: "Vendor Management",
      route: "/vendors"
    },
    {
      title: "Vendor Portal",
      description: "Self-service portal for vendors to manage their profiles, submit RFP responses, track purchase orders, and communicate with procurement teams.",
      icon: Store,
      category: "Vendor Management",
      route: "/vendor/portal"
    },
    {
      title: "Vendor Registration",
      description: "Structured vendor onboarding process with document upload, verification workflow, approval system, and automated communication for new vendor registration.",
      icon: Users,
      category: "Vendor Management",
      route: "/vendor/register"
    },
    {
      title: "Vendor Performance Analytics",
      description: "Performance tracking and analytics for vendor evaluation including delivery performance, quality metrics, pricing competitiveness, and relationship scoring.",
      icon: TrendingUp,
      category: "Vendor Management",
      route: "/analytics/vendor-performance"
    },
    
    // Analytics & Reporting
    {
      title: "Spend Analysis",
      description: "Comprehensive spending analytics with category-wise breakdown, trend analysis, budget variance reporting, and cost optimization insights across all procurement activities.",
      icon: TrendingUp,
      category: "Analytics & Reporting",
      route: "/analytics/spend-analysis"
    },
    {
      title: "Performance Analytics",
      description: "System-wide performance metrics including procurement cycle times, approval efficiency, vendor performance, and process optimization recommendations.",
      icon: TrendingUp,
      category: "Analytics & Reporting",
      route: "/analytics/performance"
    },
    {
      title: "Custom Reports",
      description: "Flexible report builder with customizable parameters, multiple export formats, scheduled delivery, and dashboard integration for tailored business intelligence.",
      icon: FileText,
      category: "Analytics & Reporting",
      route: "/analytics/custom-reports"
    },
    
    // Budget Management
    {
      title: "Budget Cycles",
      description: "Time-based budget management with configurable fiscal periods (annual, quarterly, monthly). Supports budget cycle status tracking, department-specific access controls, and period-based budget allocations for structured financial planning.",
      icon: Calculator,
      category: "Budget Management",
      route: "/budget/overview"
    },
    {
      title: "Budget Heads",
      description: "Structured budget categorization with hierarchical budget heads for income and expenses. Supports department-specific sub-items, custom codes, and flexible budget allocation structures for comprehensive financial organization.",
      icon: Calculator,
      category: "Budget Management",
      route: "/budget/overview"
    },
    {
      title: "Budget Allocation",
      description: "Strategic budget distribution across departments, categories, and time periods with multi-level approval workflows, submission tracking, and real-time monitoring of allocations versus actual spending.",
      icon: Calculator,
      category: "Budget Management",
      route: "/budget/allocation"
    },
    {
      title: "Budget Reports",
      description: "Detailed budget performance reporting with variance analysis, spending trends, forecast accuracy, and budget utilization metrics for financial control and strategic decision-making.",
      icon: FileText,
      category: "Budget Management",
      route: "/budget/reports"
    },
    
    // Risk & Compliance
    {
      title: "Risk Assessment",
      description: "Procurement risk identification and assessment framework with risk scoring, mitigation strategies, and continuous monitoring for supply chain security.",
      icon: AlertTriangle,
      category: "Risk & Compliance",
      route: "/risk/assessment"
    },
    {
      title: "Risk Monitoring",
      description: "Real-time risk monitoring dashboard with automated alerts, risk trend analysis, and proactive risk management tools for continuous risk oversight.",
      icon: AlertTriangle,
      category: "Risk & Compliance",
      route: "/risk/monitoring"
    },
    {
      title: "Audit Trail",
      description: "Complete audit trail for all system activities with user actions, data changes, approval history, and compliance reporting for regulatory requirements.",
      icon: Shield,
      category: "Risk & Compliance",
      route: "/compliance/audit-trail"
    },
    {
      title: "Policy Management",
      description: "Procurement policy definition, enforcement, and compliance tracking with automated policy checks, violation alerts, and policy adherence reporting.",
      icon: Shield,
      category: "Risk & Compliance",
      route: "/compliance/policies"
    },
    {
      title: "Compliance Reports",
      description: "Regulatory compliance reporting suite with audit-ready reports, compliance metrics, violation tracking, and automated compliance monitoring.",
      icon: FileText,
      category: "Risk & Compliance",
      route: "/compliance/reports"
    },
    
    // System Administration
    {
      title: "User Management",
      description: "Comprehensive user administration with role-based access control, permission management, user lifecycle management, and security controls.",
      icon: Users,
      category: "System Administration",
      route: "/user-management"
    },
    {
      title: "Role Management",
      description: "Flexible role definition and permission assignment system with custom roles, hierarchical permissions, and granular access control for system security.",
      icon: Settings,
      category: "System Administration",
      route: "/settings"
    },
    {
      title: "System Settings",
      description: "Global system configuration including organization settings, currency management, notification preferences, and system-wide parameter configuration.",
      icon: Settings,
      category: "System Administration",
      route: "/settings"
    },
    {
      title: "Master Data Management",
      description: "Centralized management of reference data including categories, units, departments, classifications, and other master data entities used throughout the system.",
      icon: Settings,
      category: "System Administration",
      route: "/settings"
    }
  ];

  const generatePDF = () => {
    const pdf = new jsPDF();
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    let yPosition = margin;

    // Title
    pdf.setFontSize(20);
    pdf.setTextColor(40, 44, 52);
    pdf.text("Procurement Management System", margin, yPosition);
    pdf.text("Feature Documentation", margin, yPosition + 10);
    
    yPosition += 30;

    pdf.setFontSize(12);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 20;

    // Group features by category
    const groupedFeatures = features.reduce((acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    }, {} as Record<string, Feature[]>);

    // Generate content for each category
    Object.entries(groupedFeatures).forEach(([category, categoryFeatures]) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = margin;
      }

      // Category header
      pdf.setFontSize(16);
      pdf.setTextColor(59, 130, 246);
      pdf.text(category, margin, yPosition);
      yPosition += 15;

      categoryFeatures.forEach((feature) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 80) {
          pdf.addPage();
          yPosition = margin;
        }

        // Feature title
        pdf.setFontSize(14);
        pdf.setTextColor(40, 44, 52);
        pdf.text(feature.title, margin + 5, yPosition);
        yPosition += 8;

        // Feature description
        pdf.setFontSize(11);
        pdf.setTextColor(75, 85, 99);
        const splitDescription = pdf.splitTextToSize(feature.description, 170);
        pdf.text(splitDescription, margin + 5, yPosition);
        yPosition += (splitDescription.length * 5) + 10;
      });

      yPosition += 10;
    });

    // Add summary
    if (yPosition > pageHeight - 100) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFontSize(16);
    pdf.setTextColor(59, 130, 246);
    pdf.text("System Summary", margin, yPosition);
    yPosition += 15;

    pdf.setFontSize(11);
    pdf.setTextColor(75, 85, 99);
    const summary = [
      `Total Features: ${features.length}`,
      `Categories: ${Object.keys(groupedFeatures).length}`,
      "",
      "This procurement management system provides a comprehensive solution for",
      "end-to-end procurement processes, from request creation to purchase order",
      "fulfillment, with robust analytics, compliance, and vendor management capabilities.",
      "",
      "The system is built with modern web technologies and follows industry",
      "best practices for security, scalability, and user experience."
    ];

    summary.forEach((line) => {
      pdf.text(line, margin, yPosition);
      yPosition += 6;
    });

    // Save the PDF
    pdf.save("Procurement_System_Features.pdf");
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Procurement Management System - Feature Documentation
          </CardTitle>
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">
              Comprehensive list of all system features and capabilities
            </p>
            <Button onClick={generatePDF} className="flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {Object.entries(
              features.reduce((acc, feature) => {
                if (!acc[feature.category]) {
                  acc[feature.category] = [];
                }
                acc[feature.category].push(feature);
                return acc;
              }, {} as Record<string, Feature[]>)
            ).map(([category, categoryFeatures]) => (
              <div key={category}>
                <h2 className="text-xl font-semibold text-primary mb-4 border-b pb-2">
                  {category}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                  {categoryFeatures.map((feature, index) => (
                    <Card key={index} className="border-l-4 border-l-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <feature.icon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                              <p className="text-muted-foreground leading-relaxed">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                          {feature.route && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(feature.route!)}
                              className="flex items-center gap-1 shrink-0"
                            >
                              Open
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 p-6 bg-muted rounded-lg">
            <h3 className="text-lg font-semibold mb-2">System Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Features:</span>
                <p className="text-2xl font-bold text-primary">{features.length}</p>
              </div>
              <div>
                <span className="font-medium">Categories:</span>
                <p className="text-2xl font-bold text-primary">
                  {Object.keys(features.reduce((acc, feature) => {
                    acc[feature.category] = true;
                    return acc;
                  }, {} as Record<string, boolean>)).length}
                </p>
              </div>
              <div className="col-span-2">
                <span className="font-medium">Coverage:</span>
                <p className="text-sm text-muted-foreground mt-1">
                  End-to-end procurement management with analytics, compliance, and vendor management
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeatureListDocument;
