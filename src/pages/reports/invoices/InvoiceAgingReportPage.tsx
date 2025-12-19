import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Clock, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { formatCurrency } from "@/utils/currencyUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const InvoiceAgingReportPage = () => {
  const navigate = useNavigate();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoice-aging-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          vendor:vendor_id (id, company_name)
        `)
        .in("status", ["pending", "approved", "disputed"]);
      
      if (error) throw error;
      return data || [];
    },
  });

  const getAgeBucket = (invoiceDate: string, dueDate: string | null) => {
    const baseDate = dueDate || invoiceDate;
    const days = differenceInDays(new Date(), new Date(baseDate));
    if (days <= 30) return "Current";
    if (days <= 60) return "31-60 days";
    if (days <= 90) return "61-90 days";
    return "90+ days";
  };

  const ageBuckets = {
    "Current": { count: 0, value: 0, color: "#22c55e" },
    "31-60 days": { count: 0, value: 0, color: "#eab308" },
    "61-90 days": { count: 0, value: 0, color: "#f97316" },
    "90+ days": { count: 0, value: 0, color: "#ef4444" },
  };

  invoices.forEach((invoice: any) => {
    const bucket = getAgeBucket(invoice.invoice_date, invoice.due_date);
    ageBuckets[bucket as keyof typeof ageBuckets].count++;
    ageBuckets[bucket as keyof typeof ageBuckets].value += invoice.total_amount || 0;
  });

  const chartData = Object.entries(ageBuckets).map(([name, data]) => ({
    name,
    count: data.count,
    value: data.value,
    color: data.color,
  }));

  const totalOutstanding = invoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);
  const overdueAmount = ageBuckets["31-60 days"].value + ageBuckets["61-90 days"].value + ageBuckets["90+ days"].value;

  const getAgeBadge = (bucket: string) => {
    switch (bucket) {
      case "Current":
        return <Badge className="bg-green-500">Current</Badge>;
      case "31-60 days":
        return <Badge className="bg-yellow-500">31-60 days</Badge>;
      case "61-90 days":
        return <Badge className="bg-orange-500">61-90 days</Badge>;
      default:
        return <Badge variant="destructive">90+ days</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Invoice Aging Report"
          description="Analyze unpaid invoices by age buckets (30/60/90+ days)"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">{invoices.length} invoices</p>
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
              <div className="text-2xl font-bold" style={{ color: data.color }}>
                {formatCurrency(data.value)}
              </div>
              <p className="text-xs text-muted-foreground">{data.count} invoices</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overdue Alert */}
      {overdueAmount > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">Overdue Invoices Alert</h3>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(overdueAmount)} in invoices are past due date. Immediate attention required.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
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
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Days Outstanding</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Age Bucket</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice: any) => {
                  const daysOutstanding = differenceInDays(
                    new Date(), 
                    new Date(invoice.due_date || invoice.invoice_date)
                  );
                  const bucket = getAgeBucket(invoice.invoice_date, invoice.due_date);
                  
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.vendor?.company_name || "-"}</TableCell>
                      <TableCell>{format(new Date(invoice.invoice_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        {invoice.due_date 
                          ? format(new Date(invoice.due_date), "MMM dd, yyyy")
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="text-right">{daysOutstanding}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell>{getAgeBadge(bucket)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{invoice.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No outstanding invoices found
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

export default InvoiceAgingReportPage;
