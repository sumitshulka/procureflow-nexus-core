
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from "recharts";
import { DollarSign, TrendingDown, TrendingUp, Target } from "lucide-react";
import { addDays, format } from "date-fns";

interface DateRange {
  from: Date;
  to: Date;
}

const SpendAnalysis = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: addDays(new Date(), -90),
    to: new Date()
  });
  const [category, setCategory] = useState<string>("all");

  const { data: spendData, isLoading } = useQuery({
    queryKey: ["spend_analysis", dateRange, category],
    queryFn: async () => {
      // Fetch purchase orders with items
      const { data: purchaseOrders, error } = await supabase
        .from("purchase_orders")
        .select(`
          id,
          final_amount,
          po_date,
          currency,
          vendor_id,
          purchase_order_items(
            product_id,
            final_amount,
            products(name, category_id, categories(name))
          )
        `)
        .gte("po_date", dateRange.from.toISOString())
        .lte("po_date", dateRange.to.toISOString());

      if (error) throw error;

      // Process spend data
      const totalSpend = purchaseOrders?.reduce((sum, po) => sum + (po.final_amount || 0), 0) || 0;
      
      // Monthly spend trend
      const monthlySpend = purchaseOrders?.reduce((acc, po) => {
        const month = format(new Date(po.po_date), "MMM yyyy");
        acc[month] = (acc[month] || 0) + (po.final_amount || 0);
        return acc;
      }, {} as Record<string, number>) || {};

      // Category spend breakdown
      const categorySpend = purchaseOrders?.reduce((acc, po) => {
        po.purchase_order_items?.forEach(item => {
          const category = item.products?.categories?.name || "Uncategorized";
          acc[category] = (acc[category] || 0) + (item.final_amount || 0);
        });
        return acc;
      }, {} as Record<string, number>) || {};

      // Top spending categories
      const topCategories = Object.entries(categorySpend)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }));

      return {
        totalSpend,
        avgMonthlySpend: Object.values(monthlySpend).length ? 
          Object.values(monthlySpend).reduce((a, b) => a + b, 0) / Object.values(monthlySpend).length : 0,
        monthlyTrend: Object.entries(monthlySpend).map(([name, value]) => ({ name, value })),
        categoryBreakdown: topCategories,
        purchaseOrdersCount: purchaseOrders?.length || 0
      };
    },
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Spend Analysis Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <DatePickerWithRange 
                date={dateRange} 
                onDateChange={(range) => range && setDateRange(range)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="office_supplies">Office Supplies</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button>Export Analysis</Button>
          </div>
        </CardContent>
      </Card>

      {/* Spend KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spend</p>
                <p className="text-3xl font-bold">${(spendData?.totalSpend || 0).toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Monthly Spend</p>
                <p className="text-3xl font-bold">${(spendData?.avgMonthlySpend || 0).toLocaleString()}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Purchase Orders</p>
                <p className="text-3xl font-bold">{spendData?.purchaseOrdersCount || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                <p className="text-3xl font-bold">
                  ${spendData?.purchaseOrdersCount ? 
                    ((spendData.totalSpend / spendData.purchaseOrdersCount) || 0).toLocaleString() : 0}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spend Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={spendData?.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Spend"]} />
                <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spend by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={spendData?.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {spendData?.categoryBreakdown?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Spend"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Spending Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spendData?.categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Spend"]} />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SpendAnalysis;
