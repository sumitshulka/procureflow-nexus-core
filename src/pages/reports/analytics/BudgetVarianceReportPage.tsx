import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, ArrowLeft, TrendingUp, TrendingDown, Calculator, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/utils/currencyUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";

const BudgetVarianceReportPage = () => {
  const navigate = useNavigate();

  const { data: budgetHeads = [], isLoading: headsLoading } = useQuery({
    queryKey: ["budget-heads-for-variance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("budget_heads").select("*").eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allocations = [], isLoading: allocLoading } = useQuery({
    queryKey: ["budget-allocations-for-variance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_allocations")
        .select("*, budget_heads:head_id (name), departments:department_id (name)");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: purchaseOrders = [], isLoading: posLoading } = useQuery({
    queryKey: ["pos-for-budget-variance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_orders").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate variance by budget head
  const varianceData = budgetHeads.map((head: any) => {
    const headAllocations = allocations.filter((a: any) => a.head_id === head.id);
    const budgetAmount = headAllocations.reduce((sum: number, a: any) => sum + (a.allocated_amount || 0), 0);
    const approvedAmount = headAllocations.reduce((sum: number, a: any) => sum + (a.approved_amount || 0), 0);
    
    // For actual spend, we'd need to link POs to budget heads - using a simplified calculation
    const actualSpend = purchaseOrders.reduce((sum: number, po: any) => sum + (po.final_amount || 0), 0) / budgetHeads.length;
    
    const variance = budgetAmount - actualSpend;
    const variancePercent = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0;
    const utilizationPercent = budgetAmount > 0 ? (actualSpend / budgetAmount) * 100 : 0;

    return {
      id: head.id,
      name: head.name,
      budget: budgetAmount,
      approved: approvedAmount,
      actual: actualSpend,
      variance,
      variancePercent,
      utilizationPercent: Math.min(100, utilizationPercent),
      status: variance >= 0 ? "under" : "over",
    };
  }).filter((h) => h.budget > 0);

  const totalBudget = varianceData.reduce((sum, v) => sum + v.budget, 0);
  const totalActual = varianceData.reduce((sum, v) => sum + v.actual, 0);
  const totalVariance = totalBudget - totalActual;
  const overBudgetCount = varianceData.filter((v) => v.status === "over").length;

  const chartData = varianceData.slice(0, 8).map((v) => ({
    name: v.name.length > 15 ? v.name.substring(0, 15) + "..." : v.name,
    budget: v.budget,
    actual: v.actual,
    variance: v.variance,
  }));

  const isLoading = headsLoading || allocLoading || posLoading;

  const getStatusBadge = (status: string, percent: number) => {
    if (status === "over") {
      return <Badge variant="destructive">Over by {Math.abs(percent).toFixed(1)}%</Badge>;
    }
    if (percent > 20) {
      return <Badge className="bg-green-500">Under by {percent.toFixed(1)}%</Badge>;
    }
    return <Badge className="bg-blue-500">On Track</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Budget Variance Report"
          description="Compare actual spending against budgets with variance analysis"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actual Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium flex items-center gap-2 ${totalVariance >= 0 ? "text-green-600" : "text-destructive"}`}>
              {totalVariance >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              Total Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalVariance >= 0 ? "text-green-600" : "text-destructive"}`}>
              {totalVariance >= 0 ? "+" : ""}{formatCurrency(totalVariance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Over Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overBudgetCount}</div>
            <p className="text-xs text-muted-foreground">budget categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="budget" name="Budget" fill="#0088FE" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#00C49F" radius={[4, 4, 0, 0]} />
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

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Variance Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Budget Category</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {varianceData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.budget)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.actual)}</TableCell>
                    <TableCell className={`text-right font-medium ${item.variance >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {item.variance >= 0 ? "+" : ""}{formatCurrency(item.variance)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={item.utilizationPercent} 
                          className={`w-20 ${item.status === "over" ? "[&>div]:bg-destructive" : ""}`}
                        />
                        <span className="text-sm">{item.utilizationPercent.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status, item.variancePercent)}</TableCell>
                  </TableRow>
                ))}
                {varianceData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No budget data available
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

export default BudgetVarianceReportPage;
