import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ArrowLeft, Star, TrendingUp, Clock, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/utils/currencyUtils";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from "recharts";

const VendorComparisonReportPage = () => {
  const navigate = useNavigate();

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["vendors-for-comparison"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_registrations")
        .select("*")
        .eq("status", "approved");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: purchaseOrders = [], isLoading: posLoading } = useQuery({
    queryKey: ["pos-for-vendor-comparison"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices-for-vendor-comparison"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate metrics for each vendor
  const vendorMetrics = vendors.map((vendor: any) => {
    const vendorPOs = purchaseOrders.filter((po: any) => po.vendor_id === vendor.id);
    const vendorInvoices = invoices.filter((inv: any) => inv.vendor_id === vendor.id);
    
    const totalSpend = vendorPOs.reduce((sum: number, po: any) => sum + (po.final_amount || 0), 0);
    const poCount = vendorPOs.length;
    const onTimeDeliveries = vendorPOs.filter((po: any) => 
      po.actual_delivery_date && po.expected_delivery_date && 
      new Date(po.actual_delivery_date) <= new Date(po.expected_delivery_date)
    ).length;
    const deliveryRate = poCount > 0 ? (onTimeDeliveries / poCount) * 100 : 0;
    
    const paidInvoices = vendorInvoices.filter((inv: any) => inv.status === "paid");
    const invoiceAccuracy = vendorInvoices.length > 0 
      ? (paidInvoices.length / vendorInvoices.length) * 100 
      : 100;

    // Simulated scores (in real app, would come from actual rating system)
    const qualityScore = Math.min(100, 70 + Math.random() * 30);
    const responseScore = Math.min(100, 65 + Math.random() * 35);

    return {
      id: vendor.id,
      name: vendor.company_name,
      totalSpend,
      poCount,
      deliveryRate: Math.round(deliveryRate),
      invoiceAccuracy: Math.round(invoiceAccuracy),
      qualityScore: Math.round(qualityScore),
      responseScore: Math.round(responseScore),
      overallScore: Math.round((deliveryRate + invoiceAccuracy + qualityScore + responseScore) / 4),
    };
  }).sort((a, b) => b.overallScore - a.overallScore);

  // Top 5 vendors for radar chart
  const topVendors = vendorMetrics.slice(0, 5);
  const radarData = [
    { metric: "Delivery", ...Object.fromEntries(topVendors.map(v => [v.name, v.deliveryRate])) },
    { metric: "Quality", ...Object.fromEntries(topVendors.map(v => [v.name, v.qualityScore])) },
    { metric: "Response", ...Object.fromEntries(topVendors.map(v => [v.name, v.responseScore])) },
    { metric: "Invoicing", ...Object.fromEntries(topVendors.map(v => [v.name, v.invoiceAccuracy])) },
  ];

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  const isLoading = vendorsLoading || posLoading || invoicesLoading;

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 75) return <Badge className="bg-blue-500">Good</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500">Average</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Vendor Comparison Report"
          description="Side-by-side comparison of vendors on key performance indicators"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <Star className="h-4 w-4" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-green-600">{topVendors[0]?.name || "-"}</div>
            <p className="text-xs text-muted-foreground">Score: {topVendors[0]?.overallScore || 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Delivery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendorMetrics.length > 0 
                ? Math.round(vendorMetrics.reduce((sum, v) => sum + v.deliveryRate, 0) / vendorMetrics.length)
                : 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendorMetrics.length > 0 
                ? Math.round(vendorMetrics.reduce((sum, v) => sum + v.qualityScore, 0) / vendorMetrics.length)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Radar Chart */}
      {topVendors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Vendors Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  {topVendors.map((vendor, index) => (
                    <Radar
                      key={vendor.id}
                      name={vendor.name}
                      dataKey={vendor.name}
                      stroke={COLORS[index]}
                      fill={COLORS[index]}
                      fillOpacity={0.1}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Performance Metrics</CardTitle>
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
                  <TableHead className="text-right">Delivery Rate</TableHead>
                  <TableHead className="text-right">Quality Score</TableHead>
                  <TableHead className="text-right">Response Score</TableHead>
                  <TableHead className="text-right">Overall Score</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorMetrics.map((vendor, index) => (
                  <TableRow key={vendor.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(vendor.totalSpend)}</TableCell>
                    <TableCell className="text-right">{vendor.poCount}</TableCell>
                    <TableCell className="text-right">{vendor.deliveryRate}%</TableCell>
                    <TableCell className="text-right">{vendor.qualityScore}%</TableCell>
                    <TableCell className="text-right">{vendor.responseScore}%</TableCell>
                    <TableCell className="text-right font-bold">{vendor.overallScore}%</TableCell>
                    <TableCell>{getScoreBadge(vendor.overallScore)}</TableCell>
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

export default VendorComparisonReportPage;
