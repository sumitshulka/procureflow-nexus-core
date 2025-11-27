
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
import { Download, Filter } from "lucide-react";
import { format } from "date-fns";
import ColumnSelectionDialog, { ColumnOption } from "@/components/inventory/ColumnSelectionDialog";
import { exportInventoryReportToPDF } from "@/utils/pdfExport";

interface ValuationReportData {
  id: string;
  product_name: string;
  category_name: string;
  classification_name: string;
  warehouse_name: string;
  quantity: number;
  current_price: number;
  total_value: number;
  unit_abbreviation: string;
  last_updated: string;
}

interface FilterState {
  startDate: string;
  endDate: string;
  classificationId: string;
  categoryId: string;
  productName: string;
}

const InventoryValuationReport = () => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterState>({
    startDate: "",
    endDate: "",
    classificationId: "all",
    categoryId: "all",
    productName: "",
  });

  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { id: "product_name", label: "Product Name", selected: true },
    { id: "category_name", label: "Category", selected: true },
    { id: "classification_name", label: "Classification", selected: true },
    { id: "warehouse_name", label: "Warehouse", selected: true },
    { id: "quantity", label: "Quantity", selected: true },
    { id: "current_price", label: "Unit Price", selected: true },
    { id: "total_value", label: "Total Value", selected: true },
    { id: "last_updated", label: "Last Updated", selected: true },
  ]);

  // Fetch organization settings to get base currency and valuation method
  const { data: organizationSettings } = useQuery({
    queryKey: ["organization_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("base_currency, inventory_valuation_method, organization_name")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching organization settings:", error);
        return { base_currency: "USD", inventory_valuation_method: "weighted_average", organization_name: "Organization" }; // fallback
      }

      return data;
    },
  });

  const baseCurrency = organizationSettings?.base_currency || "USD";
  const valuationMethod = organizationSettings?.inventory_valuation_method || "weighted_average";

  // Fetch report data based on filters
  const { data: reportData = [], isLoading: isLoadingReport, refetch } = useQuery({
    queryKey: ["inventory_valuation_report", filters, valuationMethod],
    queryFn: async () => {
      let query = supabase
        .from("inventory_items")
        .select(`
          id,
          quantity,
          last_updated,
          product:product_id(
            id,
            name,
            current_price,
            category:category_id(name),
            classification:classification_id(name),
            unit:unit_id(abbreviation)
          ),
          warehouse:warehouse_id(name)
        `)
        .gt("quantity", 0)
        .not("product.current_price", "is", null);

      // Apply date filters
      if (filters.startDate) {
        query = query.gte("last_updated", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("last_updated", filters.endDate + "T23:59:59");
      }

      const { data, error } = await query;

      if (error) {
        console.error("Database query error:", error);
        toast({
          title: "Error",
          description: "Failed to fetch inventory valuation data",
          variant: "destructive",
        });
        throw error;
      }

      // Get unique product IDs
      const productIds = [...new Set(data.map((item: any) => item.product?.id).filter(Boolean))];

      // Fetch price history for all products
      const { data: priceHistory, error: priceError } = await supabase
        .from("product_price_history")
        .select("product_id, price, effective_date, currency")
        .in("product_id", productIds)
        .order("effective_date", { ascending: true });

      if (priceError) {
        console.error("Error fetching price history:", priceError);
      }

      // Calculate unit price based on valuation method
      const calculateUnitPrice = (productId: string, currentPrice: number): number => {
        if (!priceHistory || priceHistory.length === 0) {
          return currentPrice;
        }

        const productPrices = priceHistory.filter((ph: any) => ph.product_id === productId);
        
        if (productPrices.length === 0) {
          return currentPrice;
        }

        switch (valuationMethod) {
          case "fifo":
            // Use the first (oldest) purchase price
            return productPrices[0].price;
          
          case "lifo":
            // Use the last (most recent) purchase price
            return productPrices[productPrices.length - 1].price;
          
          case "weighted_average":
            // Calculate weighted average (simple average for now)
            const total = productPrices.reduce((sum: number, ph: any) => sum + ph.price, 0);
            return total / productPrices.length;
          
          default:
            return currentPrice;
        }
      };

      // Transform and filter data
      let transformedData = data
        .filter((item: any) => item.product && item.warehouse)
        .map((item: any) => {
          const unitPrice = calculateUnitPrice(item.product.id, item.product.current_price || 0);
          return {
            id: item.id,
            product_name: item.product.name,
            category_name: item.product.category?.name || "Uncategorized",
            classification_name: item.product.classification?.name || "Unclassified",
            warehouse_name: item.warehouse.name,
            quantity: item.quantity,
            current_price: unitPrice,
            total_value: item.quantity * unitPrice,
            unit_abbreviation: item.product.unit?.abbreviation || "",
            last_updated: item.last_updated,
          };
        });

      // Apply additional filters
      if (filters.productName) {
        transformedData = transformedData.filter((item: ValuationReportData) =>
          item.product_name.toLowerCase().includes(filters.productName.toLowerCase())
        );
      }

      if (filters.classificationId && filters.classificationId !== "all") {
        transformedData = transformedData.filter((item: ValuationReportData) =>
          item.classification_name === filters.classificationId
        );
      }

      if (filters.categoryId && filters.categoryId !== "all") {
        transformedData = transformedData.filter((item: ValuationReportData) =>
          item.category_name === filters.categoryId
        );
      }

      // Sort by product name
      transformedData.sort((a, b) => a.product_name.localeCompare(b.product_name));

      return transformedData as ValuationReportData[];
    },
    enabled: !!valuationMethod,
  });

  // Fetch classifications for filter
  const { data: classifications = [] } = useQuery({
    queryKey: ["product_classifications_for_filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_classifications")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ["categories_for_filter"],
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

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      classificationId: "all",
      categoryId: "all",
      productName: "",
    });
  };

  const applyFilters = () => {
    refetch();
  };

  const handleColumnToggle = (columnId: string) => {
    setColumnOptions((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, selected: !col.selected } : col
      )
    );
  };

  const handleSelectAll = () => {
    setColumnOptions((prev) => prev.map((col) => ({ ...col, selected: true })));
  };

  const handleDeselectAll = () => {
    setColumnOptions((prev) => prev.map((col) => ({ ...col, selected: false })));
  };

  const openExportDialog = () => {
    setShowColumnDialog(true);
  };

  const exportToPDF = () => {
    try {
      const selectedColumns = columnOptions.filter((col) => col.selected);
      
      if (selectedColumns.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one column to export",
          variant: "destructive",
        });
        return;
      }

      // Prepare data for export
      const exportData = reportData.map((item) => {
        const row: any = {};
        selectedColumns.forEach((col) => {
          if (col.id === "quantity") {
            row[col.id] = `${item.quantity} ${item.unit_abbreviation}`;
          } else if (col.id === "current_price") {
            row[col.id] = `${baseCurrency} ${item.current_price.toLocaleString()}`;
          } else if (col.id === "total_value") {
            row[col.id] = `${baseCurrency} ${item.total_value.toLocaleString()}`;
          } else if (col.id === "last_updated") {
            row[col.id] = format(new Date(item.last_updated), "PPP");
          } else {
            row[col.id] = item[col.id as keyof ValuationReportData];
          }
        });
        return row;
      });

      // Prepare columns for PDF
      const pdfColumns = selectedColumns.map((col) => ({
        header: col.label,
        dataKey: col.id,
      }));

      const valuationMethodLabel =
        valuationMethod === "fifo"
          ? "FIFO (First In, First Out)"
          : valuationMethod === "lifo"
          ? "LIFO (Last In, First Out)"
          : "Weighted Average";

      exportInventoryReportToPDF({
        title: "Inventory Valuation Report",
        data: exportData,
        columns: pdfColumns,
        organizationName: organizationSettings?.organization_name || "Organization",
        baseCurrency,
        valuationMethod: valuationMethodLabel,
        totalValue,
      });

      setShowColumnDialog(false);
      toast({
        title: "Success",
        description: "Report exported successfully as PDF",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      });
    }
  };

  const totalValue = reportData.reduce((sum, item) => sum + item.total_value, 0);

  return (
    <div className="page-container">
      <PageHeader
        title="Inventory Valuation Report"
        description={`Generate detailed inventory valuation reports using ${
          valuationMethod === "fifo" 
            ? "FIFO (First In, First Out)" 
            : valuationMethod === "lifo" 
            ? "LIFO (Last In, First Out)" 
            : "Weighted Average"
        } method`}
        actions={
          <Button onClick={openExportDialog} disabled={reportData.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        }
      />

      <ColumnSelectionDialog
        open={showColumnDialog}
        onOpenChange={setShowColumnDialog}
        columns={columnOptions}
        onColumnToggle={handleColumnToggle}
        onExport={exportToPDF}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
      />

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
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="classification">Classification</Label>
                <Select
                  value={filters.classificationId}
                  onValueChange={(value) => handleFilterChange("classificationId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Classifications" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classifications</SelectItem>
                    {classifications.map((classification) => (
                      <SelectItem key={classification.id} value={classification.name}>
                        {classification.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
        <div className="lg:col-span-3 space-y-4">
          {/* Valuation Method Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    Valuation Method in Use
                  </div>
                  <div className="text-xl font-semibold">
                    {valuationMethod === "fifo" 
                      ? "FIFO (First In, First Out)" 
                      : valuationMethod === "lifo" 
                      ? "LIFO (Last In, First Out)" 
                      : "Weighted Average"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {valuationMethod === "fifo" 
                      ? "Using the first purchase price for inventory valuation" 
                      : valuationMethod === "lifo" 
                      ? "Using the latest purchase price for inventory valuation" 
                      : "Using weighted average of all purchase prices for valuation"}
                  </div>
                </div>
                <Badge variant="secondary" className="text-base px-4 py-2">
                  {valuationMethod.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Inventory Valuation Summary</CardTitle>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  Total Value: {baseCurrency} {totalValue.toLocaleString()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingReport ? (
                <div className="flex justify-center py-8">Loading report data...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Classification</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                        <TableHead>Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>{item.category_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.classification_name}</Badge>
                          </TableCell>
                          <TableCell>{item.warehouse_name}</TableCell>
                          <TableCell className="text-right">
                            {item.quantity} {item.unit_abbreviation}
                          </TableCell>
                          <TableCell className="text-right">
                            {baseCurrency} {item.current_price.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {baseCurrency} {item.total_value.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {format(new Date(item.last_updated), "PPP")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {reportData.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No inventory data found matching the selected filters.
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

export default InventoryValuationReport;
