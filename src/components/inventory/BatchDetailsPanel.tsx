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
import { formatCurrency, getCurrencySymbol } from "@/utils/currencyUtils";

interface BatchDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  productName: string;
  warehouseFilter: string;
}

interface BatchRecord {
  id: string;
  batch_number: string;
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  expiry_date: string | null;
  unit_price: number | null;
  currency: string | null;
  total_value: number;
  sku_code: string | null;
}

const BatchDetailsPanel: React.FC<BatchDetailsProps> = ({
  open,
  onOpenChange,
  productId,
  productName,
  warehouseFilter,
}) => {
  // Fetch organization base currency
  const { data: orgSettings } = useQuery({
    queryKey: ["organization_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("base_currency")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const baseCurrency = orgSettings?.base_currency || "USD";

  // Fetch batch data from inventory_batches (source of truth)
  const { data: batchData = [], isLoading } = useQuery({
    queryKey: ["batch_details", productId, warehouseFilter],
    queryFn: async () => {
      if (!productId) return [];

      let query = supabase
        .from("inventory_batches")
        .select(`
          id,
          batch_number,
          warehouse_id,
          quantity,
          expiry_date,
          unit_price,
          currency,
          sku_id,
          warehouse:warehouse_id(name),
          sku:sku_id(sku_code)
        `)
        .eq("product_id", productId)
        .eq("status", "active")
        .gt("quantity", 0);

      if (warehouseFilter && warehouseFilter !== "_all") {
        query = query.eq("warehouse_id", warehouseFilter);
      }

      const { data, error } = await query.order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching batch data:", error);
        return [];
      }

      return (data || []).map((batch: any) => ({
        id: batch.id,
        batch_number: batch.batch_number,
        warehouse_id: batch.warehouse_id,
        warehouse_name: batch.warehouse?.name || "Unknown",
        quantity: batch.quantity,
        expiry_date: batch.expiry_date,
        unit_price: batch.unit_price,
        currency: batch.currency || baseCurrency,
        total_value: (batch.unit_price || 0) * batch.quantity,
        sku_code: batch.sku?.sku_code || null,
      })) as BatchRecord[];
    },
    enabled: open && !!productId,
  });

  // Calculate totals
  const totalQuantity = batchData.reduce((sum, b) => sum + b.quantity, 0);
  const totalValue = batchData.reduce((sum, b) => sum + b.total_value, 0);
  // Use the currency from the first batch, or org base currency
  const displayCurrency = batchData.length > 0 ? (batchData[0].currency || baseCurrency) : baseCurrency;

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
                {formatCurrency(totalValue, displayCurrency)}
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
                  <TableHead>SKU</TableHead>
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
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : batchData.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={warehouseFilter && warehouseFilter !== "_all" ? 5 : 6} 
                      className="text-center text-muted-foreground py-8"
                    >
                      No batch information available
                    </TableCell>
                  </TableRow>
                ) : (
                  batchData.map((batch) => {
                    const expiryStatus = getExpiryStatus(batch.expiry_date);
                    return (
                      <TableRow key={batch.id}>
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
                        <TableCell>
                          {batch.sku_code ? (
                            <span className="font-mono text-xs">{batch.sku_code}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
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
                          {batch.total_value > 0 
                            ? formatCurrency(batch.total_value, batch.currency || displayCurrency) 
                            : "—"}
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
                      acc[batch.warehouse_name] = { quantity: 0, value: 0, batches: 0, currency: batch.currency || displayCurrency };
                    }
                    acc[batch.warehouse_name].quantity += batch.quantity;
                    acc[batch.warehouse_name].value += batch.total_value;
                    acc[batch.warehouse_name].batches += 1;
                    return acc;
                  }, {} as Record<string, { quantity: number; value: number; batches: number; currency: string }>)
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
                        {formatCurrency(data.value, data.currency)}
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
