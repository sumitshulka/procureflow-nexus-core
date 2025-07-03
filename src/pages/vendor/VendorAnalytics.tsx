import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Award, 
  DollarSign,
  Calendar,
  Target,
  AlertCircle,
} from 'lucide-react';
import VendorLayout from '@/components/layout/VendorLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const VendorAnalytics = () => {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<string>('90');

  // Fetch vendor analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["vendor_analytics", user?.id, timeframe],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const fromDate = subDays(new Date(), parseInt(timeframe));
      
      // Get vendor registration details
      const { data: vendorData } = await supabase
        .from("vendor_registrations")
        .select("id, company_name, status")
        .eq("user_id", user.id)
        .single();

      if (!vendorData) return null;

      // Get RFP responses
      const { data: rfpResponses } = await supabase
        .from("rfp_responses")
        .select(`
          id,
          submitted_at,
          total_bid_amount,
          status,
          rfps!inner(title, status)
        `)
        .eq("vendor_id", vendorData.id)
        .gte("submitted_at", fromDate.toISOString());

      // Get purchase orders
      const { data: purchaseOrders } = await supabase
        .from("purchase_orders")
        .select("id, po_date, final_amount, status")
        .eq("vendor_id", vendorData.id)
        .gte("po_date", fromDate.toISOString());

      // Process data for charts
      const rfpStatusCounts = rfpResponses?.reduce((acc, response) => {
        const status = response.status || 'submitted';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const monthlyBids = rfpResponses?.reduce((acc, response) => {
        const month = format(new Date(response.submitted_at), 'MMM yyyy');
        if (!acc[month]) acc[month] = { month, bids: 0, amount: 0 };
        acc[month].bids += 1;
        acc[month].amount += response.total_bid_amount || 0;
        return acc;
      }, {} as Record<string, any>) || {};

      const monthlyOrders = purchaseOrders?.reduce((acc, order) => {
        const month = format(new Date(order.po_date), 'MMM yyyy');
        if (!acc[month]) acc[month] = { month, orders: 0, value: 0 };
        acc[month].orders += 1;
        acc[month].value += order.final_amount || 0;
        return acc;
      }, {} as Record<string, any>) || {};

      return {
        vendor: vendorData,
        rfpResponses: rfpResponses || [],
        purchaseOrders: purchaseOrders || [],
        rfpStatusData: Object.entries(rfpStatusCounts).map(([status, count]) => ({
          status: status.charAt(0).toUpperCase() + status.slice(1),
          count
        })),
        monthlyBidData: Object.values(monthlyBids),
        monthlyOrderData: Object.values(monthlyOrders),
        stats: {
          totalRFPs: rfpResponses?.length || 0,
          totalBidValue: rfpResponses?.reduce((sum, r) => sum + (r.total_bid_amount || 0), 0) || 0,
          wonOrders: purchaseOrders?.filter(po => po.status === 'delivered').length || 0,
          totalOrderValue: purchaseOrders?.reduce((sum, po) => sum + (po.final_amount || 0), 0) || 0,
          winRate: rfpResponses?.length ? 
            Math.round(((purchaseOrders?.length || 0) / rfpResponses.length) * 100) : 0,
        }
      };
    },
    enabled: !!user?.id,
  });

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (isLoading) {
    return (
      <VendorLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </VendorLayout>
    );
  }

  if (!analyticsData) {
    return (
      <VendorLayout>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No analytics data available</p>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Track your vendor performance and business metrics</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">RFP Responses</p>
                  <p className="text-3xl font-bold">{analyticsData.stats.totalRFPs}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Bid Value</p>
                  <p className="text-3xl font-bold">${analyticsData.stats.totalBidValue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Orders Won</p>
                  <p className="text-3xl font-bold">{analyticsData.stats.wonOrders}</p>
                </div>
                <Award className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order Value</p>
                  <p className="text-3xl font-bold">${analyticsData.stats.totalOrderValue.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                  <p className="text-3xl font-bold">{analyticsData.stats.winRate}%</p>
                  <Progress value={analyticsData.stats.winRate} className="mt-2" />
                </div>
                <Target className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RFP Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>RFP Response Status</CardTitle>
              <CardDescription>Distribution of your RFP response statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.rfpStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, count }) => `${status}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analyticsData.rfpStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Bid Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Bid Activity</CardTitle>
              <CardDescription>Your RFP submissions over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.monthlyBidData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="bids" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Order Value Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Order Value Trend</CardTitle>
              <CardDescription>Value of orders received over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.monthlyOrderData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest RFP responses and orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analyticsData.rfpResponses.slice(0, 5).map((response) => (
                <div key={response.id} className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{response.rfps?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Submitted: {format(new Date(response.submitted_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <Badge variant="outline">{response.status}</Badge>
                </div>
              ))}
              {analyticsData.rfpResponses.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No recent RFP responses</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorAnalytics;