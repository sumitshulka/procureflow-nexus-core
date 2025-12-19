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
import { ArrowLeft, Download, Search, Clock, AlertTriangle, Package, TrendingDown } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

interface AgingData {
  id: string;
  product_name: string;
  sku: string;
  category: string;
  warehouse: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  last_updated: string;
  days_in_stock: number;
  aging_category: string;
}

const getAgingCategory = (days: number): string => {
  if (days <= 30) return "Current (0-30 days)";
  if (days <= 60) return "Aging (31-60 days)";
  if (days <= 90) return "Slow Moving (61-90 days)";
  if (days <= 180) return "Stagnant (91-180 days)";
  return "Obsolete (180+ days)";
};

const getAgingBadgeVariant = (category: string): "default" | "secondary" | "destructive" | "outline" => {
  if (category.includes("Current")) return "default";
  if (category.includes("Aging")) return "secondary";
  if (category.includes("Slow")) return "outline";
  return "destructive";
};

const StockAgingReportPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAging, setSelectedAging] = useState<string>("all");

  const { data: orgSettings } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organization_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ["stock-aging-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(`
          id,
          quantity,
          last_updated,
          products:product_id (
            id,
            name,
            sku,
            unit_price,
            categories:category_id (name)
          ),
          warehouses:warehouse_id (name)
        `)
        .gt("quantity", 0);

      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const transformedData: AgingData[] = useMemo(() => {
    if (!inventoryData) return [];

    return inventoryData.map((item: any) => {
      const daysInStock = item.last_updated
        ? differenceInDays(new Date(), parseISO(item.last_updated))
        : 0;
      
      return {
        id: item.id,
        product_name: item.products?.name || "Unknown",
        sku: item.products?.sku || "-",
        category: item.products?.categories?.name || "Uncategorized",
        warehouse: item.warehouses?.name || "Unknown",
        quantity: item.quantity,
        unit_price: item.products?.unit_price || 0,
        total_value: (item.quantity || 0) * (item.products?.unit_price || 0),
        last_updated: item.last_updated,
        days_in_stock: daysInStock,
        aging_category: getAgingCategory(daysInStock),
      };
    });
  }, [inventoryData]);

  const filteredData = useMemo(() => {
    return transformedData.filter((item) => {
      const matchesSearch =
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesAging = selectedAging === "all" || item.aging_category.includes(selectedAging);
      return matchesSearch && matchesCategory && matchesAging;
    });
  }, [transformedData, searchTerm, selectedCategory, selectedAging]);

  const summaryStats = useMemo(() => {
    const current = filteredData.filter((i) => i.aging_category.includes("Current"));
    const aging = filteredData.filter((i) => i.aging_category.includes("Aging"));
    const slow = filteredData.filter((i) => i.aging_category.includes("Slow"));
    const stagnant = filteredData.filter((i) => i.aging_category.includes("Stagnant") || i.aging_category.includes("Obsolete"));

    return {
      current: { count: current.length, value: current.reduce((s, i) => s + i.total_value, 0) },
      aging: { count: aging.length, value: aging.reduce((s, i) => s + i.total_value, 0) },
      slow: { count: slow.length, value: slow.reduce((s, i) => s + i.total_value, 0) },
      stagnant: { count: stagnant.length, value: stagnant.reduce((s, i) => s + i.total_value, 0) },
    };
  }, [filteredData]);

  const baseCurrency = orgSettings?.base_currency || "USD";

  const handleExportCSV = () => {
    const headers = ["Product", "SKU", "Category", "Warehouse", "Quantity", "Unit Price", "Total Value", "Days in Stock", "Aging Category"];
    const rows = filteredData.map((item) => [
      item.product_name,
      item.sku,
      item.category,
      item.warehouse,
      item.quantity,
      item.unit_price,
      item.total_value,
      item.days_in_stock,
      item.aging_category,
    ]);
    
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-aging-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title="Stock Aging Report"
          description="Analyze inventory aging to identify slow-moving and obsolete stock"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.current.count}</div>
            <p className="text-xs text-muted-foreground">
              Value: {baseCurrency} {summaryStats.current.value.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aging Stock</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.aging.count}</div>
            <p className="text-xs text-muted-foreground">
              Value: {baseCurrency} {summaryStats.aging.value.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Slow Moving</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.slow.count}</div>
            <p className="text-xs text-muted-foreground">
              Value: {baseCurrency} {summaryStats.slow.value.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stagnant/Obsolete</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.stagnant.count}</div>
            <p className="text-xs text-muted-foreground">
              Value: {baseCurrency} {summaryStats.stagnant.value.toLocaleString()}
            </p>
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
                  placeholder="Search by product name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedAging} onValueChange={setSelectedAging}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Aging Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Aging</SelectItem>
                <SelectItem value="Current">Current (0-30 days)</SelectItem>
                <SelectItem value="Aging">Aging (31-60 days)</SelectItem>
                <SelectItem value="Slow">Slow Moving (61-90 days)</SelectItem>
                <SelectItem value="Stagnant">Stagnant (91-180 days)</SelectItem>
                <SelectItem value="Obsolete">Obsolete (180+ days)</SelectItem>
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
          <CardTitle>Aging Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No data found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Days in Stock</TableHead>
                  <TableHead>Aging Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{item.warehouse}</TableCell>
                    <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {baseCurrency} {item.total_value.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{item.days_in_stock}</TableCell>
                    <TableCell>
                      <Badge variant={getAgingBadgeVariant(item.aging_category)}>
                        {item.aging_category}
                      </Badge>
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

export default StockAgingReportPage;
