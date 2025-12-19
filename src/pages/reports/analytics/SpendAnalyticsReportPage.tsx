import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from "@/components/common/PageHeader";
import { ArrowLeft, Download, DollarSign, TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];

const SpendAnalyticsReportPage = () => {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<string>("6");

  const { data: orgSettings } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organization_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch PO data for spend analysis
  const { data: poData, isLoading } = useQuery({
    queryKey: ["spend-analytics", timeframe],
    queryFn: async () => {
      const months = parseInt(timeframe);
      const startDate = startOfMonth(subMonths(new Date(), months - 1));

      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          id,
          total_amount,
          currency,
          created_at,
          status,
          vendor:vendor_id (company_name)
        `)
        .gte("created_at", startDate.toISOString())
        .in("status", ["approved", "sent", "completed", "received"]);

      if (error) throw error;
      return data;
    },
  });

  // Fetch categories for category spend analysis
  const { data: categorySpend } = useQuery({
    queryKey: ["category-spend", timeframe],
    queryFn: async () => {
      const months = parseInt(timeframe);
      const startDate = startOfMonth(subMonths(new Date(), months - 1));

      const { data, error } = await supabase
        .from("purchase_order_items")
        .select(`
          quantity,
          unit_price,
          purchase_orders!inner (created_at, status),
          products:product_id (
            categories:category_id (name)
          )
        `)
        .gte("purchase_orders.created_at", startDate.toISOString())
        .in("purchase_orders.status", ["approved", "sent", "completed", "received"]);

      if (error) throw error;
      return data;
    },
  });

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    if (!poData) return [];

    const months = parseInt(timeframe);
    const monthlyData: Record<string, number> = {};

    // Initialize months
    for (let i = months - 1; i >= 0; i--) {
      const month = format(subMonths(new Date(), i), "MMM yyyy");
      monthlyData[month] = 0;
    }

    // Aggregate spend
    poData.forEach((po: any) => {
      const month = format(parseISO(po.created_at), "MMM yyyy");
      if (monthlyData[month] !== undefined) {
        monthlyData[month] += po.total_amount || 0;
      }
    });

    return Object.entries(monthlyData).map(([month, amount]) => ({ month, amount }));
  }, [poData, timeframe]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    if (!categorySpend) return [];

    const categoryTotals: Record<string, number> = {};
    
    categorySpend.forEach((item: any) => {
      const category = item.products?.categories?.name || "Uncategorized";
      const value = (item.quantity || 0) * (item.unit_price || 0);
      categoryTotals[category] = (categoryTotals[category] || 0) + value;
    });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [categorySpend]);

  // Vendor spend breakdown
  const vendorSpend = useMemo(() => {
    if (!poData) return [];

    const vendorTotals: Record<string, number> = {};
    
    poData.forEach((po: any) => {
      const vendor = po.vendor?.company_name || "Unknown";
      vendorTotals[vendor] = (vendorTotals[vendor] || 0) + (po.total_amount || 0);
    });

    return Object.entries(vendorTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [poData]);

  // Summary stats
  const summaryStats = useMemo(() => {
    if (!poData || !monthlyTrend.length) {
      return { totalSpend: 0, avgMonthly: 0, trend: 0, poCount: 0 };
    }

    const totalSpend = poData.reduce((s, po: any) => s + (po.total_amount || 0), 0);
    const avgMonthly = totalSpend / parseInt(timeframe);
    
    // Calculate trend (compare last 2 months)
    const lastMonth = monthlyTrend[monthlyTrend.length - 1]?.amount || 0;
    const prevMonth = monthlyTrend[monthlyTrend.length - 2]?.amount || 0;
    const trend = prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100) : 0;

    return { totalSpend, avgMonthly, trend, poCount: poData.length };
  }, [poData, monthlyTrend, timeframe]);

  const baseCurrency = orgSettings?.base_currency || "USD";

  const handleExportCSV = () => {
    const headers = ["Month", "Total Spend"];
    const rows = monthlyTrend.map((m) => [m.month, m.amount]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spend-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title="Spend Analytics Dashboard"
          description="Comprehensive spend analysis with trends, forecasts, and savings opportunities"
        />
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {baseCurrency} {summaryStats.totalSpend.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Last {timeframe} months</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Monthly</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {baseCurrency} {summaryStats.avgMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Per month average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month Trend</CardTitle>
            {summaryStats.trend >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summaryStats.trend >= 0 ? "text-green-500" : "text-red-500"}`}>
              {summaryStats.trend >= 0 ? "+" : ""}{summaryStats.trend}%
            </div>
            <p className="text-xs text-muted-foreground">vs previous month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total POs</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.poCount}</div>
            <p className="text-xs text-muted-foreground">Approved orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spend Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value: number) => [`${baseCurrency} ${value.toLocaleString()}`, "Spend"]} />
                  <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spend by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${baseCurrency} ${value.toLocaleString()}`, "Spend"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No category data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Vendors by Spend</CardTitle>
        </CardHeader>
        <CardContent>
          {vendorSpend.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No vendor data</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorSpend.map((vendor, index) => (
                  <TableRow key={vendor.name}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{vendor.name}</TableCell>
                    <TableCell className="text-right">
                      {baseCurrency} {vendor.value.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {summaryStats.totalSpend > 0
                        ? ((vendor.value / summaryStats.totalSpend) * 100).toFixed(1)
                        : 0}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SpendAnalyticsReportPage;
