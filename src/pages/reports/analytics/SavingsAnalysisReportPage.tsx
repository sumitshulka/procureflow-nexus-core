import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, DollarSign, TrendingUp, Percent, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/currencyUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

const SavingsAnalysisReportPage = () => {
  const navigate = useNavigate();

  const { data: purchaseOrders = [], isLoading: posLoading } = useQuery({
    queryKey: ["pos-for-savings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          vendor:vendor_id (id, company_name)
        `);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: rfps = [], isLoading: rfpsLoading } = useQuery({
    queryKey: ["rfps-for-savings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfps")
        .select("*")
        .eq("status", "awarded");
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate savings metrics
  // Note: In a real system, you'd track original quoted prices vs negotiated prices
  // Here we'll simulate savings calculations
  
  const totalPOValue = purchaseOrders.reduce((sum: number, po: any) => sum + (po.final_amount || 0), 0);
  
  // Simulated savings from negotiations (discount amounts from POs)
  const negotiationSavings = purchaseOrders.reduce((sum: number, po: any) => sum + (po.discount_amount || 0), 0);
  
  // Simulated savings from competitive bidding (based on RFP data)
  const competitiveBiddingSavings = rfps.reduce((sum: number, rfp: any) => {
    const estimatedBudget = rfp.estimated_budget || 0;
    // Assume 10-15% savings from competitive bidding
    return sum + (estimatedBudget * 0.12);
  }, 0);

  // Process efficiency savings (simulated)
  const processEfficiencySavings = totalPOValue * 0.02; // 2% from process improvements

  const totalSavings = negotiationSavings + competitiveBiddingSavings + processEfficiencySavings;
  const savingsRate = totalPOValue > 0 ? (totalSavings / (totalPOValue + totalSavings)) * 100 : 0;

  // Savings by category
  const savingsBreakdown = [
    { name: "Negotiation Discounts", value: negotiationSavings, color: "#0088FE" },
    { name: "Competitive Bidding", value: competitiveBiddingSavings, color: "#00C49F" },
    { name: "Process Efficiency", value: processEfficiencySavings, color: "#FFBB28" },
  ];

  // Monthly savings trend (simulated)
  const monthlySavings = purchaseOrders.reduce((acc: any, po: any) => {
    const month = format(new Date(po.po_date), "MMM yyyy");
    if (!acc[month]) {
      acc[month] = { spend: 0, savings: 0 };
    }
    acc[month].spend += po.final_amount || 0;
    acc[month].savings += po.discount_amount || 0;
    return acc;
  }, {});

  const trendData = Object.entries(monthlySavings)
    .map(([month, data]: [string, any]) => ({
      month,
      spend: data.spend,
      savings: data.savings,
      savingsRate: data.spend > 0 ? (data.savings / data.spend) * 100 : 0,
    }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    .slice(-6);

  // Top savings opportunities by vendor
  const vendorSavings = purchaseOrders.reduce((acc: any, po: any) => {
    const vendorName = po.vendor?.company_name || "Unknown";
    if (!acc[vendorName]) {
      acc[vendorName] = { spend: 0, savings: 0 };
    }
    acc[vendorName].spend += po.final_amount || 0;
    acc[vendorName].savings += po.discount_amount || 0;
    return acc;
  }, {});

  const vendorData = Object.entries(vendorSavings)
    .map(([name, data]: [string, any]) => ({
      name,
      spend: data.spend,
      savings: data.savings,
      savingsRate: data.spend > 0 ? (data.savings / data.spend) * 100 : 0,
    }))
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 10);

  const isLoading = posLoading || rfpsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Savings Analysis Report"
          description="Track cost savings achieved through negotiations and process improvements"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalSavings)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Savings Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{savingsRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Negotiation Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(negotiationSavings)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              RFP Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(competitiveBiddingSavings)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Savings Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={savingsBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {savingsBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Savings Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value: any, name) => [
                    formatCurrency(value),
                    name === "savings" ? "Savings" : "Spend"
                  ]} />
                  <Legend />
                  <Line type="monotone" dataKey="savings" name="Savings" stroke="#22c55e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Vendor Savings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Savings by Vendor</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                  <TableHead className="text-right">Savings Achieved</TableHead>
                  <TableHead className="text-right">Savings Rate</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorData.map((vendor, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(vendor.spend)}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatCurrency(vendor.savings)}
                    </TableCell>
                    <TableCell className="text-right">{vendor.savingsRate.toFixed(1)}%</TableCell>
                    <TableCell>
                      {vendor.savingsRate >= 10 ? (
                        <Badge className="bg-green-500">Excellent</Badge>
                      ) : vendor.savingsRate >= 5 ? (
                        <Badge className="bg-blue-500">Good</Badge>
                      ) : (
                        <Badge variant="secondary">Average</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {vendorData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No savings data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SavingsAnalysisReportPage;
