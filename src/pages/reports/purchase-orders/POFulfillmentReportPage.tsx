import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, ArrowLeft, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { formatCurrency } from "@/utils/currencyUtils";

const POFulfillmentReportPage = () => {
  const navigate = useNavigate();

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ["po-fulfillment-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          vendor:vendor_id (id, company_name),
          items:purchase_order_items (*)
        `)
        .in("approval_status", ["approved", "partially_received", "fully_received"]);
      
      if (error) throw error;
      return data || [];
    },
  });

  const getFulfillmentStatus = (po: any) => {
    if (po.approval_status === "fully_received") return "complete";
    if (po.approval_status === "partially_received") return "partial";
    if (po.actual_delivery_date) return "complete";
    if (po.expected_delivery_date && new Date(po.expected_delivery_date) < new Date()) return "overdue";
    return "pending";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-green-500">Complete</Badge>;
      case "partial":
        return <Badge className="bg-blue-500">Partial</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const stats = {
    total: purchaseOrders.length,
    complete: purchaseOrders.filter((po: any) => getFulfillmentStatus(po) === "complete").length,
    partial: purchaseOrders.filter((po: any) => getFulfillmentStatus(po) === "partial").length,
    overdue: purchaseOrders.filter((po: any) => getFulfillmentStatus(po) === "overdue").length,
    pending: purchaseOrders.filter((po: any) => getFulfillmentStatus(po) === "pending").length,
  };

  const fulfillmentRate = stats.total > 0 
    ? Math.round(((stats.complete + stats.partial * 0.5) / stats.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="PO Fulfillment Report"
          description="Track delivery performance and fulfillment rates against purchase orders"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total POs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.complete}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Partial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.partial}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fulfillment Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{fulfillmentRate}%</div>
              <Progress value={fulfillmentRate} className="w-16" />
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
                  <TableHead>Actual Delivery</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Days Variance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po: any) => {
                  const status = getFulfillmentStatus(po);
                  const daysVariance = po.expected_delivery_date && po.actual_delivery_date
                    ? differenceInDays(new Date(po.actual_delivery_date), new Date(po.expected_delivery_date))
                    : null;
                  
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
                      <TableCell>
                        {po.actual_delivery_date 
                          ? format(new Date(po.actual_delivery_date), "MMM dd, yyyy")
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(po.final_amount, po.currency)}
                      </TableCell>
                      <TableCell>
                        {daysVariance !== null ? (
                          <span className={daysVariance > 0 ? "text-destructive" : "text-green-600"}>
                            {daysVariance > 0 ? `+${daysVariance}` : daysVariance} days
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(status)}</TableCell>
                    </TableRow>
                  );
                })}
                {purchaseOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No purchase orders found
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

export default POFulfillmentReportPage;
