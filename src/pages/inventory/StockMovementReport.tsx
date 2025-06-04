
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/common/DataTable";
import { format } from "date-fns";
import { Search, Download, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StockMovement {
  id: string;
  type: string;
  product_name: string;
  quantity: number;
  transaction_date: string;
  reference: string;
  source_warehouse: string;
  target_warehouse: string;
  user_name: string;
  notes: string;
}

const StockMovementReport = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [movementType, setMovementType] = useState("all");

  // Fetch warehouses for filtering
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses_for_movement_report"],
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

  // Fetch products for filtering
  const { data: products = [] } = useQuery({
    queryKey: ["products_for_movement_report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch stock movements
  const { data: stockMovements = [], isLoading, error } = useQuery({
    queryKey: ["stock_movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(`
          id,
          type,
          quantity,
          transaction_date,
          reference,
          notes,
          product:product_id(name),
          source_warehouse:source_warehouse_id(name),
          target_warehouse:target_warehouse_id(name),
          user:user_id(full_name)
        `)
        .order("transaction_date", { ascending: false });

      if (error) {
        console.error("Error fetching stock movements:", error);
        throw error;
      }

      // Transform the data to match our interface
      return (data || []).map((item: any) => ({
        id: item.id,
        type: item.type,
        product_name: item.product?.name || "Unknown Product",
        quantity: item.quantity,
        transaction_date: item.transaction_date,
        reference: item.reference || "-",
        source_warehouse: item.source_warehouse?.name || "-",
        target_warehouse: item.target_warehouse?.name || "-",
        user_name: item.user?.full_name || "Unknown User",
        notes: item.notes || "-",
      })) as StockMovement[];
    },
    retry: 1,
    staleTime: 30000, // Cache for 30 seconds to prevent frequent refetches
  });

  // Filter stock movements based on search criteria
  const filteredMovements = useMemo(() => {
    if (!stockMovements) return [];
    
    return stockMovements.filter((movement) => {
      const matchesSearch = !searchTerm || 
        movement.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.reference.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesWarehouse = selectedWarehouse === "all" || 
        movement.source_warehouse.includes(selectedWarehouse) ||
        movement.target_warehouse.includes(selectedWarehouse);
      
      const matchesProduct = selectedProduct === "all" || 
        movement.product_name === selectedProduct;
      
      const matchesType = movementType === "all" || movement.type === movementType;
      
      return matchesSearch && matchesWarehouse && matchesProduct && matchesType;
    });
  }, [stockMovements, searchTerm, selectedWarehouse, selectedProduct, movementType]);

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "check_in":
        return <ArrowDownRight className="h-4 w-4 text-green-600" />;
      case "check_out":
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      case "transfer":
        return <ArrowLeftRight className="h-4 w-4 text-blue-600" />;
      default:
        return <ArrowLeftRight className="h-4 w-4 text-gray-600" />;
    }
  };

  const columns = [
    {
      id: "transaction_date",
      header: "Date",
      cell: (row: StockMovement) => (
        <div>{format(new Date(row.transaction_date), "MMM dd, yyyy HH:mm")}</div>
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: (row: StockMovement) => (
        <div className="flex items-center gap-2">
          {getMovementIcon(row.type)}
          <span className="capitalize">{row.type.replace("_", " ")}</span>
        </div>
      ),
    },
    {
      id: "product_name",
      header: "Product",
      cell: (row: StockMovement) => <div className="font-medium">{row.product_name}</div>,
    },
    {
      id: "quantity",
      header: "Quantity",
      cell: (row: StockMovement) => <div className="text-center">{row.quantity}</div>,
    },
    {
      id: "warehouses",
      header: "Movement",
      cell: (row: StockMovement) => (
        <div className="text-sm">
          {row.type === "check_in" && (
            <span>→ {row.target_warehouse}</span>
          )}
          {row.type === "check_out" && (
            <span>{row.source_warehouse} →</span>
          )}
          {row.type === "transfer" && (
            <span>{row.source_warehouse} → {row.target_warehouse}</span>
          )}
        </div>
      ),
    },
    {
      id: "reference",
      header: "Reference",
      cell: (row: StockMovement) => <div>{row.reference}</div>,
    },
    {
      id: "user_name",
      header: "User",
      cell: (row: StockMovement) => <div>{row.user_name}</div>,
    },
    {
      id: "notes",
      header: "Notes",
      cell: (row: StockMovement) => (
        <div className="max-w-xs truncate">{row.notes}</div>
      ),
    },
  ];

  const exportToCSV = () => {
    if (filteredMovements.length === 0) {
      toast({
        title: "No Data",
        description: "No stock movements to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Date", "Type", "Product", "Quantity", "From", "To", "Reference", "User", "Notes"];
    const csvContent = [
      headers.join(","),
      ...filteredMovements.map(movement => [
        format(new Date(movement.transaction_date), "yyyy-MM-dd HH:mm"),
        movement.type,
        `"${movement.product_name}"`,
        movement.quantity,
        `"${movement.source_warehouse}"`,
        `"${movement.target_warehouse}"`,
        `"${movement.reference}"`,
        `"${movement.user_name}"`,
        `"${movement.notes}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-movement-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Stock movement report exported successfully",
    });
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Movement Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            Error loading stock movements. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Movement Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products, references..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={movementType} onValueChange={setMovementType}>
            <SelectTrigger>
              <SelectValue placeholder="Movement Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="check_in">Check In</SelectItem>
              <SelectItem value="check_out">Check Out</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger>
              <SelectValue placeholder="Warehouse" />
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

          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger>
              <SelectValue placeholder="Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.name}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={exportToCSV} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Results Summary */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredMovements.length} of {stockMovements.length} movements
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="flex justify-center py-8">Loading stock movements...</div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredMovements}
            emptyMessage="No stock movements found matching your criteria."
          />
        )}
      </CardContent>
    </Card>
  );
};

export default StockMovementReport;
