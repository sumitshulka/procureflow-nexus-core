import React, { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isPast, isWithinInterval, addDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWarehouseTransfers } from "@/hooks/useWarehouseTransfers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRightLeft,
  CalendarIcon,
  Loader2,
  Package,
  Plus,
  Trash2,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const transferFormSchema = z.object({
  source_warehouse_id: z.string().min(1, "Source warehouse is required"),
  target_warehouse_id: z.string().min(1, "Target warehouse is required"),
  courier_name: z.string().optional(),
  tracking_number: z.string().optional(),
  expected_delivery_date: z.date().optional(),
  initiation_notes: z.string().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        product_name: z.string(),
        batch_number: z.string().nullable().optional(),
        expiry_date: z.string().nullable().optional(),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        available_quantity: z.number(),
        unit_price: z.number().nullable().optional(),
        currency: z.string().optional(),
      })
    )
    .min(1, "At least one item is required"),
}).refine((data) => data.source_warehouse_id !== data.target_warehouse_id, {
  message: "Source and target warehouses must be different",
  path: ["target_warehouse_id"],
}).refine((data) => {
  return data.items.every((item) => item.quantity <= item.available_quantity);
}, {
  message: "Quantity cannot exceed available quantity",
  path: ["items"],
});

type TransferFormValues = z.infer<typeof transferFormSchema>;

interface TransferInitiateFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function TransferInitiateForm({ onSuccess, onCancel }: TransferInitiateFormProps) {
  const { initiateTransfer, isInitiating, useWarehouseInventory, useAvailableBatches } = useWarehouseTransfers();
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>("");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      source_warehouse_id: "",
      target_warehouse_id: "",
      courier_name: "",
      tracking_number: "",
      initiation_notes: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const sourceWarehouseId = form.watch("source_warehouse_id");

  // Fetch warehouses
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

  // Fetch inventory items (products) for source warehouse
  const { data: inventoryItems = [], isLoading: inventoryLoading } = useWarehouseInventory(sourceWarehouseId);

  // Fetch available batches for source warehouse
  const { data: availableBatches = [] } = useAvailableBatches(sourceWarehouseId);

  // Filter inventory items by selected product
  const filteredInventory = selectedProductFilter
    ? inventoryItems.filter((item) => item.product_id === selectedProductFilter)
    : inventoryItems;

  // Get target warehouses (exclude source)
  const targetWarehouses = warehouses.filter((w) => w.id !== sourceWarehouseId);

  // Get batches for a specific product
  const getBatchesForProduct = (productId: string) => {
    return availableBatches.filter((b) => b.product_id === productId);
  };

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

  // Add product without batch
  const addProductToItems = (product: typeof inventoryItems[0]) => {
    const existingIndex = fields.findIndex(
      (f) => f.product_id === product.product_id && !f.batch_number
    );

    if (existingIndex >= 0) return;

    append({
      product_id: product.product_id,
      product_name: product.product_name,
      batch_number: null,
      expiry_date: null,
      quantity: 1,
      available_quantity: product.available_quantity,
      unit_price: product.unit_price,
      currency: product.currency || "USD",
    });
  };

  // Add specific batch to items
  const addBatchToItems = (batch: typeof availableBatches[0]) => {
    const existingIndex = fields.findIndex(
      (f) => f.batch_number === batch.batch_number && f.product_id === batch.product_id
    );

    if (existingIndex >= 0) return;

    append({
      product_id: batch.product_id,
      product_name: batch.product_name,
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date,
      quantity: 1,
      available_quantity: batch.quantity,
      unit_price: batch.unit_price,
      currency: batch.currency || "USD",
    });
  };

  const onSubmit = (data: TransferFormValues) => {
    initiateTransfer(
      {
        source_warehouse_id: data.source_warehouse_id,
        target_warehouse_id: data.target_warehouse_id,
        courier_name: data.courier_name,
        tracking_number: data.tracking_number,
        expected_delivery_date: data.expected_delivery_date,
        initiation_notes: data.initiation_notes,
        items: data.items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          batch_number: item.batch_number || undefined,
          expiry_date: item.expiry_date || undefined,
          quantity: item.quantity,
          available_quantity: item.available_quantity,
          unit_price: item.unit_price || undefined,
          currency: item.currency,
        })),
      },
      { onSuccess }
    );
  };

  // Check if product is already added (without batch)
  const isProductAdded = (productId: string) => {
    return fields.some((f) => f.product_id === productId && !f.batch_number);
  };

  // Check if batch is already added
  const isBatchAdded = (productId: string, batchNumber: string) => {
    return fields.some((f) => f.product_id === productId && f.batch_number === batchNumber);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Initiate Warehouse Transfer
            </CardTitle>
            <CardDescription>
              Transfer inventory items between warehouses. Select products and optionally specify batches if available.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Warehouse Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source_warehouse_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Warehouse</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("items", []);
                        setExpandedProduct(null);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source warehouse" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_warehouse_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Warehouse</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select target warehouse" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {targetWarehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Courier/Delivery Details */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Courier / Delivery Details (Optional)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="courier_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Courier Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., DHL, FedEx" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tracking_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter tracking number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expected_delivery_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Delivery Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Product Selection */}
            {sourceWarehouseId && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Select Items to Transfer
                  </h4>
                  <Select 
                    value={selectedProductFilter || "all"} 
                    onValueChange={(val) => setSelectedProductFilter(val === "all" ? "" : val)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by product" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      {inventoryItems.map((item) => (
                        <SelectItem key={item.product_id} value={item.product_id}>
                          {item.product_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {inventoryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : filteredInventory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No products available in this warehouse
                  </div>
                ) : (
                  <div className="border rounded-lg max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Available Qty</TableHead>
                          <TableHead>Batches</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInventory.map((product) => {
                          const productBatches = getBatchesForProduct(product.product_id);
                          const hasBatches = productBatches.length > 0;
                          const isExpanded = expandedProduct === product.product_id;
                          const productAdded = isProductAdded(product.product_id);

                          return (
                            <React.Fragment key={product.product_id}>
                              <TableRow className={productAdded ? "bg-muted/50" : undefined}>
                                <TableCell className="font-medium">
                                  {product.product_name}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {product.product_sku || "-"}
                                </TableCell>
                                <TableCell>{product.available_quantity}</TableCell>
                                <TableCell>
                                  {hasBatches ? (
                                    <Button
                                      type="button"
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0"
                                      onClick={() => setExpandedProduct(isExpanded ? null : product.product_id)}
                                    >
                                      {productBatches.length} batch{productBatches.length > 1 ? "es" : ""} 
                                      {isExpanded ? " ▲" : " ▼"}
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">No batches</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {!hasBatches && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={productAdded ? "secondary" : "outline"}
                                      onClick={() => addProductToItems(product)}
                                      disabled={productAdded}
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      {productAdded ? "Added" : "Add"}
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                              
                              {/* Expanded batch rows */}
                              {isExpanded && productBatches.map((batch) => {
                                const expiryStatus = getExpiryStatus(batch.expiry_date);
                                const batchAdded = isBatchAdded(batch.product_id, batch.batch_number);

                                return (
                                  <TableRow 
                                    key={`${batch.product_id}_${batch.batch_number}`}
                                    className={cn(
                                      "bg-muted/30",
                                      batchAdded && "bg-muted/50"
                                    )}
                                  >
                                    <TableCell className="pl-8">
                                      <span className="text-muted-foreground">└</span>{" "}
                                      Batch: <span className="font-mono">{batch.batch_number}</span>
                                    </TableCell>
                                    <TableCell></TableCell>
                                    <TableCell>{batch.quantity}</TableCell>
                                    <TableCell>
                                      {batch.expiry_date && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm">
                                            {format(new Date(batch.expiry_date), "MMM dd, yyyy")}
                                          </span>
                                          {expiryStatus && (
                                            <Badge
                                              variant={
                                                expiryStatus.variant === "success"
                                                  ? "default"
                                                  : expiryStatus.variant
                                              }
                                              className={
                                                expiryStatus.variant === "success"
                                                  ? "bg-green-100 text-green-800"
                                                  : expiryStatus.variant === "warning"
                                                  ? "bg-yellow-100 text-yellow-800"
                                                  : undefined
                                              }
                                            >
                                              {expiryStatus.label}
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={batchAdded ? "secondary" : "outline"}
                                        onClick={() => addBatchToItems(batch)}
                                        disabled={batchAdded}
                                      >
                                        <Plus className="h-4 w-4 mr-1" />
                                        {batchAdded ? "Added" : "Add"}
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* Selected Items */}
            {fields.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">Items to Transfer</h4>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Batch #</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead>Transfer Qty</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium">
                            {field.product_name}
                          </TableCell>
                          <TableCell>
                            {field.batch_number ? (
                              <span className="font-mono">{field.batch_number}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{field.available_quantity}</TableCell>
                          <TableCell>
                            <Controller
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field: qtyField }) => (
                                <Input
                                  type="number"
                                  min={1}
                                  max={field.available_quantity}
                                  className="w-24"
                                  value={qtyField.value}
                                  onChange={(e) =>
                                    qtyField.onChange(parseInt(e.target.value) || 1)
                                  }
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {form.formState.errors.items && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.items.message}
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="initiation_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about this transfer..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional notes for this transfer
                  </FormDescription>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isInitiating || fields.length === 0}>
            {isInitiating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Initiate Transfer
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default TransferInitiateForm;
