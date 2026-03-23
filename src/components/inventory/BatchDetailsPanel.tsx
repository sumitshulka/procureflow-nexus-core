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
import { Package, Calendar, Warehouse, Hash, DollarSign, Barcode } from "lucide-react";
import { format, isPast, isWithinInterval, addDays } from "date-fns";
import { formatCurrency } from "@/utils/currencyUtils";

interface BatchDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  productName: string;
  warehouseFilter: string;
}

interface TransactionGroup {
  key: string;
  warehouse_id: string;
  warehouse_name: string;
  sku_code: string | null;
  sku_id: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  serial_numbers: string[];
  tracking_type: string;
  quantity: number;
  unit_price: number | null;
  currency: string;
  total_value: number;
}

const BatchDetailsPanel: React.FC<BatchDetailsProps> = ({
  open,
  onOpenChange,
  productId,
  productName,
  warehouseFilter,
}) => {
  // Fetch org base currency
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

  // Fetch product tracking type
  const { data: productConfig } = useQuery({
    queryKey: ["product-tracking-panel", productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase
        .from("products")
        .select("tracking_type, requires_serial_tracking, currency")
        .eq("id", productId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  const trackingType = productConfig?.tracking_type || "none";
  const productCurrency = productConfig?.currency || baseCurrency;
  const hasBatchTracking = trackingType === "batch" || trackingType === "both";
  const hasSerialTracking = trackingType === "serial" || trackingType === "both" || productConfig?.requires_serial_tracking;

  // Fetch inventory data from transactions
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["product-inventory-detail", productId, warehouseFilter, baseCurrency],
    queryFn: async () => {
      if (!productId) return [];

      // Fetch check-ins
      let checkinQuery = supabase
        .from("inventory_transactions")
        .select(`
          id, quantity, unit_price, currency, delivery_details, target_warehouse_id, sku_id,
          warehouse:target_warehouse_id(id, name),
          product_skus:sku_id(sku_code)
        `)
        .eq("product_id", productId)
        .eq("type", "check_in");

      if (warehouseFilter && warehouseFilter !== "_all") {
        checkinQuery = checkinQuery.eq("target_warehouse_id", warehouseFilter);
      }

      const { data: checkins, error: ciError } = await checkinQuery;
      if (ciError) { console.error("Error fetching checkins:", ciError); return []; }

      // Build groups
      const groupMap = new Map<string, TransactionGroup>();

      (checkins || []).forEach((tx: any) => {
        const details = (tx.delivery_details as Record<string, any>) || {};
        const batchNumber = details.batch_number || null;
        const skuCode = tx.product_skus?.sku_code || details.sku_code || null;
        const txTracking = details.tracking_type || trackingType;
        const txCurrency = tx.currency || productCurrency;
        const serialNumbers: string[] = details.serial_numbers || [];

        // Group key: warehouse + sku + batch (or "no-batch" for non-batch products)
        const batchKey = batchNumber || "__no_batch__";
        const skuKey = tx.sku_id || "__no_sku__";
        const key = `${tx.target_warehouse_id}_${skuKey}_${batchKey}`;

        if (groupMap.has(key)) {
          const existing = groupMap.get(key)!;
          existing.quantity += tx.quantity;
          existing.total_value += (tx.unit_price || 0) * tx.quantity;
          if (serialNumbers.length > 0) {
            existing.serial_numbers.push(...serialNumbers);
          }
        } else {
          groupMap.set(key, {
            key,
            warehouse_id: tx.target_warehouse_id,
            warehouse_name: tx.warehouse?.name || "Unknown",
            sku_code: skuCode,
            sku_id: tx.sku_id,
            batch_number: batchNumber,
            expiry_date: details.expiry_date || null,
            serial_numbers: [...serialNumbers],
            tracking_type: txTracking,
            quantity: tx.quantity,
            unit_price: tx.unit_price,
            currency: txCurrency,
            total_value: (tx.unit_price || 0) * tx.quantity,
          });
        }
      });

      // Subtract check-outs
      let checkoutQuery = supabase
        .from("inventory_transactions")
        .select(`id, quantity, delivery_details, source_warehouse_id, sku_id`)
        .eq("product_id", productId)
        .eq("type", "check_out");

      if (warehouseFilter && warehouseFilter !== "_all") {
        checkoutQuery = checkoutQuery.eq("source_warehouse_id", warehouseFilter);
      }

      const { data: checkouts } = await checkoutQuery;

      (checkouts || []).forEach((tx: any) => {
        const details = (tx.delivery_details as Record<string, any>) || {};
        const batchNumber = details.batch_number || null;
        const batchKey = batchNumber || "__no_batch__";
        const skuKey = tx.sku_id || "__no_sku__";
        const key = `${tx.source_warehouse_id}_${skuKey}_${batchKey}`;

        if (groupMap.has(key)) {
          const existing = groupMap.get(key)!;
          existing.quantity -= tx.quantity;
          existing.total_value -= (existing.unit_price || 0) * tx.quantity;
          // Remove checked-out serial numbers
          const removedSerials: string[] = details.serial_numbers || [];
          if (removedSerials.length > 0) {
            existing.serial_numbers = existing.serial_numbers.filter(
              (s) => !removedSerials.includes(s)
            );
          }
        }
      });

      return Array.from(groupMap.values()).filter((g) => g.quantity > 0);
    },
    enabled: open && !!productId,
  });

  const totalQuantity = groups.reduce((sum, g) => sum + g.quantity, 0);
  const totalValue = groups.reduce((sum, g) => sum + g.total_value, 0);
  const displayCurrency = groups.length > 0 ? groups[0].currency : productCurrency;

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const today = new Date();
    if (isPast(expiry)) return { label: "Expired", variant: "destructive" as const };
    if (isWithinInterval(expiry, { start: today, end: addDays(today, 30) }))
      return { label: "Expiring Soon", variant: "warning" as const };
    return { label: "Valid", variant: "success" as const };
  };

  const getTrackingLabel = () => {
    if (hasBatchTracking && hasSerialTracking) return "Batch + Serial Tracked";
    if (hasBatchTracking) return "Batch Tracked";
    if (hasSerialTracking) return "Serial Tracked";
    return "Standard (No Tracking)";
  };

  // Determine which columns to show
  const showBatchCol = hasBatchTracking || groups.some((g) => g.batch_number);
  const showExpiryCol = showBatchCol;
  const showSerialCol = hasSerialTracking || groups.some((g) => g.serial_numbers.length > 0);
  const showWarehouseCol = !warehouseFilter || warehouseFilter === "_all";

  let colSpan = 3; // SKU, Qty, Value
  if (showWarehouseCol) colSpan++;
  if (showBatchCol) colSpan++;
  if (showExpiryCol) colSpan++;
  if (showSerialCol) colSpan++;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {productName}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {getTrackingLabel()}
            </Badge>
            {warehouseFilter && warehouseFilter !== "_all"
              ? "Filtered by warehouse"
              : "All warehouses"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Hash className="h-4 w-4" />
                {showBatchCol ? "Batches" : "Lines"}
              </div>
              <div className="mt-1 text-2xl font-bold">{groups.length}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Package className="h-4 w-4" />
                Total Quantity
              </div>
              <div className="mt-1 text-2xl font-bold">{totalQuantity}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <DollarSign className="h-4 w-4" />
                Total Value
              </div>
              <div className="mt-1 text-2xl font-bold text-primary">
                {formatCurrency(totalValue, displayCurrency)}
              </div>
            </div>
          </div>

          {/* Detail Table */}
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {showWarehouseCol && <TableHead>Warehouse</TableHead>}
                  <TableHead>SKU</TableHead>
                  {showBatchCol && <TableHead>Batch #</TableHead>}
                  {showExpiryCol && <TableHead>Expiry</TableHead>}
                  {showSerialCol && <TableHead>Serials</TableHead>}
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: colSpan }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : groups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-8">
                      No inventory records found for this product
                    </TableCell>
                  </TableRow>
                ) : (
                  groups.map((group) => {
                    const expiryStatus = getExpiryStatus(group.expiry_date);
                    return (
                      <TableRow key={group.key}>
                        {showWarehouseCol && (
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{group.warehouse_name}</span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          {group.sku_code ? (
                            <span className="font-mono text-xs">{group.sku_code}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {showBatchCol && (
                          <TableCell>
                            {group.batch_number ? (
                              <div className="flex items-center gap-1.5">
                                <Barcode className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium text-sm">{group.batch_number}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No batch</span>
                            )}
                          </TableCell>
                        )}
                        {showExpiryCol && (
                          <TableCell>
                            {group.expiry_date ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-sm">
                                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                  {format(new Date(group.expiry_date), "MMM dd, yyyy")}
                                </div>
                                {expiryStatus && (
                                  <Badge variant={expiryStatus.variant} className="w-fit text-xs">
                                    {expiryStatus.label}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                        )}
                        {showSerialCol && (
                          <TableCell>
                            {group.serial_numbers.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {group.serial_numbers.slice(0, 3).map((sn) => (
                                  <Badge key={sn} variant="secondary" className="text-[10px] font-mono">
                                    {sn}
                                  </Badge>
                                ))}
                                {group.serial_numbers.length > 3 && (
                                  <Badge variant="outline" className="text-[10px]">
                                    +{group.serial_numbers.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-medium">
                          {group.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {group.total_value > 0
                            ? formatCurrency(group.total_value, group.currency)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Warehouse breakdown */}
          {showWarehouseCol && groups.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                Warehouse Summary
              </h4>
              <div className="space-y-2">
                {Object.entries(
                  groups.reduce((acc, g) => {
                    if (!acc[g.warehouse_name]) {
                      acc[g.warehouse_name] = { quantity: 0, value: 0, lines: 0, currency: g.currency };
                    }
                    acc[g.warehouse_name].quantity += g.quantity;
                    acc[g.warehouse_name].value += g.total_value;
                    acc[g.warehouse_name].lines += 1;
                    return acc;
                  }, {} as Record<string, { quantity: number; value: number; lines: number; currency: string }>)
                ).map(([name, data]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {data.lines} {showBatchCol ? "batch" : "line"}{data.lines !== 1 ? "es" : ""}
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
