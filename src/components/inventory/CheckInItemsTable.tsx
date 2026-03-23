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
import { Trash2, Plus, Barcode, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  unit_price?: number;
  is_from_po?: boolean;
}

interface ProductSku {
  id: string;
  sku_code: string;
  name: string;
  is_active: boolean;
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

const CheckInItemsTable: React.FC<CheckInItemsTableProps> = ({
  items,
  onItemsChange,
  products,
  isPOBased,
  isLoading = false,
}) => {
  const updateItem = (index: number, field: keyof CheckInItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
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
      is_from_po: false,
    };
    onItemsChange([...items, newItem]);
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      product_id: productId,
      product_name: product?.name || "",
      sku_id: undefined,
      sku_code: undefined,
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

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
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
                  Batch/Barcode
                </div>
              </TableHead>
              <TableHead className="w-[130px]">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Expiry Date
                </div>
              </TableHead>
              {!isPOBased && <TableHead className="w-[90px]">Unit Price</TableHead>}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isPOBased ? 9 : 7}
                  className="text-center py-8 text-muted-foreground"
                >
                  {isPOBased
                    ? "Select a Purchase Order to load items"
                    : "Click 'Add Item' to add products for check-in"}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {isPOBased && item.is_from_po ? (
                      <div>
                        <span className="font-medium text-sm">{item.product_name}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          From PO
                        </Badge>
                      </div>
                    ) : (
                      <Select
                        value={item.product_id}
                        onValueChange={(value) => handleProductChange(index, value)}
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
                    )}
                  </TableCell>

                  <TableCell>
                    {item.product_id ? (
                      <SkuSelector
                        productId={item.product_id}
                        value={item.sku_id}
                        onChange={(skuId, skuCode) => updateItemSku(index, skuId, skuCode)}
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
                        <Badge
                          variant={
                            (item.pending_quantity ?? 0) > 0 ? "default" : "secondary"
                          }
                        >
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
                      onChange={(e) =>
                        updateItem(index, "check_in_quantity", parseInt(e.target.value) || 0)
                      }
                      className="w-20 h-8 text-sm"
                    />
                  </TableCell>

                  <TableCell>
                    <Input
                      placeholder="Batch # or scan"
                      value={item.batch_number}
                      onChange={(e) => updateItem(index, "batch_number", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </TableCell>

                  <TableCell>
                    <Input
                      type="date"
                      value={item.expiry_date}
                      onChange={(e) => updateItem(index, "expiry_date", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </TableCell>

                  {!isPOBased && (
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={item.unit_price || ""}
                        onChange={(e) =>
                          updateItem(index, "unit_price", parseFloat(e.target.value) || 0)
                        }
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
                        onClick={() => removeItem(index)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
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
