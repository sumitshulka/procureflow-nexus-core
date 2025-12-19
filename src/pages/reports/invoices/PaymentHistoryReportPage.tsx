import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Download, ArrowLeft, DollarSign, CreditCard, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { formatCurrency } from "@/utils/currencyUtils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

const PaymentHistoryReportPage = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(subMonths(new Date(), 12)));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["payment-history-report", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          vendor:vendor_id (id, company_name)
        `)
        .eq("status", "paid")
        .gte("payment_date", format(startDate, "yyyy-MM-dd"))
        .lte("payment_date", format(endDate, "yyyy-MM-dd"))
        .order("payment_date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Monthly payment trend
  const monthlyPayments = invoices.reduce((acc: any, inv: any) => {
    if (inv.payment_date) {
      const month = format(new Date(inv.payment_date), "MMM yyyy");
      if (!acc[month]) acc[month] = { amount: 0, count: 0 };
      acc[month].amount += inv.total_amount || 0;
      acc[month].count++;
    }
    return acc;
  }, {});

  const trendData = Object.entries(monthlyPayments)
    .map(([month, data]: [string, any]) => ({
      month,
      amount: data.amount,
      count: data.count,
    }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // Payment method breakdown
  const paymentMethods = invoices.reduce((acc: any, inv: any) => {
    const method = inv.payment_method || "Unknown";
    if (!acc[method]) acc[method] = 0;
    acc[method] += inv.total_amount || 0;
    return acc;
  }, {});

  const methodData = Object.entries(paymentMethods).map(([name, value]) => ({
    name,
    value: value as number,
  }));

  const totalPaid = invoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);
  const avgPaymentAmount = invoices.length > 0 ? totalPaid / invoices.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Payment History Report"
          description="Track payment history and trends over time"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payment Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgPaymentAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(paymentMethods).length}</div>
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
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Payment Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value: any, name) => [
                    name === "amount" ? formatCurrency(value) : value,
                    name === "amount" ? "Amount" : "Count"
                  ]} />
                  <Line type="monotone" dataKey="amount" stroke="#0088FE" strokeWidth={2} name="amount" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methodData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#00C49F" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice: any) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.vendor?.company_name || "-"}</TableCell>
                    <TableCell>{format(new Date(invoice.invoice_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      {invoice.payment_date 
                        ? format(new Date(invoice.payment_date), "MMM dd, yyyy")
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{invoice.payment_method || "N/A"}</Badge>
                    </TableCell>
                    <TableCell>{invoice.payment_reference || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.total_amount)}
                    </TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No payment records found
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

export default PaymentHistoryReportPage;
