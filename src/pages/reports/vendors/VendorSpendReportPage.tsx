import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Download, ArrowLeft, DollarSign, Building2, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { formatCurrency } from "@/utils/currencyUtils";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"];

const VendorSpendReportPage = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(subMonths(new Date(), 12)));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ["vendor-spend-report", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          vendor:vendor_id (id, company_name)
        `)
        .gte("po_date", format(startDate, "yyyy-MM-dd"))
        .lte("po_date", format(endDate, "yyyy-MM-dd"));
      
      if (error) throw error;
      return data || [];
    },
  });

  // Aggregate by vendor
  const vendorSpend = purchaseOrders.reduce((acc: any, po: any) => {
    const vendorName = po.vendor?.company_name || "Unknown Vendor";
    if (!acc[vendorName]) {
      acc[vendorName] = { spend: 0, poCount: 0, vendorId: po.vendor_id };
    }
    acc[vendorName].spend += po.final_amount || 0;
    acc[vendorName].poCount++;
    return acc;
  }, {});

  const vendorData = Object.entries(vendorSpend)
    .map(([name, data]: [string, any]) => ({
      name,
      spend: data.spend,
      poCount: data.poCount,
      avgPOValue: data.poCount > 0 ? data.spend / data.poCount : 0,
    }))
    .sort((a, b) => b.spend - a.spend);

  // Monthly trend data
  const monthlyData = purchaseOrders.reduce((acc: any, po: any) => {
    const month = format(new Date(po.po_date), "MMM yyyy");
    if (!acc[month]) acc[month] = 0;
    acc[month] += po.final_amount || 0;
    return acc;
  }, {});

  const trendData = Object.entries(monthlyData)
    .map(([month, spend]) => ({ month, spend: spend as number }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  const totalSpend = vendorData.reduce((sum, v) => sum + v.spend, 0);
  const topVendorSpend = vendorData[0]?.spend || 0;
  const topVendorShare = totalSpend > 0 ? ((topVendorSpend / totalSpend) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Vendor Spend Analysis"
          description="Analyze spending patterns and trends across vendors"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Active Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendorData.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Vendor Share</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topVendorShare}%</div>
            <p className="text-xs text-muted-foreground">{vendorData[0]?.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Vendor Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(vendorData.length > 0 ? totalSpend / vendorData.length : 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <DatePicker date={startDate} onDateChange={(d) => d && setStartDate(d)} placeholder="Start Date" />
            <DatePicker date={endDate} onDateChange={(d) => d && setEndDate(d)} placeholder="End Date" />
            <Button variant="outline" className="ml-auto">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendor Spend Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vendorData.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name.substring(0, 15)}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="spend"
                  >
                    {vendorData.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Spend Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="spend" stroke="#0088FE" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Spend Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                  <TableHead className="text-right">PO Count</TableHead>
                  <TableHead className="text-right">Avg PO Value</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorData.map((vendor, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(vendor.spend)}</TableCell>
                    <TableCell className="text-right">{vendor.poCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(vendor.avgPOValue)}</TableCell>
                    <TableCell className="text-right">
                      {((vendor.spend / totalSpend) * 100).toFixed(1)}%
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

export default VendorSpendReportPage;
