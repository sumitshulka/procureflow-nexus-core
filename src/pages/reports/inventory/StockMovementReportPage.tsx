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
import { ArrowLeft, Download, Search, ArrowUpCircle, ArrowDownCircle, RefreshCw, Truck } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";

const StockMovementReportPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
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

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ["stock-movement-report", startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("inventory_transactions")
        .select(`
          id,
          type,
          quantity,
          unit_price,
          currency,
          transaction_date,
          notes,
          reference,
          products:product_id (name, sku),
          source_warehouse:source_warehouse_id (name),
          target_warehouse:target_warehouse_id (name)
        `)
        .order("transaction_date", { ascending: false });

      if (startDate) {
        query = query.gte("transaction_date", startDate.toISOString());
      }
      if (endDate) {
        query = query.lte("transaction_date", endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredData = useMemo(() => {
    if (!transactionsData) return [];

    return transactionsData.filter((item: any) => {
      const matchesSearch =
        item.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.products?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reference?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === "all" || item.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [transactionsData, searchTerm, selectedType]);

  const summaryStats = useMemo(() => {
    if (!filteredData.length) return { checkIn: 0, checkOut: 0, transfer: 0, totalValue: 0 };

    const checkIn = filteredData.filter((t: any) => t.type === "check_in").reduce((s, t: any) => s + (t.quantity || 0), 0);
    const checkOut = filteredData.filter((t: any) => t.type === "check_out").reduce((s, t: any) => s + (t.quantity || 0), 0);
    const transfer = filteredData.filter((t: any) => t.type === "transfer").reduce((s, t: any) => s + (t.quantity || 0), 0);
    const totalValue = filteredData.reduce((s, t: any) => s + ((t.quantity || 0) * (t.unit_price || 0)), 0);

    return { checkIn, checkOut, transfer, totalValue };
  }, [filteredData]);

  const baseCurrency = orgSettings?.base_currency || "USD";

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "check_in":
        return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
      case "check_out":
        return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
      case "transfer":
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return <Truck className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "check_in":
        return <Badge variant="default" className="bg-green-500">Check In</Badge>;
      case "check_out":
        return <Badge variant="destructive">Check Out</Badge>;
      case "transfer":
        return <Badge variant="secondary">Transfer</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Type", "Product", "SKU", "Quantity", "Unit Price", "Value", "From", "To", "Reference", "Notes"];
    const rows = filteredData.map((t: any) => [
      t.transaction_date ? format(parseISO(t.transaction_date), "yyyy-MM-dd HH:mm") : "-",
      t.type,
      t.products?.name || "-",
      t.products?.sku || "-",
      t.quantity,
      t.unit_price || 0,
      (t.quantity || 0) * (t.unit_price || 0),
      t.source_warehouse?.name || "-",
      t.target_warehouse?.name || "-",
      t.reference || "-",
      t.notes || "-",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-movement-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title="Stock Movement Report"
          description="Track all inventory movements including check-ins, check-outs, and transfers"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Check-Ins</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.checkIn.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Units received</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Check-Outs</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.checkOut.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Units dispatched</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.transfer.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Units transferred</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {baseCurrency} {summaryStats.totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All movements</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product, SKU, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <DatePicker date={startDate} setDate={setStartDate} />
            <DatePicker date={endDate} setDate={setEndDate} />
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="check_in">Check In</SelectItem>
                <SelectItem value="check_out">Check Out</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Movement Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No movements found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      {t.transaction_date ? format(parseISO(t.transaction_date), "MMM dd, yyyy HH:mm") : "-"}
                    </TableCell>
                    <TableCell>{getTypeBadge(t.type)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{t.products?.name || "-"}</div>
                      <div className="text-xs text-muted-foreground">{t.products?.sku || ""}</div>
                    </TableCell>
                    <TableCell className="text-right">{t.quantity?.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {baseCurrency} {((t.quantity || 0) * (t.unit_price || 0)).toLocaleString()}
                    </TableCell>
                    <TableCell>{t.source_warehouse?.name || "-"}</TableCell>
                    <TableCell>{t.target_warehouse?.name || "-"}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{t.reference || "-"}</TableCell>
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

export default StockMovementReportPage;
