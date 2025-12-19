import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ArrowLeft, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/currencyUtils";

const InvoiceReconciliationReportPage = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoice-reconciliation-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          vendor:vendor_id (id, company_name),
          purchase_orders:purchase_order_id (id, po_number, final_amount)
        `)
        .not("purchase_order_id", "is", null);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate reconciliation status for each invoice
  const reconciliationData = invoices.map((invoice: any) => {
    const poAmount = invoice.purchase_orders?.final_amount || 0;
    const invoiceAmount = invoice.total_amount || 0;
    const variance = invoiceAmount - poAmount;
    const variancePercent = poAmount > 0 ? (variance / poAmount) * 100 : 0;
    
    let status = "matched";
    if (Math.abs(variancePercent) > 5) {
      status = variance > 0 ? "over" : "under";
    } else if (Math.abs(variancePercent) > 0) {
      status = "within_tolerance";
    }

    return {
      ...invoice,
      poAmount,
      variance,
      variancePercent,
      reconciliationStatus: status,
    };
  });

  const filteredData = reconciliationData.filter((item) => {
    if (statusFilter === "all") return true;
    return item.reconciliationStatus === statusFilter;
  });

  const stats = {
    total: reconciliationData.length,
    matched: reconciliationData.filter((i) => i.reconciliationStatus === "matched").length,
    withinTolerance: reconciliationData.filter((i) => i.reconciliationStatus === "within_tolerance").length,
    over: reconciliationData.filter((i) => i.reconciliationStatus === "over").length,
    under: reconciliationData.filter((i) => i.reconciliationStatus === "under").length,
  };

  const totalVariance = reconciliationData.reduce((sum, item) => sum + item.variance, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "matched":
        return <Badge className="bg-green-500">Matched</Badge>;
      case "within_tolerance":
        return <Badge className="bg-blue-500">Within Tolerance</Badge>;
      case "over":
        return <Badge variant="destructive">Over PO</Badge>;
      case "under":
        return <Badge className="bg-orange-500">Under PO</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="PO-Invoice Reconciliation"
          description="Match invoices against purchase orders and identify discrepancies"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Matched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.matched}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Within Tolerance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.withinTolerance}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Discrepancies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.over + stats.under}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalVariance > 0 ? "text-destructive" : totalVariance < 0 ? "text-orange-500" : ""}`}>
              {formatCurrency(Math.abs(totalVariance))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="matched">Matched</SelectItem>
                <SelectItem value="within_tolerance">Within Tolerance</SelectItem>
                <SelectItem value="over">Over PO</SelectItem>
                <SelectItem value="under">Under PO</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="ml-auto">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>PO #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead className="text-right">PO Amount</TableHead>
                  <TableHead className="text-right">Invoice Amount</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Variance %</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.invoice_number}</TableCell>
                    <TableCell>{item.purchase_orders?.po_number || "-"}</TableCell>
                    <TableCell>{item.vendor?.company_name || "-"}</TableCell>
                    <TableCell>{format(new Date(item.invoice_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.poAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total_amount)}</TableCell>
                    <TableCell className={`text-right font-medium ${item.variance > 0 ? "text-destructive" : item.variance < 0 ? "text-orange-500" : ""}`}>
                      {item.variance >= 0 ? "+" : ""}{formatCurrency(item.variance)}
                    </TableCell>
                    <TableCell className={`text-right ${Math.abs(item.variancePercent) > 5 ? "text-destructive" : ""}`}>
                      {item.variancePercent >= 0 ? "+" : ""}{item.variancePercent.toFixed(1)}%
                    </TableCell>
                    <TableCell>{getStatusBadge(item.reconciliationStatus)}</TableCell>
                  </TableRow>
                ))}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No invoices found for reconciliation
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

export default InvoiceReconciliationReportPage;
