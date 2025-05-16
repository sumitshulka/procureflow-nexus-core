import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/common/PageHeader";
import DataTable from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { ArrowUpDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";

interface InventoryItem {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  minimum_level: number | null;
  reorder_level: number | null;
  last_updated: string;
  product: {
    name: string;
    category_id: string;
    category: {
      name: string;
    };
    unit: {
      name: string;
      abbreviation: string;
    };
  };
  warehouse: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
}

const InventoryItems = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [warehouseFilter, setWarehouseFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch inventory items with related data
  const { data: inventoryItems = [], isLoading } = useQuery({
    queryKey: ["inventory_items", warehouseFilter, categoryFilter, stockStatusFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("inventory_items")
        .select(`
          *,
          product:product_id(
            name,
            category_id,
            category:category_id(name),
            unit:unit_id(name, abbreviation)
          ),
          warehouse:warehouse_id(name)
        `);
      
      if (warehouseFilter) {
        query = query.eq("warehouse_id", warehouseFilter);
      }
      
      if (categoryFilter) {
        query = query.eq("product.category_id", categoryFilter);
      }
      
      if (stockStatusFilter === "low") {
        query = query.lt("quantity", query.or(`reorder_level.gt.0,1`)); // Use equivalent logic without rpc
      } else if (stockStatusFilter === "out") {
        query = query.eq("quantity", 0);
      } else if (stockStatusFilter === "normal") {
        query = query.gte("quantity", query.or(`reorder_level.gt.0,1`)); // Use equivalent logic without rpc
      }
      
      if (searchQuery) {
        // Search in product name
        query = query.textSearch("product.name", searchQuery, { 
          type: 'websearch',
          config: 'english'
        });
      }
      
      const { data, error } = await query.order("product_id");
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch inventory items",
          variant: "destructive",
        });
        throw error;
      }
      
      return data as InventoryItem[];
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
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch warehouses",
          variant: "destructive",
        });
        throw error;
      }
      
      return data as Warehouse[];
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
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch categories",
          variant: "destructive",
        });
        throw error;
      }
      
      return data as Category[];
    },
  });

  // Define stock status function
  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) {
      return { status: "out", label: "Out of Stock", variant: "destructive", icon: AlertTriangle };
    }
    
    const reorderLevel = item.reorder_level || 1;
    
    if (item.quantity < reorderLevel) {
      return { status: "low", label: "Low Stock", variant: "warning", icon: AlertTriangle };
    }
    
    return { status: "normal", label: "In Stock", variant: "success", icon: CheckCircle2 };
  };

  // Define table columns
  const columns = [
    {
      id: "product",
      header: "Product",
      cell: (row: InventoryItem) => (
        <div>
          <div className="font-medium">{row.product.name}</div>
          <div className="text-sm text-muted-foreground">
            {row.product.category.name}
          </div>
        </div>
      ),
    },
    {
      id: "warehouse",
      header: "Warehouse",
      cell: (row: InventoryItem) => <div>{row.warehouse.name}</div>,
    },
    {
      id: "quantity",
      header: "Quantity",
      cell: (row: InventoryItem) => (
        <div className="font-medium">
          {row.quantity} {row.product.unit.abbreviation || row.product.unit.name}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row: InventoryItem) => {
        const status = getStockStatus(row);
        const Icon = status.icon;
        return (
          <Badge variant={status.variant as any}>
            <Icon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        );
      },
    },
    {
      id: "minimum",
      header: "Minimum Level",
      cell: (row: InventoryItem) => (
        <div>
          {row.minimum_level !== null ? row.minimum_level : "N/A"} 
          {row.minimum_level !== null && (row.product.unit.abbreviation || row.product.unit.name)}
        </div>
      ),
    },
    {
      id: "reorder",
      header: "Reorder Level",
      cell: (row: InventoryItem) => (
        <div>
          {row.reorder_level !== null ? row.reorder_level : "N/A"} 
          {row.reorder_level !== null && (row.product.unit.abbreviation || row.product.unit.name)}
        </div>
      ),
    },
    {
      id: "lastUpdated",
      header: "Last Updated",
      cell: (row: InventoryItem) => (
        <div>
          {new Date(row.last_updated).toLocaleDateString()}
        </div>
      ),
    }
  ];

  // Navigate to transactions page
  const handleNewTransaction = () => {
    navigate("/inventory/transactions");
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Inventory Items"
        description="View and manage inventory across all warehouses"
        actions={
          <Button onClick={handleNewTransaction}>
            New Transaction
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div>
          <label className="text-sm font-medium mb-1 block">
            Search Products
          </label>
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">
            Warehouse
          </label>
          <Select
            value={warehouseFilter}
            onValueChange={setWarehouseFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Warehouses</SelectItem>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">
            Category
          </label>
          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">
            Stock Status
          </label>
          <Select
            value={stockStatusFilter}
            onValueChange={setStockStatusFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Stock Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Stock Levels</SelectItem>
              <SelectItem value="normal">In Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">Loading inventory...</div>
          ) : (
            <DataTable
              columns={columns}
              data={inventoryItems}
              emptyMessage="No inventory items found."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryItems;
