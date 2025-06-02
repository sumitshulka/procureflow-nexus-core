
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
import { Download, Filter, Calendar } from "lucide-react";
import { format } from "date-fns";

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

  // Fetch report data based on filters
  const { data: reportData = [], isLoading: isLoadingReport, refetch } = useQuery({
    queryKey: ["inventory_valuation_report", filters],
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

      const { data, error } = await query.order("product.name");

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch inventory valuation data",
          variant: "destructive",
        });
        throw error;
      }

      // Transform and filter data
      let transformedData = data
        .filter((item: any) => item.product && item.warehouse)
        .map((item: any) => ({
          id: item.id,
          product_name: item.product.name,
          category_name: item.product.category?.name || "Uncategorized",
          classification_name: item.product.classification?.name || "Unclassified",
          warehouse_name: item.warehouse.name,
          quantity: item.quantity,
          current_price: item.product.current_price || 0,
          total_value: item.quantity * (item.product.current_price || 0),
          unit_abbreviation: item.product.unit?.abbreviation || "",
          last_updated: item.last_updated,
        }));

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

      return transformedData as ValuationReportData[];
    },
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

  const exportToPDF = async () => {
    try {
      // Create a simple HTML table for PDF export
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Inventory Valuation Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .header { text-align: center; margin-bottom: 20px; }
            .summary { margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; }
            .total { font-weight: bold; background-color: #e8f4f8; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Inventory Valuation Report</h2>
            <p>Generated on: ${format(new Date(), "PPP")}</p>
          </div>
          <div class="summary">
            <p><strong>Total Items:</strong> ${reportData.length}</p>
            <p><strong>Total Value:</strong> $${reportData.reduce((sum, item) => sum + item.total_value, 0).toLocaleString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Classification</th>
                <th>Warehouse</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Value</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map(item => `
                <tr>
                  <td>${item.product_name}</td>
                  <td>${item.category_name}</td>
                  <td>${item.classification_name}</td>
                  <td>${item.warehouse_name}</td>
                  <td>${item.quantity} ${item.unit_abbreviation}</td>
                  <td>$${item.current_price.toLocaleString()}</td>
                  <td>$${item.total_value.toLocaleString()}</td>
                  <td>${format(new Date(item.last_updated), "PPP")}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      // Create a blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-valuation-report-${format(new Date(), "yyyy-MM-dd")}.html`;
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

  const totalValue = reportData.reduce((sum, item) => sum + item.total_value, 0);

  return (
    <div className="page-container">
      <PageHeader
        title="Inventory Valuation Report"
        description="Generate detailed inventory valuation reports with filtering and export capabilities"
        actions={
          <Button onClick={exportToPDF} disabled={reportData.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        }
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
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Inventory Valuation Summary</CardTitle>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  Total Value: ${totalValue.toLocaleString()}
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
                            ${item.current_price.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${item.total_value.toLocaleString()}
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
