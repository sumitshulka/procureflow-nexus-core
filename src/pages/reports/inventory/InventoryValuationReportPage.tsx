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
import { ArrowLeft, Download, Filter, Search, DollarSign, Package, TrendingUp, BarChart3 } from "lucide-react";
import { exportInventoryReportToPDF } from "@/utils/pdfExport";

interface ValuationData {
  id: string;
  product_name: string;
  sku: string;
  category: string;
  warehouse: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  last_updated: string;
}

const InventoryValuationReportPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");

  // Fetch organization settings
  const { data: orgSettings } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch inventory data with product and warehouse info
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ["inventory-valuation-report"],
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

  // Fetch categories and warehouses for filters
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouses").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Transform and filter data
  const transformedData: ValuationData[] = useMemo(() => {
    if (!inventoryData) return [];

    return inventoryData.map((item: any) => ({
      id: item.id,
      product_name: item.products?.name || "Unknown",
      sku: item.products?.sku || "-",
      category: item.products?.categories?.name || "Uncategorized",
      warehouse: item.warehouses?.name || "Unknown",
      quantity: item.quantity,
      unit_price: item.products?.unit_price || 0,
      total_value: (item.quantity || 0) * (item.products?.unit_price || 0),
      last_updated: item.last_updated,
    }));
  }, [inventoryData]);

  const filteredData = useMemo(() => {
    return transformedData.filter((item) => {
      const matchesSearch =
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesWarehouse = selectedWarehouse === "all" || item.warehouse === selectedWarehouse;
      return matchesSearch && matchesCategory && matchesWarehouse;
    });
  }, [transformedData, searchTerm, selectedCategory, selectedWarehouse]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalItems = filteredData.length;
    const totalQuantity = filteredData.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = filteredData.reduce((sum, item) => sum + item.total_value, 0);
    const avgValue = totalItems > 0 ? totalValue / totalItems : 0;
    return { totalItems, totalQuantity, totalValue, avgValue };
  }, [filteredData]);

  const baseCurrency = orgSettings?.base_currency || "USD";
  const valuationMethod = orgSettings?.inventory_valuation_method || "Weighted Average";

  const handleExportPDF = () => {
    exportInventoryReportToPDF({
      title: "Inventory Valuation Report",
      data: filteredData.map((item) => ({
        product_name: item.product_name,
        sku: item.sku,
        category: item.category,
        warehouse: item.warehouse,
        quantity: item.quantity.toString(),
        unit_price: `${baseCurrency} ${item.unit_price.toLocaleString()}`,
        total_value: `${baseCurrency} ${item.total_value.toLocaleString()}`,
      })),
      columns: [
        { header: "Product", dataKey: "product_name" },
        { header: "SKU", dataKey: "sku" },
        { header: "Category", dataKey: "category" },
        { header: "Warehouse", dataKey: "warehouse" },
        { header: "Qty", dataKey: "quantity" },
        { header: "Unit Price", dataKey: "unit_price" },
        { header: "Total Value", dataKey: "total_value" },
      ],
      organizationName: orgSettings?.organization_name || "Organization",
      baseCurrency,
      valuationMethod,
      totalValue: summaryStats.totalValue,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title="Inventory Valuation Report"
          description={`Complete valuation using ${valuationMethod} method`}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Unique products in stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Units across all warehouses</p>
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
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Value/Item</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {baseCurrency} {summaryStats.avgValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Average per product</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
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
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses?.map((wh) => (
                  <SelectItem key={wh.id} value={wh.name}>
                    {wh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Valuation Details</CardTitle>
            <Badge variant="secondary">
              Valuation Method: {valuationMethod}
            </Badge>
          </div>
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
                  <TableHead>Category</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell>{item.warehouse}</TableCell>
                    <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {baseCurrency} {item.unit_price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {baseCurrency} {item.total_value.toLocaleString()}
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

export default InventoryValuationReportPage;
