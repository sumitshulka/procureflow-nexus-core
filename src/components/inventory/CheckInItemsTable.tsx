import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Trash2, Plus, Barcode, Calendar, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface CheckInItem {
  id: string;
  product_id: string;
  product_name: string;
  sku_id?: string;
  sku_code?: string;
  po_item_id?: string;
  ordered_quantity?: number;
  already_received?: number;
  pending_quantity?: number;
  check_in_quantity: number;
  batch_number: string;
  expiry_date: string;
  serial_numbers?: string;
  unit_price?: number;
  is_from_po?: boolean;
  tracking_type?: string;
  requires_serial_tracking?: boolean;
  warranty_covered?: boolean;
  warranty_period_months?: number | null;
  warranty_start_date?: string;
}

interface ProductSku {
  id: string;
  sku_code: string;
  name: string;
  is_active: boolean;
}

interface ProductWithTracking {
  id: string;
  name: string;
  tracking_type: string;
  requires_serial_tracking: boolean;
  warranty_covered: boolean;
  warranty_period_months: number | null;
}

interface Product {
  id: string;
  name: string;
}

interface CheckInItemsTableProps {
  items: CheckInItem[];
  onItemsChange: (items: CheckInItem[]) => void;
  products: Product[];
  isPOBased: boolean;
  isLoading?: boolean;
}

const SkuSelector: React.FC<{
  productId: string;
  value?: string;
  onChange: (skuId: string, skuCode: string) => void;
}> = ({ productId, value, onChange }) => {
  const { data: skus = [] } = useQuery({
    queryKey: ["product-skus-select", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_skus")
        .select("id, sku_code, name, is_active")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("sku_code");
      if (error) throw error;
      return (data || []) as ProductSku[];
    },
    enabled: !!productId,
  });

  if (skus.length === 0) {
    return <span className="text-xs text-muted-foreground">No SKUs</span>;
  }

  return (
    <Select value={value || "_none"} onValueChange={(val) => {
      if (val === "_none") {
        onChange("", "");
      } else {
        const sku = skus.find(s => s.id === val);
        onChange(val, sku?.sku_code || "");
      }
    }}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Select SKU" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">No SKU</SelectItem>
        {skus.map((sku) => (
          <SelectItem key={sku.id} value={sku.id}>
            {sku.sku_code} - {sku.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// Hook to get product tracking config
const useProductTracking = (productId: string) => {
  return useQuery({
    queryKey: ["product-tracking", productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase
        .from("products")
        .select("id, name, tracking_type, requires_serial_tracking")
        .eq("id", productId)
        .maybeSingle();
      if (error) throw error;
      return data as ProductWithTracking | null;
    },
    enabled: !!productId,
  });
};

// Inline tracking badge
const TrackingBadge: React.FC<{ trackingType: string; requiresSerial: boolean }> = ({
  trackingType,
  requiresSerial,
}) => {
  if (trackingType === "none" && !requiresSerial) return null;
  
  const labels: string[] = [];
  if (trackingType === "batch" || trackingType === "both") labels.push("Batch");
  if (trackingType === "serial" || trackingType === "both" || requiresSerial) labels.push("Serial");
  
  return (
    <div className="flex gap-1 mt-0.5">
      {labels.map((l) => (
        <Badge key={l} variant="outline" className="text-[10px] px-1 py-0">
          {l}
        </Badge>
      ))}
    </div>
  );
};

// Row-level component that fetches tracking info per product
const CheckInItemRow: React.FC<{
  item: CheckInItem;
  index: number;
  isPOBased: boolean;
  products: Product[];
  onUpdateItem: (index: number, field: keyof CheckInItem, value: any) => void;
  onSelectProduct: (index: number, productId: string) => void;
  onUpdateSku: (index: number, skuId: string, skuCode: string) => void;
  onRemoveItem: (index: number) => void;
  onTrackingLoaded: (index: number, trackingType: string, requiresSerial: boolean) => void;
}> = ({ item, index, isPOBased, products, onUpdateItem, onSelectProduct, onUpdateSku, onRemoveItem, onTrackingLoaded }) => {
  const { data: productTracking } = useProductTracking(item.product_id);
  
  const trackingType = item.tracking_type || productTracking?.tracking_type || "none";
  const requiresSerial = item.requires_serial_tracking || productTracking?.requires_serial_tracking || false;
  
  const showBatch = trackingType === "batch" || trackingType === "both";
  const showSerial = trackingType === "serial" || trackingType === "both" || requiresSerial;
  const showExpiry = showBatch; // Expiry is relevant for batch-tracked items

  // Propagate tracking info to parent
  useEffect(() => {
    if (productTracking && (!item.tracking_type || item.tracking_type !== productTracking.tracking_type)) {
      onTrackingLoaded(index, productTracking.tracking_type, productTracking.requires_serial_tracking);
    }
  }, [productTracking, index, item.tracking_type, onTrackingLoaded]);

  return (
    <TableRow>
      <TableCell>
        {isPOBased && item.is_from_po ? (
          <div>
            <span className="font-medium text-sm">{item.product_name}</span>
            <Badge variant="secondary" className="ml-2 text-xs">From PO</Badge>
            <TrackingBadge trackingType={trackingType} requiresSerial={requiresSerial} />
          </div>
          ) : (
          <div>
            <Select
              value={item.product_id}
              onValueChange={(value) => onSelectProduct(index, value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {item.product_id && (
              <TrackingBadge trackingType={trackingType} requiresSerial={requiresSerial} />
            )}
          </div>
        )}
      </TableCell>

      <TableCell>
        {item.product_id ? (
          <SkuSelector
            productId={item.product_id}
            value={item.sku_id}
            onChange={(skuId, skuCode) => onUpdateSku(index, skuId, skuCode)}
          />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {isPOBased && (
        <>
          <TableCell className="text-center font-medium text-sm">
            {item.ordered_quantity ?? "-"}
          </TableCell>
          <TableCell className="text-center text-muted-foreground text-sm">
            {item.already_received ?? 0}
          </TableCell>
          <TableCell className="text-center">
            <Badge variant={(item.pending_quantity ?? 0) > 0 ? "default" : "secondary"}>
              {item.pending_quantity ?? 0}
            </Badge>
          </TableCell>
        </>
      )}

      <TableCell>
        <Input
          type="number"
          min="1"
          max={isPOBased ? item.pending_quantity : undefined}
          value={item.check_in_quantity}
          onChange={(e) => onUpdateItem(index, "check_in_quantity", parseInt(e.target.value) || 0)}
          className="w-20 h-8 text-sm"
        />
      </TableCell>

      {/* Batch Number - shown for batch/both tracking, optional otherwise */}
      <TableCell>
        {showBatch ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  placeholder="Required"
                  value={item.batch_number}
                  onChange={(e) => onUpdateItem(index, "batch_number", e.target.value)}
                  className={`h-8 text-sm ${!item.batch_number ? "border-destructive" : ""}`}
                />
              </TooltipTrigger>
              <TooltipContent>Batch number is required for this product</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Input
            placeholder="Optional"
            value={item.batch_number}
            onChange={(e) => onUpdateItem(index, "batch_number", e.target.value)}
            className="h-8 text-sm"
          />
        )}
      </TableCell>

      {/* Expiry Date - shown for batch tracking */}
      <TableCell>
        {showExpiry || item.batch_number ? (
          <Input
            type="date"
            value={item.expiry_date}
            onChange={(e) => onUpdateItem(index, "expiry_date", e.target.value)}
            className="h-8 text-sm"
          />
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        )}
      </TableCell>

      {/* Serial Numbers - shown for serial/both tracking */}
      {showSerial && (
        <TableCell>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  placeholder="S/N (comma-separated)"
                  value={item.serial_numbers || ""}
                  onChange={(e) => onUpdateItem(index, "serial_numbers", e.target.value)}
                  className={`h-8 text-sm ${requiresSerial && !item.serial_numbers ? "border-destructive" : ""}`}
                />
              </TooltipTrigger>
              <TooltipContent>
                {requiresSerial ? "Serial numbers are mandatory for this product" : "Enter serial numbers separated by commas"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TableCell>
      )}

      {!isPOBased && (
        <TableCell>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={item.unit_price || ""}
            onChange={(e) => onUpdateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
            className="w-20 h-8 text-sm"
          />
        </TableCell>
      )}

      <TableCell>
        {(!isPOBased || !item.is_from_po) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemoveItem(index)}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
};

const CheckInItemsTable: React.FC<CheckInItemsTableProps> = ({
  items,
  onItemsChange,
  products,
  isPOBased,
  isLoading = false,
}) => {
  // Check if any item has serial tracking
  const hasSerialItems = items.some(
    (item) => item.tracking_type === "serial" || item.tracking_type === "both" || item.requires_serial_tracking
  );

  const updateItem = (index: number, field: keyof CheckInItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    onItemsChange(updatedItems);
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      product_id: productId,
      product_name: product?.name || "",
      sku_id: undefined,
      sku_code: undefined,
      tracking_type: undefined,
      requires_serial_tracking: undefined,
      batch_number: "",
      expiry_date: "",
      serial_numbers: "",
    };
    onItemsChange(updatedItems);
  };

  const updateItemSku = (index: number, skuId: string, skuCode: string) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], sku_id: skuId || undefined, sku_code: skuCode || undefined };
    onItemsChange(updatedItems);
  };

  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    onItemsChange(updatedItems);
  };

  const addNewItem = () => {
    const newItem: CheckInItem = {
      id: crypto.randomUUID(),
      product_id: "",
      product_name: "",
      check_in_quantity: 1,
      batch_number: "",
      expiry_date: "",
      serial_numbers: "",
      is_from_po: false,
    };
    onItemsChange([...items, newItem]);
  };

  const handleTrackingLoaded = (index: number, trackingType: string, requiresSerial: boolean) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      tracking_type: trackingType,
      requires_serial_tracking: requiresSerial,
    };
    onItemsChange(updatedItems);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Loading items...
      </div>
    );
  }

  // Calculate colspan dynamically
  let colCount = 6; // Product, SKU, Qty, Batch, Expiry, Actions
  if (isPOBased) colCount += 3; // Ordered, Received, Pending
  if (!isPOBased) colCount += 1; // Unit Price
  if (hasSerialItems) colCount += 1; // Serial Numbers

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[200px]">Product</TableHead>
              <TableHead className="w-[160px]">SKU Variant</TableHead>
              {isPOBased && (
                <>
                  <TableHead className="w-[70px] text-center">Ordered</TableHead>
                  <TableHead className="w-[70px] text-center">Received</TableHead>
                  <TableHead className="w-[70px] text-center">Pending</TableHead>
                </>
              )}
              <TableHead className="w-[90px]">Check-in Qty</TableHead>
              <TableHead className="w-[140px]">
                <div className="flex items-center gap-1">
                  <Barcode className="h-3 w-3" />
                  Batch #
                </div>
              </TableHead>
              <TableHead className="w-[130px]">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Expiry Date
                </div>
              </TableHead>
              {hasSerialItems && (
                <TableHead className="w-[160px]">
                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    Serial Numbers
                  </div>
                </TableHead>
              )}
              {!isPOBased && <TableHead className="w-[90px]">Unit Price</TableHead>}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="text-center py-8 text-muted-foreground"
                >
                  {isPOBased
                    ? "Select a Purchase Order to load items"
                    : "Click 'Add Item' to add products for check-in"}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => (
                <CheckInItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  isPOBased={isPOBased}
                  products={products}
                  onUpdateItem={updateItem}
                  onSelectProduct={selectProduct}
                  onUpdateSku={updateItemSku}
                  onRemoveItem={removeItem}
                  onTrackingLoaded={handleTrackingLoaded}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isPOBased && (
        <Button type="button" variant="outline" onClick={addNewItem} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      )}
    </div>
  );
};

export default CheckInItemsTable;
