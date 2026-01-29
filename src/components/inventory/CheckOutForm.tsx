import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/use-toast";
import {
  Loader2,
  Plus,
  Trash2,
  Package,
  AlertTriangle,
  Calendar,
  Warehouse,
} from "lucide-react";
import { format, isPast, isWithinInterval, addDays } from "date-fns";
import { InventoryTransaction } from "@/types";

// Schema for checkout form
const checkOutFormSchema = z
  .object({
    checkout_type: z.enum(["request_based", "direct"]),
    procurement_request_id: z.string().optional(),
    source_warehouse_id: z.string().min(1, "Warehouse is required"),
    reason: z
      .enum(["internal_use", "project", "maintenance", "sample", "other"])
      .optional(),
    explanation: z.string().optional(),
    notes: z.string().optional(),
    items: z
      .array(
        z.object({
          product_id: z.string().min(1, "Product is required"),
          product_name: z.string(),
          batch_number: z.string().min(1, "Batch number is required"),
          available_quantity: z.number(),
          expiry_date: z.string().nullable(),
          checkout_quantity: z
            .number()
            .min(1, "Quantity must be at least 1"),
          unit_price: z.number().nullable(),
        })
      )
      .min(1, "At least one item is required"),
  })
  .refine(
    (data) => {
      if (data.checkout_type === "direct") {
        return (
          data.reason &&
          data.explanation &&
          data.explanation.trim().length >= 10
        );
      }
      if (data.checkout_type === "request_based") {
        return data.procurement_request_id && data.procurement_request_id.length > 0;
      }
      return true;
    },
    {
      message:
        "Reason and detailed explanation (min 10 characters) are required for direct checkout",
      path: ["explanation"],
    }
  )
  .refine(
    (data) => {
      // Validate quantities don't exceed available
      return data.items.every(
        (item) => item.checkout_quantity <= item.available_quantity
      );
    },
    {
      message: "Checkout quantity cannot exceed available quantity",
      path: ["items"],
    }
  );

type CheckOutFormValues = z.infer<typeof checkOutFormSchema>;

interface BatchInfo {
  batch_number: string;
  product_id: string;
  product_name: string;
  warehouse_id: string;
  quantity: number;
  expiry_date: string | null;
  unit_price: number | null;
}

interface CheckOutFormProps {
  productId?: string;
  onSuccess: (transaction: InventoryTransaction) => void;
  onCancel: () => void;
}

const CHECKOUT_REASONS = [
  { value: "internal_use", label: "Internal Use" },
  { value: "project", label: "Project Requirement" },
  { value: "maintenance", label: "Maintenance/Repair" },
  { value: "sample", label: "Sample/Testing" },
  { value: "other", label: "Other" },
];

const CheckOutForm = ({ productId, onSuccess, onCancel }: CheckOutFormProps) => {
  const queryClient = useQueryClient();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");

  const form = useForm<CheckOutFormValues>({
    resolver: zodResolver(checkOutFormSchema),
    defaultValues: {
      checkout_type: "request_based",
      procurement_request_id: "",
      source_warehouse_id: "",
      reason: undefined,
      explanation: "",
      notes: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const checkoutType = form.watch("checkout_type");
  const warehouseId = form.watch("source_warehouse_id");

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

  // Fetch products for selection
  const { data: products = [] } = useQuery({
    queryKey: ["products_for_checkout"],
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

  // Fetch approved procurement requests
  const { data: procurementRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["approved_procurement_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procurement_requests")
        .select("id, request_number, title")
        .eq("status", "approved")
        .order("date_created", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: checkoutType === "request_based",
  });

  // Fetch available batches for selected warehouse
  const { data: availableBatches = [], isLoading: batchesLoading } = useQuery({
    queryKey: ["available_batches", warehouseId],
    queryFn: async () => {
      if (!warehouseId) return [];

      // Fetch check_in transactions with batch information
      const { data: checkIns, error: checkInError } = await supabase
        .from("inventory_transactions")
        .select(
          `
          id,
          quantity,
          unit_price,
          delivery_details,
          product_id,
          product:product_id(id, name, sku)
        `
        )
        .eq("type", "check_in")
        .eq("target_warehouse_id", warehouseId)
        .not("delivery_details", "is", null);

      if (checkInError) throw checkInError;

      // Aggregate batch information
      const batchMap = new Map<string, BatchInfo>();

      checkIns?.forEach((tx: any) => {
        const details = (tx.delivery_details as Record<string, any>) || {};
        const batchNumber = details.batch_number;
        if (!batchNumber) return;

        const key = `${batchNumber}_${tx.product_id}`;

        if (batchMap.has(key)) {
          const existing = batchMap.get(key)!;
          existing.quantity += tx.quantity;
        } else {
          batchMap.set(key, {
            batch_number: batchNumber,
            product_id: tx.product_id,
            product_name: tx.product?.name || "Unknown",
            warehouse_id: warehouseId,
            quantity: tx.quantity,
            expiry_date: details.expiry_date || null,
            unit_price: tx.unit_price,
          });
        }
      });

      // Account for check_outs
      const { data: checkOuts } = await supabase
        .from("inventory_transactions")
        .select("id, quantity, delivery_details, product_id")
        .eq("type", "check_out")
        .eq("source_warehouse_id", warehouseId)
        .not("delivery_details", "is", null);

      checkOuts?.forEach((tx: any) => {
        const details = (tx.delivery_details as Record<string, any>) || {};
        const batchNumber = details.batch_number;
        if (!batchNumber) return;

        const key = `${batchNumber}_${tx.product_id}`;
        if (batchMap.has(key)) {
          const existing = batchMap.get(key)!;
          existing.quantity -= tx.quantity;
        }
      });

      // Filter out batches with zero or negative quantity
      return Array.from(batchMap.values()).filter((b) => b.quantity > 0);
    },
    enabled: !!warehouseId,
  });

  // Filter batches by selected product
  const filteredBatches = selectedProduct
    ? availableBatches.filter((b) => b.product_id === selectedProduct)
    : availableBatches;

  // Add batch to checkout items
  const addBatchToItems = (batch: BatchInfo) => {
    // Check if already added
    const existingIndex = fields.findIndex(
      (f) =>
        f.batch_number === batch.batch_number && f.product_id === batch.product_id
    );

    if (existingIndex >= 0) {
      toast({
        title: "Batch Already Added",
        description: "This batch is already in the checkout list",
        variant: "destructive",
      });
      return;
    }

    append({
      product_id: batch.product_id,
      product_name: batch.product_name,
      batch_number: batch.batch_number,
      available_quantity: batch.quantity,
      expiry_date: batch.expiry_date,
      checkout_quantity: 1,
      unit_price: batch.unit_price,
    });
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

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async (values: CheckOutFormValues) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const transactions = [];

      for (const item of values.items) {
        const transaction = {
          type: "check_out" as const,
          product_id: item.product_id,
          source_warehouse_id: values.source_warehouse_id,
          quantity: item.checkout_quantity,
          unit_price: item.unit_price,
          reference: values.checkout_type === "request_based" ? "procurement_request" : "direct_checkout",
          request_id:
            values.checkout_type === "request_based"
              ? values.procurement_request_id
              : null,
          transaction_date: new Date().toISOString(),
          user_id: userId,
          approval_status: "approved",
          delivery_status: "pending",
          notes: values.notes || null,
          delivery_details: {
            batch_number: item.batch_number,
            expiry_date: item.expiry_date,
            checkout_type: values.checkout_type,
            reason: values.reason || null,
            explanation: values.explanation || null,
          },
        };

        const { data, error } = await supabase
          .from("inventory_transactions")
          .insert(transaction)
          .select()
          .single();

        if (error) throw error;
        transactions.push(data);

        // Update inventory_items quantity
        const { data: existingItem } = await supabase
          .from("inventory_items")
          .select("id, quantity")
          .eq("product_id", item.product_id)
          .eq("warehouse_id", values.source_warehouse_id)
          .single();

        if (existingItem) {
          await supabase
            .from("inventory_items")
            .update({
              quantity: existingItem.quantity - item.checkout_quantity,
              last_updated: new Date().toISOString(),
            })
            .eq("id", existingItem.id);
        }
      }

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: userId,
        action: "inventory_checkout",
        entity_type: "inventory_transaction",
        entity_id: transactions[0]?.id,
        details: {
          checkout_type: values.checkout_type,
          warehouse_id: values.source_warehouse_id,
          items_count: values.items.length,
          total_quantity: values.items.reduce(
            (sum, item) => sum + item.checkout_quantity,
            0
          ),
          batches: values.items.map((item) => ({
            product: item.product_name,
            batch: item.batch_number,
            quantity: item.checkout_quantity,
          })),
          reason: values.reason,
          procurement_request_id: values.procurement_request_id,
        },
      });

      return transactions[0];
    },
    onSuccess: (data) => {
      toast({
        title: "Checkout Successful",
        description: `${fields.length} item(s) checked out successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["available_batches"] });

      const inventoryTransaction: InventoryTransaction = {
        id: data.id,
        type: data.type,
        productId: data.product_id,
        quantity: data.quantity,
        reference: data.reference || "",
        date: data.transaction_date || "",
        userId: data.user_id,
        comments: data.notes,
        product_id: data.product_id,
        transaction_date: data.transaction_date,
        user_id: data.user_id,
        request_id: data.request_id,
        approval_status: data.approval_status,
        notes: data.notes,
        delivery_status: data.delivery_status,
        delivery_details: (data.delivery_details as Record<string, any>) || {},
        source_warehouse_id: data.source_warehouse_id,
        target_warehouse_id: data.target_warehouse_id,
      };

      onSuccess(inventoryTransaction);
    },
    onError: (error: any) => {
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to checkout items",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CheckOutFormValues) => {
    checkoutMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Check Out Inventory
        </CardTitle>
        <CardDescription>
          Select items and batches to check out from inventory
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Checkout Type Selection */}
          <div className="space-y-3">
            <Label>Checkout Type</Label>
            <Controller
              name="checkout_type"
              control={form.control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="request_based" id="request_based" />
                    <Label htmlFor="request_based" className="cursor-pointer">
                      Against Procurement Request
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="direct" id="direct" />
                    <Label htmlFor="direct" className="cursor-pointer">
                      Direct Checkout
                    </Label>
                  </div>
                </RadioGroup>
              )}
            />
          </div>

          {/* Request-based fields */}
          {checkoutType === "request_based" && (
            <div className="space-y-2">
              <Label>Procurement Request</Label>
              <Controller
                name="procurement_request_id"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select procurement request" />
                    </SelectTrigger>
                    <SelectContent>
                      {requestsLoading ? (
                        <SelectItem value="_loading" disabled>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading...
                        </SelectItem>
                      ) : (
                        procurementRequests.map((req) => (
                          <SelectItem key={req.id} value={req.id}>
                            {req.request_number || req.id.slice(0, 8)} -{" "}
                            {req.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.procurement_request_id && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.procurement_request_id.message}
                </p>
              )}
            </div>
          )}

          {/* Direct checkout fields */}
          {checkoutType === "direct" && (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Direct checkout requires a reason and detailed explanation for
                  audit purposes.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reason *</Label>
                  <Controller
                    name="reason"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {CHECKOUT_REASONS.map((reason) => (
                            <SelectItem key={reason.value} value={reason.value}>
                              {reason.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Detailed Explanation *</Label>
                <Textarea
                  placeholder="Provide detailed explanation for this checkout (min 10 characters)..."
                  {...form.register("explanation")}
                />
                {form.formState.errors.explanation && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.explanation.message}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Warehouse Selection */}
          <div className="space-y-2">
            <Label>Source Warehouse *</Label>
            <Controller
              name="source_warehouse_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val) => {
                    field.onChange(val);
                    setSelectedWarehouse(val);
                    // Clear items when warehouse changes
                    form.setValue("items", []);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.source_warehouse_id && (
              <p className="text-sm text-destructive">
                {form.formState.errors.source_warehouse_id.message}
              </p>
            )}
          </div>

          {/* Batch Selection */}
          {warehouseId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Select Batches to Checkout</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedProduct}
                    onValueChange={setSelectedProduct}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by product" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Products</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {batchesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredBatches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No batches available in this warehouse
                </div>
              ) : (
                <div className="rounded-md border max-h-[250px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Batch #</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBatches.map((batch, idx) => {
                        const expiryStatus = getExpiryStatus(batch.expiry_date);
                        const isAdded = fields.some(
                          (f) =>
                            f.batch_number === batch.batch_number &&
                            f.product_id === batch.product_id
                        );
                        return (
                          <TableRow key={`${batch.batch_number}_${batch.product_id}_${idx}`}>
                            <TableCell className="font-medium">
                              {batch.product_name}
                            </TableCell>
                            <TableCell className="font-mono">
                              {batch.batch_number}
                            </TableCell>
                            <TableCell className="text-right">
                              {batch.quantity}
                            </TableCell>
                            <TableCell>
                              {batch.expiry_date ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm">
                                    {format(
                                      new Date(batch.expiry_date),
                                      "MMM dd, yyyy"
                                    )}
                                  </span>
                                  {expiryStatus && (
                                    <Badge
                                      variant={expiryStatus.variant}
                                      className="w-fit text-xs"
                                    >
                                      {expiryStatus.label}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                size="sm"
                                variant={isAdded ? "secondary" : "outline"}
                                disabled={isAdded}
                                onClick={() => addBatchToItems(batch)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* Checkout Items Table */}
          {fields.length > 0 && (
            <div className="space-y-3">
              <Label>Checkout Items</Label>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Checkout Qty</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const expiryStatus = getExpiryStatus(field.expiry_date);
                      return (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium">
                            {field.product_name}
                          </TableCell>
                          <TableCell className="font-mono">
                            {field.batch_number}
                          </TableCell>
                          <TableCell>
                            {field.expiry_date ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                {format(
                                  new Date(field.expiry_date),
                                  "MMM dd, yyyy"
                                )}
                                {expiryStatus && (
                                  <Badge
                                    variant={expiryStatus.variant}
                                    className="text-xs"
                                  >
                                    {expiryStatus.label}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {field.available_quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={1}
                              max={field.available_quantity}
                              className="w-20 text-right"
                              {...form.register(
                                `items.${index}.checkout_quantity`,
                                {
                                  valueAsNumber: true,
                                }
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {form.formState.errors.items && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.items.message ||
                    form.formState.errors.items.root?.message}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Add any additional notes..."
              {...form.register("notes")}
            />
          </div>

          <CardFooter className="px-0 pt-4">
            <Button
              type="submit"
              disabled={checkoutMutation.isPending || fields.length === 0}
            >
              {checkoutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Check Out ${fields.length} Item(s)`
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="ml-2"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
};

export default CheckOutForm;
