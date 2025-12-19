import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { formatCurrency } from "@/utils/currencyUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const POAgingReportPage = () => {
  const navigate = useNavigate();

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ["po-aging-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          vendor:vendor_id (id, company_name)
        `)
        .in("approval_status", ["approved", "pending_approval", "partially_received"])
        .is("actual_delivery_date", null);
      
      if (error) throw error;
      return data || [];
    },
  });

  const getAgeBucket = (poDate: string) => {
    const days = differenceInDays(new Date(), new Date(poDate));
    if (days <= 30) return "0-30 days";
    if (days <= 60) return "31-60 days";
    if (days <= 90) return "61-90 days";
    return "90+ days";
  };

  const ageBuckets = {
    "0-30 days": { count: 0, value: 0, color: "#22c55e" },
    "31-60 days": { count: 0, value: 0, color: "#eab308" },
    "61-90 days": { count: 0, value: 0, color: "#f97316" },
    "90+ days": { count: 0, value: 0, color: "#ef4444" },
  };

  purchaseOrders.forEach((po: any) => {
    const bucket = getAgeBucket(po.po_date);
    ageBuckets[bucket as keyof typeof ageBuckets].count++;
    ageBuckets[bucket as keyof typeof ageBuckets].value += po.final_amount || 0;
  });

  const chartData = Object.entries(ageBuckets).map(([name, data]) => ({
    name,
    count: data.count,
    value: data.value,
    color: data.color,
  }));

  const getAgeBadge = (bucket: string) => {
    switch (bucket) {
      case "0-30 days":
        return <Badge className="bg-green-500">0-30 days</Badge>;
      case "31-60 days":
        return <Badge className="bg-yellow-500">31-60 days</Badge>;
      case "61-90 days":
        return <Badge className="bg-orange-500">61-90 days</Badge>;
      default:
        return <Badge variant="destructive">90+ days</Badge>;
    }
  };

  const totalValue = purchaseOrders.reduce((sum: number, po: any) => sum + (po.final_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="PO Aging Report"
          description="Analyze open purchase orders by age and identify delayed orders"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open POs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.length}</div>
          </CardContent>
        </Card>
        {Object.entries(ageBuckets).map(([bucket, data]) => (
          <Card key={bucket}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: data.color }}>
                {bucket}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: data.color }}>{data.count}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(data.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Aging Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === "value" ? formatCurrency(value) : value,
                    name === "value" ? "Total Value" : "Count"
                  ]}
                />
                <Bar yAxisId="left" dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
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
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead className="text-right">Days Open</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Age Bucket</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po: any) => {
                  const daysOpen = differenceInDays(new Date(), new Date(po.po_date));
                  const bucket = getAgeBucket(po.po_date);
                  
                  return (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.po_number}</TableCell>
                      <TableCell>{po.vendor?.company_name || "-"}</TableCell>
                      <TableCell>{format(new Date(po.po_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        {po.expected_delivery_date 
                          ? format(new Date(po.expected_delivery_date), "MMM dd, yyyy")
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="text-right">{daysOpen}</TableCell>
                      <TableCell className="text-right">{formatCurrency(po.final_amount, po.currency)}</TableCell>
                      <TableCell>{getAgeBadge(bucket)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{po.approval_status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {purchaseOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No open purchase orders found
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

export default POAgingReportPage;
