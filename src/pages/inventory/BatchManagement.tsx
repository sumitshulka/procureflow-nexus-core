import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Package,
  Warehouse,
  Calendar,
  Hash,
  DollarSign,
  Filter,
  X,
} from "lucide-react";
import { format, isPast, isWithinInterval, addDays } from "date-fns";
import { formatCurrency } from "@/utils/currencyUtils";

interface BatchRecord {
  batch_number: string;
  product_id: string;
  product_name: string;
  product_sku: string | null;
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  expiry_date: string | null;
  received_date: string;
  unit_price: number | null;
  total_value: number;
}

const BatchManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("_all");
  const [expiryFilter, setExpiryFilter] = useState("_all");

  // Fetch warehouses for filter
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
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

  // Fetch all batch data
  const { data: batchData = [], isLoading } = useQuery({
    queryKey: ["batch_management", warehouseFilter],
    queryFn: async () => {
      // Fetch check_in transactions with batch information
      let query = supabase
        .from("inventory_transactions")
        .select(`
          id,
          quantity,
          unit_price,
          delivery_details,
          transaction_date,
          target_warehouse_id,
          product_id,
          product:product_id(id, name, sku),
          warehouse:target_warehouse_id(id, name)
        `)
        .eq("type", "check_in")
        .not("delivery_details", "is", null);

      if (warehouseFilter && warehouseFilter !== "_all") {
        query = query.eq("target_warehouse_id", warehouseFilter);
      }

      const { data: transactions, error } = await query;

      if (error) {
        console.error("Error fetching batch data:", error);
        return [];
      }

      // Aggregate batch information
      const batchMap = new Map<string, BatchRecord>();

      transactions?.forEach((tx: any) => {
        const details = (tx.delivery_details as Record<string, any>) || {};
        const batchNumber = details.batch_number;
        
        // Skip if no batch number
        if (!batchNumber) return;

        const warehouseId = tx.target_warehouse_id;
        const key = `${batchNumber}_${tx.product_id}_${warehouseId}`;

        if (batchMap.has(key)) {
          const existing = batchMap.get(key)!;
          existing.quantity += tx.quantity;
          existing.total_value += (tx.unit_price || 0) * tx.quantity;
          // Keep the earliest received date
          if (new Date(tx.transaction_date) < new Date(existing.received_date)) {
            existing.received_date = tx.transaction_date;
          }
        } else {
          batchMap.set(key, {
            batch_number: batchNumber,
            product_id: tx.product_id,
            product_name: tx.product?.name || "Unknown",
            product_sku: tx.product?.sku || null,
            warehouse_id: warehouseId,
            warehouse_name: tx.warehouse?.name || "Unknown",
            quantity: tx.quantity,
            expiry_date: details.expiry_date || null,
            received_date: tx.transaction_date,
            unit_price: tx.unit_price,
            total_value: (tx.unit_price || 0) * tx.quantity,
          });
        }
      });

      // Account for check_outs reducing the batch quantity
      let checkoutQuery = supabase
        .from("inventory_transactions")
        .select(`
          id,
          quantity,
          delivery_details,
          source_warehouse_id,
          product_id
        `)
        .eq("type", "check_out")
        .not("delivery_details", "is", null);

      if (warehouseFilter && warehouseFilter !== "_all") {
        checkoutQuery = checkoutQuery.eq("source_warehouse_id", warehouseFilter);
      }

      const { data: checkouts } = await checkoutQuery;

      checkouts?.forEach((tx: any) => {
        const details = (tx.delivery_details as Record<string, any>) || {};
        const batchNumber = details.batch_number;
        if (!batchNumber) return;

        const warehouseId = tx.source_warehouse_id;
        const key = `${batchNumber}_${tx.product_id}_${warehouseId}`;

        if (batchMap.has(key)) {
          const existing = batchMap.get(key)!;
          existing.quantity -= tx.quantity;
          existing.total_value -= (existing.unit_price || 0) * tx.quantity;
        }
      });

      // Filter out batches with zero or negative quantity
      return Array.from(batchMap.values()).filter((b) => b.quantity > 0);
    },
  });

  // Filter and search data
  const filteredData = React.useMemo(() => {
    let result = batchData;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (batch) =>
          batch.batch_number.toLowerCase().includes(query) ||
          batch.product_name.toLowerCase().includes(query) ||
          (batch.product_sku && batch.product_sku.toLowerCase().includes(query))
      );
    }

    // Expiry filter
    if (expiryFilter !== "_all") {
      const today = new Date();
      result = result.filter((batch) => {
        if (!batch.expiry_date) {
          return expiryFilter === "no_expiry";
        }
        const expiry = new Date(batch.expiry_date);
        switch (expiryFilter) {
          case "expired":
            return isPast(expiry);
          case "expiring_soon":
            return isWithinInterval(expiry, { start: today, end: addDays(today, 30) });
          case "valid":
            return !isPast(expiry) && !isWithinInterval(expiry, { start: today, end: addDays(today, 30) });
          default:
            return true;
        }
      });
    }

    return result;
  }, [batchData, searchQuery, expiryFilter]);

  // Calculate summary stats
  const stats = React.useMemo(() => {
    const uniqueBatches = new Set(filteredData.map((b) => b.batch_number)).size;
    const uniqueProducts = new Set(filteredData.map((b) => b.product_id)).size;
    const totalQuantity = filteredData.reduce((sum, b) => sum + b.quantity, 0);
    const totalValue = filteredData.reduce((sum, b) => sum + b.total_value, 0);
    const expiredCount = filteredData.filter(
      (b) => b.expiry_date && isPast(new Date(b.expiry_date))
    ).length;
    const expiringSoonCount = filteredData.filter((b) => {
      if (!b.expiry_date) return false;
      const expiry = new Date(b.expiry_date);
      const today = new Date();
      return !isPast(expiry) && isWithinInterval(expiry, { start: today, end: addDays(today, 30) });
    }).length;

    return {
      uniqueBatches,
      uniqueProducts,
      totalQuantity,
      totalValue,
      expiredCount,
      expiringSoonCount,
    };
  }, [filteredData]);

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;

    const expiry = new Date(expiryDate);
    const today = new Date();

    if (isPast(expiry)) {
      return { label: "Expired", variant: "destructive" as const };
    }

    if (isWithinInterval(expiry, { start: today, end: addDays(today, 30) })) {
      return { label: "Expiring Soon", variant: "warning" as const };
    }

    return { label: "Valid", variant: "success" as const };
  };

  const clearFilters = () => {
    setSearchQuery("");
    setWarehouseFilter("_all");
    setExpiryFilter("_all");
  };

  const hasActiveFilters = searchQuery || warehouseFilter !== "_all" || expiryFilter !== "_all";

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Unique Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueBatches}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Quantity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuantity.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats.totalValue)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.expiredCount}</div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-500 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">{stats.expiringSoonCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by batch number, product name, or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Warehouse className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Warehouses</SelectItem>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {wh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={expiryFilter} onValueChange={setExpiryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Expiry Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Status</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="expiring_soon">Expiring Soon (30 days)</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="no_expiry">No Expiry Date</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Batch Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Received Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      {hasActiveFilters
                        ? "No batches found matching your filters"
                        : "No batch information available"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((batch, index) => {
                    const expiryStatus = getExpiryStatus(batch.expiry_date);
                    return (
                      <TableRow key={`${batch.batch_number}_${batch.product_id}_${batch.warehouse_id}_${index}`}>
                        <TableCell>
                          <div className="font-mono font-medium">{batch.batch_number}</div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{batch.product_name}</div>
                            {batch.product_sku && (
                              <div className="text-xs text-muted-foreground">
                                SKU: {batch.product_sku}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{batch.warehouse_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {batch.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {format(new Date(batch.received_date), "MMM dd, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {batch.expiry_date ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {format(new Date(batch.expiry_date), "MMM dd, yyyy")}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {expiryStatus ? (
                            <Badge variant={expiryStatus.variant}>{expiryStatus.label}</Badge>
                          ) : (
                            <Badge variant="secondary">No Expiry</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {batch.total_value > 0 ? formatCurrency(batch.total_value) : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchManagement;

