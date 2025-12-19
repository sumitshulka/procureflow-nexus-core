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
import PageHeader from "@/components/common/PageHeader";
import { DatePicker } from "@/components/ui/date-picker";
import { ArrowLeft, Download, Search, FileText, Clock, CheckCircle, DollarSign, AlertCircle } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6"];

const InvoiceSummaryReportPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));

  const { data: orgSettings } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organization_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ["invoice-summary-report", startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          status,
          total_amount,
          currency,
          invoice_date,
          due_date,
          payment_date,
          created_at,
          vendor:vendor_id (company_name)
        `)
        .order("created_at", { ascending: false });

      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }
      if (endDate) {
        query = query.lte("created_at", endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredData = useMemo(() => {
    if (!invoiceData) return [];

    return invoiceData.filter((inv: any) => {
      const matchesSearch =
        inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.vendor?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === "all" || inv.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [invoiceData, searchTerm, selectedStatus]);

  const summaryStats = useMemo(() => {
    if (!filteredData.length) return { total: 0, pending: 0, paid: 0, overdue: 0, totalValue: 0, unpaidValue: 0 };

    const now = new Date();
    const pending = filteredData.filter((inv: any) => inv.status === "pending" || inv.status === "submitted").length;
    const paid = filteredData.filter((inv: any) => inv.status === "paid").length;
    const overdue = filteredData.filter((inv: any) => {
      if (inv.status === "paid") return false;
      return inv.due_date && new Date(inv.due_date) < now;
    }).length;
    const totalValue = filteredData.reduce((s, inv: any) => s + (inv.total_amount || 0), 0);
    const unpaidValue = filteredData
      .filter((inv: any) => inv.status !== "paid")
      .reduce((s, inv: any) => s + (inv.total_amount || 0), 0);

    return { total: filteredData.length, pending, paid, overdue, totalValue, unpaidValue };
  }, [filteredData]);

  const chartData = useMemo(() => {
    if (!filteredData.length) return [];

    const statusCounts: Record<string, number> = {};
    filteredData.forEach((inv: any) => {
      statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const baseCurrency = orgSettings?.base_currency || "USD";

  const getStatusBadge = (status: string, dueDate?: string) => {
    const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== "paid";
    
    if (isOverdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "pending":
      case "submitted":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-blue-500">Approved</Badge>;
      case "paid":
        return <Badge variant="default" className="bg-green-500">Paid</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDaysUntilDue = (dueDate?: string, status?: string) => {
    if (!dueDate || status === "paid") return null;
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return <span className="text-red-500 font-medium">{Math.abs(days)} days overdue</span>;
    if (days === 0) return <span className="text-yellow-500 font-medium">Due today</span>;
    return <span className="text-muted-foreground">{days} days</span>;
  };

  const handleExportCSV = () => {
    const headers = ["Invoice Number", "Vendor", "Status", "Amount", "Invoice Date", "Due Date", "Payment Date"];
    const rows = filteredData.map((inv: any) => [
      inv.invoice_number,
      inv.vendor?.company_name || "-",
      inv.status,
      inv.total_amount,
      inv.invoice_date ? format(parseISO(inv.invoice_date), "yyyy-MM-dd") : "-",
      inv.due_date ? format(parseISO(inv.due_date), "yyyy-MM-dd") : "-",
      inv.payment_date ? format(parseISO(inv.payment_date), "yyyy-MM-dd") : "-",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-summary-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title="Invoice Summary Report"
          description="Overview of all invoices with status, amounts, and aging analysis"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.paid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{summaryStats.overdue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {baseCurrency} {summaryStats.totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {baseCurrency} {summaryStats.unpaidValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Filters */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
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
                    placeholder="Search by invoice number or vendor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <DatePicker date={startDate} onDateChange={setStartDate} />
              <DatePicker date={endDate} onDateChange={setEndDate} />
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
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
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No invoices found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Until Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((inv: any) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.vendor?.company_name || "-"}</TableCell>
                    <TableCell>{getStatusBadge(inv.status, inv.due_date)}</TableCell>
                    <TableCell className="text-right">
                      {inv.currency || baseCurrency} {inv.total_amount?.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {inv.invoice_date ? format(parseISO(inv.invoice_date), "MMM dd, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      {inv.due_date ? format(parseISO(inv.due_date), "MMM dd, yyyy") : "-"}
                    </TableCell>
                    <TableCell>{getDaysUntilDue(inv.due_date, inv.status)}</TableCell>
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

export default InvoiceSummaryReportPage;
