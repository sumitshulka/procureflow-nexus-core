
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Star, Award, Clock, TrendingUp } from "lucide-react";
import { addDays } from "date-fns";

const VendorPerformance = () => {
  const [timeframe, setTimeframe] = useState<string>("90");
  const [sortBy, setSortBy] = useState<string>("performance");

  const { data: vendorData, isLoading } = useQuery({
    queryKey: ["vendor_performance", timeframe],
    queryFn: async () => {
      const fromDate = addDays(new Date(), -parseInt(timeframe));
      
      // Fetch vendor registrations and purchase orders
      const { data: vendors, error: vendorsError } = await supabase
        .from("vendor_registrations")
        .select(`
          id,
          company_name,
          status,
          created_at,
          purchase_orders(
            id,
            final_amount,
            po_date,
            actual_delivery_date,
            expected_delivery_date,
            status
          )
        `)
        .eq("status", "approved");

      if (vendorsError) throw vendorsError;

      // Process vendor performance metrics
      const vendorMetrics = vendors?.map(vendor => {
        const orders = vendor.purchase_orders || [];
        const recentOrders = orders.filter(order => 
          new Date(order.po_date) >= fromDate
        );

        const totalOrders = recentOrders.length;
        const totalValue = recentOrders.reduce((sum, order) => sum + (order.final_amount || 0), 0);
        
        // Calculate on-time delivery rate
        const deliveredOrders = recentOrders.filter(order => 
          order.actual_delivery_date && order.expected_delivery_date
        );
        const onTimeOrders = deliveredOrders.filter(order => 
          new Date(order.actual_delivery_date) <= new Date(order.expected_delivery_date)
        );
        const onTimeRate = deliveredOrders.length ? (onTimeOrders.length / deliveredOrders.length) * 100 : 0;

        // Calculate average delivery time
        const avgDeliveryTime = deliveredOrders.length ? 
          deliveredOrders.reduce((sum, order) => {
            const ordered = new Date(order.po_date);
            const delivered = new Date(order.actual_delivery_date);
            return sum + (delivered.getTime() - ordered.getTime()) / (1000 * 60 * 60 * 24);
          }, 0) / deliveredOrders.length : 0;

        // Performance score (weighted)
        const performanceScore = (
          (onTimeRate * 0.4) + 
          (Math.min(totalOrders / 10, 1) * 100 * 0.3) + 
          (Math.min(totalValue / 100000, 1) * 100 * 0.3)
        );

        return {
          id: vendor.id,
          name: vendor.company_name,
          totalOrders,
          totalValue,
          onTimeRate: Math.round(onTimeRate),
          avgDeliveryTime: Math.round(avgDeliveryTime),
          performanceScore: Math.round(performanceScore),
          status: vendor.status
        };
      }) || [];

      // Sort vendors
      const sortedVendors = vendorMetrics.sort((a, b) => {
        switch (sortBy) {
          case "performance":
            return b.performanceScore - a.performanceScore;
          case "orders":
            return b.totalOrders - a.totalOrders;
          case "value":
            return b.totalValue - a.totalValue;
          case "ontime":
            return b.onTimeRate - a.onTimeRate;
          default:
            return b.performanceScore - a.performanceScore;
        }
      });

      // Top performers for radar chart
      const topPerformers = sortedVendors.slice(0, 5).map(vendor => ({
        vendor: vendor.name.substring(0, 10) + "...",
        onTime: vendor.onTimeRate,
        orders: Math.min(vendor.totalOrders * 10, 100),
        value: Math.min(vendor.totalValue / 1000, 100),
        performance: vendor.performanceScore
      }));

      return {
        vendors: sortedVendors,
        topPerformers,
        totalVendors: vendorMetrics.length,
        avgPerformanceScore: vendorMetrics.length ? 
          vendorMetrics.reduce((sum, v) => sum + v.performanceScore, 0) / vendorMetrics.length : 0
      };
    },
  });

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
          <CardTitle>Vendor Performance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Timeframe</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-48">
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">Performance Score</SelectItem>
                  <SelectItem value="orders">Total Orders</SelectItem>
                  <SelectItem value="value">Total Value</SelectItem>
                  <SelectItem value="ontime">On-Time Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button>Export Report</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Vendors</p>
                <p className="text-3xl font-bold">{vendorData?.totalVendors || 0}</p>
              </div>
              <Award className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Performance</p>
                <p className="text-3xl font-bold">{Math.round(vendorData?.avgPerformanceScore || 0)}%</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Performer</p>
                <p className="text-lg font-bold">
                  {vendorData?.vendors?.[0]?.name?.substring(0, 15) || "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {vendorData?.vendors?.[0]?.performanceScore || 0}% score
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Delivery Time</p>
                <p className="text-3xl font-bold">
                  {Math.round(vendorData?.vendors?.reduce((sum, v) => sum + v.avgDeliveryTime, 0) / (vendorData?.vendors?.length || 1) || 0)}
                </p>
                <p className="text-xs text-muted-foreground">days</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Vendor Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={vendorData?.topPerformers}>
                <PolarGrid />
                <PolarAngleAxis dataKey="vendor" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Performance" dataKey="performance" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendor Performance Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendorData?.vendors?.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="performanceScore" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Vendor Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Performance Score</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>On-Time Rate</TableHead>
                <TableHead>Avg Delivery Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorData?.vendors?.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={vendor.performanceScore} className="w-20" />
                      <span className="text-sm">{vendor.performanceScore}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{vendor.totalOrders}</TableCell>
                  <TableCell>${vendor.totalValue.toLocaleString()}</TableCell>
                  <TableCell>{vendor.onTimeRate}%</TableCell>
                  <TableCell>{vendor.avgDeliveryTime} days</TableCell>
                  <TableCell>
                    <Badge variant={vendor.performanceScore >= 80 ? "default" : 
                                 vendor.performanceScore >= 60 ? "secondary" : "destructive"}>
                      {vendor.performanceScore >= 80 ? "Excellent" : 
                       vendor.performanceScore >= 60 ? "Good" : "Needs Improvement"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorPerformance;
