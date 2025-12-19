import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, ArrowLeft, TrendingUp, Clock, DollarSign, CheckCircle, Package, FileText, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/utils/currencyUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

const PerformanceMetricsReportPage = () => {
  const navigate = useNavigate();

  const { data: pos = [] } = useQuery({
    queryKey: ["pos-for-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_orders").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-for-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory-for-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_items").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-for-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendor_registrations").select("*").eq("status", "approved");
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate KPIs
  const totalPOValue = pos.reduce((sum: number, po: any) => sum + (po.final_amount || 0), 0);
  const avgPOValue = pos.length > 0 ? totalPOValue / pos.length : 0;
  
  const approvedPOs = pos.filter((po: any) => po.approval_status === "approved").length;
  const poApprovalRate = pos.length > 0 ? (approvedPOs / pos.length) * 100 : 0;

  const paidInvoices = invoices.filter((inv: any) => inv.status === "paid");
  const totalInvoiceValue = paidInvoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);
  const invoicePaymentRate = invoices.length > 0 ? (paidInvoices.length / invoices.length) * 100 : 0;

  const lowStockItems = inventoryItems.filter((item: any) => 
    item.reorder_level && item.quantity <= item.reorder_level
  ).length;
  const stockHealthRate = inventoryItems.length > 0 
    ? ((inventoryItems.length - lowStockItems) / inventoryItems.length) * 100 
    : 100;

  // Performance metrics data
  const metricsData = [
    {
      category: "Procurement",
      icon: FileText,
      metrics: [
        { name: "Total POs", value: pos.length, format: "number" },
        { name: "Total PO Value", value: totalPOValue, format: "currency" },
        { name: "Avg PO Value", value: avgPOValue, format: "currency" },
        { name: "PO Approval Rate", value: poApprovalRate, format: "percent", target: 90 },
      ],
    },
    {
      category: "Finance",
      icon: DollarSign,
      metrics: [
        { name: "Total Invoices", value: invoices.length, format: "number" },
        { name: "Paid Amount", value: totalInvoiceValue, format: "currency" },
        { name: "Payment Rate", value: invoicePaymentRate, format: "percent", target: 95 },
        { name: "Pending Invoices", value: invoices.filter((i: any) => i.status === "pending").length, format: "number" },
      ],
    },
    {
      category: "Inventory",
      icon: Package,
      metrics: [
        { name: "Total Items", value: inventoryItems.length, format: "number" },
        { name: "Low Stock Items", value: lowStockItems, format: "number" },
        { name: "Stock Health", value: stockHealthRate, format: "percent", target: 85 },
        { name: "Unique Products", value: new Set(inventoryItems.map((i: any) => i.product_id)).size, format: "number" },
      ],
    },
    {
      category: "Vendors",
      icon: Building2,
      metrics: [
        { name: "Active Vendors", value: vendors.length, format: "number" },
        { name: "Total Spend", value: totalPOValue, format: "currency" },
        { name: "Avg Spend/Vendor", value: vendors.length > 0 ? totalPOValue / vendors.length : 0, format: "currency" },
      ],
    },
  ];

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case "currency":
        return formatCurrency(value);
      case "percent":
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  // Chart data
  const kpiChartData = [
    { name: "PO Approval", value: poApprovalRate, target: 90 },
    { name: "Invoice Payment", value: invoicePaymentRate, target: 95 },
    { name: "Stock Health", value: stockHealthRate, target: 85 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Performance Metrics Report"
          description="Key performance indicators across procurement, inventory, and finance"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              PO Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{poApprovalRate.toFixed(1)}%</div>
            <Progress value={poApprovalRate} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Invoice Payment Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoicePaymentRate.toFixed(1)}%</div>
            <Progress value={invoicePaymentRate} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Stock Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockHealthRate.toFixed(1)}%</div>
            <Progress value={stockHealthRate} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPOValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Chart */}
      <Card>
        <CardHeader>
          <CardTitle>KPI Performance vs Target</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpiChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                <Legend />
                <Bar dataKey="value" name="Actual" fill="#0088FE" radius={[0, 4, 4, 0]} />
                <Bar dataKey="target" name="Target" fill="#00C49F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Detailed Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        {metricsData.map((category) => (
          <Card key={category.category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <category.icon className="h-5 w-5" />
                {category.category} Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {category.metrics.map((metric) => (
                  <div key={metric.name} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{metric.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{formatValue(metric.value, metric.format)}</span>
                      {metric.target && (
                        <span className={`text-xs ${metric.value >= metric.target ? "text-green-600" : "text-destructive"}`}>
                          (Target: {metric.target}%)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PerformanceMetricsReportPage;
