
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Filter, AlertTriangle, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface StockAgingData {
  id: string;
  product_name: string;
  category_name: string;
  warehouse_name: string;
  quantity: number;
  current_price: number;
  total_value: number;
  last_updated: string;
  days_since_last_update: number;
  aging_category: string;
  unit_abbreviation: string;
}

interface AgingFilterState {
  categoryId: string;
  warehouseId: string;
  agingCategory: string;
  productName: string;
}

const StockAgingReport = () => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<AgingFilterState>({
    categoryId: "all",
    warehouseId: "all",
    agingCategory: "all",
    productName: "",
  });

  // Calculate aging category based on days
  const getAgingCategory = (days: number) => {
    if (days <= 30) return "Fresh";
    if (days <= 90) return "Normal";
    if (days <= 180) return "Slow Moving";
    return "Stagnant";
  };

  const getAgingBadgeVariant = (category: string) => {
    switch (category) {
      case "Fresh":
        return "default";
      case "Normal":
        return "secondary";
      case "Slow Moving":
        return "outline";
      case "Stagnant":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Fetch stock aging data
  const { data: agingData = [], isLoading: isLoadingAging, refetch } = useQuery({
    queryKey: ["stock_aging_report", filters],
    queryFn: async () => {
      let query = supabase
        .from("inventory_items")
        .select(`
          id,
          quantity,
          last_updated,
          product:product_id(
            name,
            current_price,
            category:category_id(name),
            unit:unit_id(abbreviation)
          ),
          warehouse:warehouse_id(name)
        `)
        .gt("quantity", 0);

      const { data, error } = await query;

      if (error) {
        console.error("Database query error:", error);
        toast({
          title: "Error",
          description: "Failed to fetch stock aging data",
          variant: "destructive",
        });
        throw error;
      }

      // Transform and calculate aging
      let transformedData = data
        .filter((item: any) => item.product && item.warehouse)
        .map((item: any) => {
          const daysSinceUpdate = differenceInDays(new Date(), new Date(item.last_updated));
          const agingCategory = getAgingCategory(daysSinceUpdate);
          
          return {
            id: item.id,
            product_name: item.product.name,
            category_name: item.product.category?.name || "Uncategorized",
            warehouse_name: item.warehouse.name,
            quantity: item.quantity,
            current_price: item.product.current_price || 0,
            total_value: item.quantity * (item.product.current_price || 0),
            last_updated: item.last_updated,
            days_since_last_update: daysSinceUpdate,
            aging_category: agingCategory,
            unit_abbreviation: item.product.unit?.abbreviation || "",
          };
        });

      // Apply additional filters
      if (filters.productName) {
        transformedData = transformedData.filter((item: StockAgingData) =>
          item.product_name.toLowerCase().includes(filters.productName.toLowerCase())
        );
      }

      if (filters.categoryId && filters.categoryId !== "all") {
        transformedData = transformedData.filter((item: StockAgingData) =>
          item.category_name === filters.categoryId
        );
      }

      if (filters.warehouseId && filters.warehouseId !== "all") {
        transformedData = transformedData.filter((item: StockAgingData) =>
          item.warehouse_name === filters.warehouseId
        );
      }

      if (filters.agingCategory && filters.agingCategory !== "all") {
        transformedData = transformedData.filter((item: StockAgingData) =>
          item.aging_category === filters.agingCategory
        );
      }

      // Sort by days since last update (oldest first)
      transformedData.sort((a, b) => b.days_since_last_update - a.days_since_last_update);

      return transformedData as StockAgingData[];
    },
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ["categories_for_aging_filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch warehouses for filter
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses_for_aging_filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const handleFilterChange = (key: keyof AgingFilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      categoryId: "all",
      warehouseId: "all",
      agingCategory: "all",
      productName: "",
    });
  };

  const applyFilters = () => {
    refetch();
  };

  const exportToCSV = () => {
    try {
      const headers = ["Product", "Category", "Warehouse", "Quantity", "Unit Price", "Total Value", "Days Since Update", "Aging Category", "Last Updated"];
      const csvContent = [
        headers.join(","),
        ...agingData.map(item => [
          `"${item.product_name}"`,
          `"${item.category_name}"`,
          `"${item.warehouse_name}"`,
          item.quantity,
          item.current_price,
          item.total_value,
          item.days_since_last_update,
          `"${item.aging_category}"`,
          format(new Date(item.last_updated), "yyyy-MM-dd")
        ].join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `stock-aging-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Report exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      });
    }
  };

  // Calculate summary statistics
  const totalItems = agingData.length;
  const stagnantItems = agingData.filter(item => item.aging_category === "Stagnant").length;
  const slowMovingItems = agingData.filter(item => item.aging_category === "Slow Moving").length;
  const totalValue = agingData.reduce((sum, item) => sum + item.total_value, 0);

  return (
    <div className="page-container">
      <PageHeader
        title="Stock Aging Report"
        description="Analyze inventory aging and identify slow-moving items"
        actions={
          <Button onClick={exportToCSV} disabled={agingData.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Slow Moving</p>
                <p className="text-2xl font-bold">{slowMovingItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stagnant</p>
                <p className="text-2xl font-bold">{stagnantItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={filters.categoryId}
                  onValueChange={(value) => handleFilterChange("categoryId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="warehouse">Warehouse</Label>
                <Select
                  value={filters.warehouseId}
                  onValueChange={(value) => handleFilterChange("warehouseId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Warehouses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Warehouses</SelectItem>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.name}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="agingCategory">Aging Category</Label>
                <Select
                  value={filters.agingCategory}
                  onValueChange={(value) => handleFilterChange("agingCategory", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Fresh">Fresh (≤30 days)</SelectItem>
                    <SelectItem value="Normal">Normal (31-90 days)</SelectItem>
                    <SelectItem value="Slow Moving">Slow Moving (91-180 days)</SelectItem>
                    <SelectItem value="Stagnant">Stagnant ({">"}180 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="productName">Product Name</Label>
                <Input
                  id="productName"
                  placeholder="Search products..."
                  value={filters.productName}
                  onChange={(e) => handleFilterChange("productName", e.target.value)}
                />
              </div>

              <div className="space-y-2 pt-4">
                <Button onClick={applyFilters} className="w-full">
                  Apply Filters
                </Button>
                <Button onClick={clearFilters} variant="outline" className="w-full">
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Stock Aging Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAging ? (
                <div className="flex justify-center py-8">Loading aging data...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="text-right">Days Old</TableHead>
                        <TableHead>Aging Category</TableHead>
                        <TableHead>Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agingData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>{item.category_name}</TableCell>
                          <TableCell>{item.warehouse_name}</TableCell>
                          <TableCell className="text-right">
                            {item.quantity} {item.unit_abbreviation}
                          </TableCell>
                          <TableCell className="text-right">
                            ${item.total_value.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {item.days_since_last_update}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getAgingBadgeVariant(item.aging_category)}>
                              {item.aging_category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(item.last_updated), "MMM dd, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {agingData.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No stock aging data found matching the selected filters.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StockAgingReport;
