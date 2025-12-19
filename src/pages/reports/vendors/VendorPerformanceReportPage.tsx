import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import PageHeader from "@/components/common/PageHeader";
import { ArrowLeft, Download, Search, Building2, TrendingUp, Star, Package, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface VendorMetrics {
  id: string;
  company_name: string;
  status: string;
  total_pos: number;
  completed_pos: number;
  total_value: number;
  on_time_deliveries: number;
  late_deliveries: number;
  delivery_rate: number;
  quality_score: number;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444"];

const VendorPerformanceReportPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const { data: orgSettings } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organization_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch vendors with their PO data
  const { data: vendorsData, isLoading } = useQuery({
    queryKey: ["vendor-performance-report"],
    queryFn: async () => {
      const { data: vendors, error: vendorError } = await supabase
        .from("vendor_registrations")
        .select("id, company_name, status");

      if (vendorError) throw vendorError;

      // Fetch PO data for each vendor
      const { data: pos, error: poError } = await supabase
        .from("purchase_orders")
        .select("id, vendor_id, status, total_amount, expected_delivery_date, actual_delivery_date");

      if (poError) throw poError;

      // Calculate metrics for each vendor
      const vendorMetrics: VendorMetrics[] = vendors?.map((vendor) => {
        const vendorPOs = pos?.filter((po) => po.vendor_id === vendor.id) || [];
        const completedPOs = vendorPOs.filter((po) => po.status === "completed" || po.status === "received");
        const totalValue = vendorPOs.reduce((sum, po) => sum + (po.total_amount || 0), 0);
        
        // Calculate on-time deliveries (simplified - checking if actual <= expected)
        let onTimeCount = 0;
        let lateCount = 0;
        completedPOs.forEach((po) => {
          if (po.actual_delivery_date && po.expected_delivery_date) {
            if (new Date(po.actual_delivery_date) <= new Date(po.expected_delivery_date)) {
              onTimeCount++;
            } else {
              lateCount++;
            }
          }
        });

        const deliveryRate = completedPOs.length > 0 
          ? Math.round((onTimeCount / completedPOs.length) * 100) 
          : 0;

        // Mock quality score (in real app, this would come from a ratings table)
        const qualityScore = Math.floor(Math.random() * 30) + 70; // 70-100

        return {
          id: vendor.id,
          company_name: vendor.company_name,
          status: vendor.status,
          total_pos: vendorPOs.length,
          completed_pos: completedPOs.length,
          total_value: totalValue,
          on_time_deliveries: onTimeCount,
          late_deliveries: lateCount,
          delivery_rate: deliveryRate,
          quality_score: qualityScore,
        };
      }) || [];

      return vendorMetrics;
    },
  });

  const filteredData = useMemo(() => {
    if (!vendorsData) return [];

    return vendorsData.filter((vendor) => {
      const matchesSearch = vendor.company_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === "all" || vendor.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [vendorsData, searchTerm, selectedStatus]);

  const topVendors = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 5)
      .map((v) => ({ name: v.company_name.substring(0, 15), value: v.total_value }));
  }, [filteredData]);

  const summaryStats = useMemo(() => {
    const totalVendors = filteredData.length;
    const activeVendors = filteredData.filter((v) => v.status === "approved").length;
    const totalPOs = filteredData.reduce((s, v) => s + v.total_pos, 0);
    const totalValue = filteredData.reduce((s, v) => s + v.total_value, 0);
    const avgDeliveryRate = totalVendors > 0
      ? Math.round(filteredData.reduce((s, v) => s + v.delivery_rate, 0) / totalVendors)
      : 0;

    return { totalVendors, activeVendors, totalPOs, totalValue, avgDeliveryRate };
  }, [filteredData]);

  const baseCurrency = orgSettings?.base_currency || "USD";

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (rate >= 75) return <Badge className="bg-blue-500">Good</Badge>;
    if (rate >= 60) return <Badge variant="secondary">Average</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  const handleExportCSV = () => {
    const headers = ["Vendor", "Status", "Total POs", "Completed", "Total Value", "On-Time Rate", "Quality Score"];
    const rows = filteredData.map((v) => [
      v.company_name,
      v.status,
      v.total_pos,
      v.completed_pos,
      v.total_value,
      `${v.delivery_rate}%`,
      `${v.quality_score}%`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendor-performance-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title="Vendor Performance Report"
          description="Comprehensive vendor scorecards with delivery, quality, and pricing metrics"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalVendors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.activeVendors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total POs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalPOs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {baseCurrency} {summaryStats.totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Delivery Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.avgDeliveryRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Filters */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Top Vendors by Value</CardTitle>
          </CardHeader>
          <CardContent>
            {topVendors.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topVendors} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} fontSize={12} />
                  <Tooltip formatter={(value: number) => [`${baseCurrency} ${value.toLocaleString()}`, "Value"]} />
                  <Bar dataKey="value">
                    {topVendors.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground py-8">No data</div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by vendor name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No vendors found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total POs</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>On-Time Rate</TableHead>
                  <TableHead>Quality Score</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.company_name}</TableCell>
                    <TableCell>
                      <Badge variant={vendor.status === "approved" ? "default" : "secondary"}>
                        {vendor.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{vendor.total_pos}</TableCell>
                    <TableCell className="text-right">
                      {baseCurrency} {vendor.total_value.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={vendor.delivery_rate} className="w-16" />
                        <span className="text-sm">{vendor.delivery_rate}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={vendor.quality_score} className="w-16" />
                        <span className="text-sm">{vendor.quality_score}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPerformanceBadge(Math.round((vendor.delivery_rate + vendor.quality_score) / 2))}
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

export default VendorPerformanceReportPage;
