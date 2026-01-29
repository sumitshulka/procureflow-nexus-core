import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Calendar, Warehouse, Hash, DollarSign } from "lucide-react";
import { format, isPast, isWithinInterval, addDays } from "date-fns";
import { formatCurrency } from "@/utils/currencyUtils";

interface BatchDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  productName: string;
  warehouseFilter: string; // empty or "_all" means all warehouses
}

interface BatchInfo {
  batch_number: string;
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  expiry_date: string | null;
  unit_price: number | null;
  total_value: number;
}

const BatchDetailsPanel: React.FC<BatchDetailsProps> = ({
  open,
  onOpenChange,
  productId,
  productName,
  warehouseFilter,
}) => {
  // Fetch batch information from inventory transactions
  const { data: batchData = [], isLoading } = useQuery({
    queryKey: ["batch_details", productId, warehouseFilter],
    queryFn: async () => {
      if (!productId) return [];

      // Fetch check_in transactions with batch information
      let query = supabase
        .from("inventory_transactions")
        .select(`
          id,
          quantity,
          unit_price,
          delivery_details,
          target_warehouse_id,
          warehouse:target_warehouse_id(id, name)
        `)
        .eq("product_id", productId)
        .eq("type", "check_in");

      if (warehouseFilter && warehouseFilter !== "_all") {
        query = query.eq("target_warehouse_id", warehouseFilter);
      }

      const { data: transactions, error } = await query;

      if (error) {
        console.error("Error fetching batch data:", error);
        return [];
      }

      // Aggregate batch information
      const batchMap = new Map<string, BatchInfo>();

      transactions?.forEach((tx: any) => {
        const details = tx.delivery_details as Record<string, any> || {};
        const batchNumber = details.batch_number || "No Batch";
        const warehouseId = tx.target_warehouse_id;
        const warehouseName = tx.warehouse?.name || "Unknown";
        const key = `${batchNumber}_${warehouseId}`;

        if (batchMap.has(key)) {
          const existing = batchMap.get(key)!;
          existing.quantity += tx.quantity;
          existing.total_value += (tx.unit_price || 0) * tx.quantity;
        } else {
          batchMap.set(key, {
            batch_number: batchNumber,
            warehouse_id: warehouseId,
            warehouse_name: warehouseName,
            quantity: tx.quantity,
            expiry_date: details.expiry_date || null,
            unit_price: tx.unit_price,
            total_value: (tx.unit_price || 0) * tx.quantity,
          });
        }
      });

      // Also need to account for check_outs reducing the batch quantity
      let checkoutQuery = supabase
        .from("inventory_transactions")
        .select(`
          id,
          quantity,
          delivery_details,
          source_warehouse_id
        `)
        .eq("product_id", productId)
        .eq("type", "check_out");

      if (warehouseFilter && warehouseFilter !== "_all") {
        checkoutQuery = checkoutQuery.eq("source_warehouse_id", warehouseFilter);
      }

      const { data: checkouts } = await checkoutQuery;

      checkouts?.forEach((tx: any) => {
        const details = tx.delivery_details as Record<string, any> || {};
        const batchNumber = details.batch_number || "No Batch";
        const warehouseId = tx.source_warehouse_id;
        const key = `${batchNumber}_${warehouseId}`;

        if (batchMap.has(key)) {
          const existing = batchMap.get(key)!;
          existing.quantity -= tx.quantity;
          existing.total_value -= (existing.unit_price || 0) * tx.quantity;
        }
      });

      // Filter out batches with zero or negative quantity
      return Array.from(batchMap.values()).filter(b => b.quantity > 0);
    },
    enabled: open && !!productId,
  });

  // Calculate totals
  const totalQuantity = batchData.reduce((sum, b) => sum + b.quantity, 0);
  const totalValue = batchData.reduce((sum, b) => sum + b.total_value, 0);

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {productName}
          </SheetTitle>
          <SheetDescription>
            Batch inventory details {warehouseFilter && warehouseFilter !== "_all" ? "for selected warehouse" : "across all warehouses"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Hash className="h-4 w-4" />
                Total Batches
              </div>
              <div className="mt-1 text-2xl font-bold">{batchData.length}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Package className="h-4 w-4" />
                Total Quantity
              </div>
              <div className="mt-1 text-2xl font-bold">{totalQuantity}</div>
            </div>
          </div>

          {/* Total Value */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Total Inventory Value
              </div>
              <div className="text-xl font-bold text-primary">
                {formatCurrency(totalValue)}
              </div>
            </div>
          </div>

          {/* Batch Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch #</TableHead>
                  {(!warehouseFilter || warehouseFilter === "_all") && (
                    <TableHead>Warehouse</TableHead>
                  )}
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      {(!warehouseFilter || warehouseFilter === "_all") && (
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      )}
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : batchData.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={warehouseFilter && warehouseFilter !== "_all" ? 4 : 5} 
                      className="text-center text-muted-foreground py-8"
                    >
                      No batch information available
                    </TableCell>
                  </TableRow>
                ) : (
                  batchData.map((batch, index) => {
                    const expiryStatus = getExpiryStatus(batch.expiry_date);
                    return (
                      <TableRow key={`${batch.batch_number}_${batch.warehouse_id}_${index}`}>
                        <TableCell className="font-medium">
                          {batch.batch_number}
                        </TableCell>
                        {(!warehouseFilter || warehouseFilter === "_all") && (
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{batch.warehouse_name}</span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-right font-medium">
                          {batch.quantity}
                        </TableCell>
                        <TableCell>
                          {batch.expiry_date ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-sm">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                {format(new Date(batch.expiry_date), "MMM dd, yyyy")}
                              </div>
                              {expiryStatus && (
                                <Badge variant={expiryStatus.variant} className="w-fit text-xs">
                                  {expiryStatus.label}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {batch.total_value > 0 ? formatCurrency(batch.total_value) : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Warehouse breakdown if viewing all */}
          {(!warehouseFilter || warehouseFilter === "_all") && batchData.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                Warehouse Summary
              </h4>
              <div className="space-y-2">
                {Object.entries(
                  batchData.reduce((acc, batch) => {
                    if (!acc[batch.warehouse_name]) {
                      acc[batch.warehouse_name] = { quantity: 0, value: 0, batches: 0 };
                    }
                    acc[batch.warehouse_name].quantity += batch.quantity;
                    acc[batch.warehouse_name].value += batch.total_value;
                    acc[batch.warehouse_name].batches += 1;
                    return acc;
                  }, {} as Record<string, { quantity: number; value: number; batches: number }>)
                ).map(([name, data]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {data.batches} batch{data.batches !== 1 ? "es" : ""}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{data.quantity} units</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(data.value)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BatchDetailsPanel;
