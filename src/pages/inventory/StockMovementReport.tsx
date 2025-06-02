
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
import { Download, Filter, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

interface StockMovementData {
  id: string;
  transaction_date: string;
  type: string;
  product_name: string;
  warehouse_name: string;
  quantity: number;
  reference: string;
  user_email: string;
  notes: string;
  approval_status: string;
}

interface MovementFilterState {
  startDate: string;
  endDate: string;
  transactionType: string;
  warehouseId: string;
  productName: string;
}

const StockMovementReport = () => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<MovementFilterState>({
    startDate: "",
    endDate: "",
    transactionType: "all",
    warehouseId: "all",
    productName: "",
  });

  // Fetch stock movement data
  const { data: movementData = [], isLoading: isLoadingMovement, refetch } = useQuery({
    queryKey: ["stock_movement_report", filters],
    queryFn: async () => {
      let query = supabase
        .from("inventory_transactions")
        .select(`
          id,
          transaction_date,
          type,
          quantity,
          reference,
          notes,
          approval_status,
          product:product_id(name),
          source_warehouse:source_warehouse_id(name),
          target_warehouse:target_warehouse_id(name),
          user:user_id(email)
        `)
        .order("transaction_date", { ascending: false });

      // Apply date filters
      if (filters.startDate) {
        query = query.gte("transaction_date", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("transaction_date", filters.endDate + "T23:59:59");
      }

      // Apply transaction type filter
      if (filters.transactionType && filters.transactionType !== "all") {
        query = query.eq("type", filters.transactionType);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Database query error:", error);
        toast({
          title: "Error",
          description: "Failed to fetch stock movement data",
          variant: "destructive",
        });
        throw error;
      }

      // Transform data
      let transformedData = data
        .filter((item: any) => item.product)
        .map((item: any) => ({
          id: item.id,
          transaction_date: item.transaction_date,
          type: item.type,
          product_name: item.product.name,
          warehouse_name: item.source_warehouse?.name || item.target_warehouse?.name || "N/A",
          quantity: item.quantity,
          reference: item.reference || "",
          user_email: item.user?.email || "System",
          notes: item.notes || "",
          approval_status: item.approval_status || "N/A",
        }));

      // Apply additional filters
      if (filters.productName) {
        transformedData = transformedData.filter((item: StockMovementData) =>
          item.product_name.toLowerCase().includes(filters.productName.toLowerCase())
        );
      }

      if (filters.warehouseId && filters.warehouseId !== "all") {
        transformedData = transformedData.filter((item: StockMovementData) =>
          item.warehouse_name === filters.warehouseId
        );
      }

      return transformedData as StockMovementData[];
    },
  });

  // Fetch warehouses for filter
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses_for_filter"],
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

  const handleFilterChange = (key: keyof MovementFilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      transactionType: "all",
      warehouseId: "all",
      productName: "",
    });
  };

  const applyFilters = () => {
    refetch();
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'stock_in':
      case 'check_in':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'stock_out':
      case 'check_out':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  const getTransactionBadgeVariant = (type: string) => {
    switch (type) {
      case 'stock_in':
      case 'check_in':
        return "default";
      case 'stock_out':
      case 'check_out':
        return "destructive";
      case 'transfer':
        return "secondary";
      default:
        return "outline";
    }
  };

  const exportToCSV = () => {
    try {
      const headers = ["Date", "Type", "Product", "Warehouse", "Quantity", "Reference", "User", "Status", "Notes"];
      const csvContent = [
        headers.join(","),
        ...movementData.map(item => [
          format(new Date(item.transaction_date), "yyyy-MM-dd HH:mm:ss"),
          item.type,
          `"${item.product_name}"`,
          `"${item.warehouse_name}"`,
          item.quantity,
          `"${item.reference}"`,
          `"${item.user_email}"`,
          item.approval_status,
          `"${item.notes}"`
        ].join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `stock-movement-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
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

  return (
    <div className="page-container">
      <PageHeader
        title="Stock Movement Report"
        description="Track inventory movements and transactions over time"
        actions={
          <Button onClick={exportToCSV} disabled={movementData.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
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
                <Label htmlFor="transactionType">Transaction Type</Label>
                <Select
                  value={filters.transactionType}
                  onValueChange={(value) => handleFilterChange("transactionType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="stock_in">Stock In</SelectItem>
                    <SelectItem value="stock_out">Stock Out</SelectItem>
                    <SelectItem value="check_in">Check In</SelectItem>
                    <SelectItem value="check_out">Check Out</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
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
              <CardTitle>Stock Movement Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingMovement ? (
                <div className="flex justify-center py-8">Loading movement data...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movementData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {format(new Date(item.transaction_date), "MMM dd, yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTransactionIcon(item.type)}
                              <Badge variant={getTransactionBadgeVariant(item.type)}>
                                {item.type.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>{item.warehouse_name}</TableCell>
                          <TableCell className="text-right font-mono">
                            {item.quantity}
                          </TableCell>
                          <TableCell>{item.reference}</TableCell>
                          <TableCell>{item.user_email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.approval_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {movementData.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No stock movement data found matching the selected filters.
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

export default StockMovementReport;
