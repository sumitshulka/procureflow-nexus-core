import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Package, FileText, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CheckInItemsTable, { CheckInItem } from "./CheckInItemsTable";

// Define the check-in form schema
const checkInSchema = z.object({
  checkin_type: z.enum(["po_based", "non_po_based"]),
  purchase_order_id: z.string().optional(),
  target_warehouse_id: z.string().min(1, "Target warehouse is required"),
  non_po_reason: z.enum(["return", "correction", "found_stock", "transfer_in", "other"]).optional(),
  explanation: z.string().optional(),
  notes: z.string().optional(),
  currency: z.string().default("USD"),
});

type CheckInFormValues = z.infer<typeof checkInSchema>;

interface Product {
  id: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_name: string;
  status: string;
}

interface POItem {
  id: string;
  product_id: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  already_received: number;
}

interface CheckInFormProps {
  onSuccess: () => void;
}

const NON_PO_REASONS = [
  { value: "return", label: "Customer/Internal Return", description: "Items returned after checkout" },
  { value: "correction", label: "Inventory Correction", description: "Adjusting for counting errors" },
  { value: "found_stock", label: "Found Stock", description: "Previously unaccounted inventory discovered" },
  { value: "transfer_in", label: "Transfer In", description: "Stock transferred from external location" },
  { value: "other", label: "Other", description: "Other reason (specify in explanation)" },
];

const CheckInForm: React.FC<CheckInFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const { userData } = useAuth();
  const queryClient = useQueryClient();
  const [checkInItems, setCheckInItems] = useState<CheckInItem[]>([]);

  // Define form
  const form = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      checkin_type: "po_based",
      purchase_order_id: "",
      target_warehouse_id: "",
      non_po_reason: undefined,
      explanation: "",
      notes: "",
      currency: "USD",
    },
  });

  const checkinType = form.watch("checkin_type");
  const selectedPOId = form.watch("purchase_order_id");

  // Reset items when switching check-in type
  useEffect(() => {
    setCheckInItems([]);
    if (checkinType === "po_based") {
      form.setValue("non_po_reason", undefined);
      form.setValue("explanation", "");
    } else {
      form.setValue("purchase_order_id", "");
    }
  }, [checkinType, form]);

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["products_for_inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Product[];
    },
  });

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses_for_inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Warehouse[];
    },
  });

  // Fetch approved/acknowledged POs for PO-based check-in
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchase_orders_for_checkin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          id,
          po_number,
          status,
          vendor:vendor_registrations(company_name)
        `)
        .in("status", ["approved", "acknowledged", "partially_received"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((po: any) => ({
        id: po.id,
        po_number: po.po_number,
        vendor_name: po.vendor?.company_name || "Unknown Vendor",
        status: po.status,
      })) as PurchaseOrder[];
    },
    enabled: checkinType === "po_based",
  });

  // Fetch PO items when a PO is selected
  const { data: poItems = [], isLoading: isLoadingPOItems } = useQuery({
    queryKey: ["po_items_for_checkin", selectedPOId],
    queryFn: async () => {
      if (!selectedPOId) return [];

      // Get PO items with product info
      const { data: items, error: itemsError } = await supabase
        .from("purchase_order_items")
        .select(`
          id,
          product_id,
          description,
          quantity,
          unit_price,
          products(name)
        `)
        .eq("po_id", selectedPOId);

      if (itemsError) throw itemsError;

      // Get already received quantities from approved GRN items
      const { data: grnItems, error: grnError } = await supabase
        .from("grn_items")
        .select(`
          po_item_id,
          quantity_accepted,
          goods_received_notes!inner(status)
        `)
        .in("goods_received_notes.status", ["approved"]);

      if (grnError) throw grnError;

      // Calculate received quantities per PO item
      const receivedByPOItem: Record<string, number> = {};
      (grnItems || []).forEach((grnItem: any) => {
        if (grnItem.po_item_id) {
          receivedByPOItem[grnItem.po_item_id] = 
            (receivedByPOItem[grnItem.po_item_id] || 0) + (grnItem.quantity_accepted || 0);
        }
      });

      return (items || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.products?.name || item.description || "Unknown Product",
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        already_received: receivedByPOItem[item.id] || 0,
      })) as POItem[];
    },
    enabled: !!selectedPOId && checkinType === "po_based",
  });

  // When PO items are loaded, populate the check-in items
  useEffect(() => {
    if (poItems.length > 0 && checkinType === "po_based") {
      const items: CheckInItem[] = poItems
        .filter((poItem) => poItem.quantity - poItem.already_received > 0) // Only items with pending qty
        .map((poItem) => ({
          id: crypto.randomUUID(),
          product_id: poItem.product_id,
          product_name: poItem.product_name,
          po_item_id: poItem.id,
          ordered_quantity: poItem.quantity,
          already_received: poItem.already_received,
          pending_quantity: poItem.quantity - poItem.already_received,
          check_in_quantity: poItem.quantity - poItem.already_received, // Default to pending qty
          batch_number: "",
          expiry_date: "",
          unit_price: poItem.unit_price,
          is_from_po: true,
        }));
      setCheckInItems(items);
    }
  }, [poItems, checkinType]);

  // Fetch organization settings for default currency
  const { data: orgSettings } = useQuery({
    queryKey: ["organization_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("base_currency")
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data;
    },
  });

  // Create inventory check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (values: CheckInFormValues) => {
      if (!userData?.id) {
        throw new Error("User not authenticated");
      }

      // Validate items
      if (checkInItems.length === 0) {
        throw new Error("At least one item is required for check-in");
      }

      const validItems = checkInItems.filter((item) => item.product_id && item.check_in_quantity > 0);
      if (validItems.length === 0) {
        throw new Error("No valid items to check in. Please ensure products are selected and quantities are greater than 0.");
      }

      // For non-PO based, validate explanation
      if (values.checkin_type === "non_po_based") {
        if (!values.non_po_reason) {
          throw new Error("Reason is required for non-PO based check-ins");
        }
        if (!values.explanation || values.explanation.trim().length < 10) {
          throw new Error("Detailed explanation (minimum 10 characters) is required for non-PO based check-ins");
        }

        // Validate unit prices for non-PO items
        const missingPrices = validItems.filter((item) => !item.unit_price || item.unit_price <= 0);
        if (missingPrices.length > 0) {
          throw new Error("Unit price is required for all items in non-PO based check-ins");
        }
      }

      // Validate quantities for PO-based
      if (values.checkin_type === "po_based") {
        for (const item of validItems) {
          if (item.pending_quantity && item.check_in_quantity > item.pending_quantity) {
            throw new Error(`Check-in quantity exceeds pending quantity for ${item.product_name}`);
          }
        }
      }

      // Build reference string
      let referenceStr = "";
      if (values.checkin_type === "non_po_based") {
        const reasonLabel = NON_PO_REASONS.find((r) => r.value === values.non_po_reason)?.label || values.non_po_reason;
        referenceStr = `Non-PO: ${reasonLabel}`;
      } else if (selectedPOId) {
        const selectedPO = purchaseOrders.find((po) => po.id === selectedPOId);
        referenceStr = selectedPO ? `PO: ${selectedPO.po_number}` : "";
      }

      // Build notes
      let notesStr = values.notes || "";
      if (values.checkin_type === "non_po_based" && values.explanation) {
        notesStr = `Reason: ${values.non_po_reason}\nExplanation: ${values.explanation}${notesStr ? `\n\nAdditional Notes: ${notesStr}` : ""}`;
      }

      const transactions = [];
      const inventoryUpdates = [];

      // Process each item
      for (const item of validItems) {
        // Create inventory transaction with batch/expiry in delivery_details
        const transaction = {
          type: "check_in",
          product_id: item.product_id,
          target_warehouse_id: values.target_warehouse_id,
          quantity: item.check_in_quantity,
          reference: referenceStr,
          notes: notesStr,
          user_id: userData.id,
          unit_price: item.unit_price || null,
          currency: values.currency || orgSettings?.base_currency || "USD",
          delivery_details: {
            batch_number: item.batch_number || null,
            expiry_date: item.expiry_date || null,
            po_item_id: item.po_item_id || null,
            checkin_type: values.checkin_type,
            non_po_reason: values.non_po_reason || null,
          },
        };

        const { data: transactionData, error: transactionError } = await supabase
          .from("inventory_transactions")
          .insert([transaction])
          .select();

        if (transactionError) throw transactionError;
        transactions.push(transactionData[0]);

        // Update inventory
        const { data: inventoryItem, error: inventoryError } = await supabase
          .from("inventory_items")
          .select("*")
          .eq("product_id", item.product_id)
          .eq("warehouse_id", values.target_warehouse_id)
          .maybeSingle();

        if (inventoryError) throw inventoryError;

        if (inventoryItem) {
          const { error: updateError } = await supabase
            .from("inventory_items")
            .update({
              quantity: inventoryItem.quantity + item.check_in_quantity,
              last_updated: new Date().toISOString(),
            })
            .eq("id", inventoryItem.id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from("inventory_items")
            .insert([
              {
                product_id: item.product_id,
                warehouse_id: values.target_warehouse_id,
                quantity: item.check_in_quantity,
                last_updated: new Date().toISOString(),
              },
            ]);

          if (insertError) throw insertError;
        }

        inventoryUpdates.push({
          product_id: item.product_id,
          quantity: item.check_in_quantity,
        });
      }

      // Create audit log entry
      const auditEntry = {
        user_id: userData.id,
        action: "inventory_check_in",
        entity_type: "inventory_transaction",
        entity_id: transactions[0]?.id || null,
        details: {
          checkin_type: values.checkin_type,
          purchase_order_id: values.purchase_order_id || null,
          warehouse_id: values.target_warehouse_id,
          items_count: validItems.length,
          total_quantity: validItems.reduce((sum, item) => sum + item.check_in_quantity, 0),
          items: validItems.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.check_in_quantity,
            batch_number: item.batch_number,
            expiry_date: item.expiry_date,
            po_item_id: item.po_item_id,
          })),
          non_po_reason: values.non_po_reason || null,
          explanation: values.explanation || null,
          reference: referenceStr,
        },
      };

      const { error: auditError } = await supabase
        .from("activity_logs")
        .insert([auditEntry]);

      if (auditError) {
        console.error("Failed to create audit log:", auditError);
        // Don't throw - audit log failure shouldn't block the transaction
      }

      return { transactions, inventoryUpdates };
    },
    onSuccess: (result) => {
      toast({
        title: "Success",
        description: `Successfully checked in ${result.transactions.length} item(s) to inventory`,
      });
      form.reset();
      setCheckInItems([]);
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_transactions"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record inventory check-in: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: CheckInFormValues) => {
    checkInMutation.mutate(values);
  };

  const totalQuantity = checkInItems.reduce((sum, item) => sum + (item.check_in_quantity || 0), 0);
  const validItemsCount = checkInItems.filter((item) => item.product_id && item.check_in_quantity > 0).length;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Check-in Type Selection */}
        <FormField
          control={form.control}
          name="checkin_type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Check-in Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors flex-1">
                    <RadioGroupItem value="po_based" id="po_based" />
                    <Label htmlFor="po_based" className="flex items-center gap-2 cursor-pointer flex-1">
                      <FileText className="h-4 w-4 text-primary" />
                      <div>
                        <div className="font-medium">PO Based</div>
                        <div className="text-xs text-muted-foreground">Check-in against Purchase Order</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors flex-1">
                    <RadioGroupItem value="non_po_based" id="non_po_based" />
                    <Label htmlFor="non_po_based" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Package className="h-4 w-4 text-warning-foreground" />
                      <div>
                        <div className="font-medium">Non-PO Based</div>
                        <div className="text-xs text-muted-foreground">Returns, corrections, found stock</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Common: Target Warehouse */}
        <FormField
          control={form.control}
          name="target_warehouse_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Warehouse *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target warehouse" />
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

        {/* PO-Based: PO Selection */}
        {checkinType === "po_based" && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Purchase Order Selection
            </h4>

            <FormField
              control={form.control}
              name="purchase_order_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Order *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a Purchase Order" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {purchaseOrders.map((po) => (
                        <SelectItem key={po.id} value={po.id}>
                          {po.po_number} - {po.vendor_name} ({po.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the PO to load line items for check-in
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Non-PO Based: Reason and Explanation */}
        {checkinType === "non_po_based" && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted">
            <h4 className="font-medium text-sm flex items-center gap-2 text-foreground">
              <AlertCircle className="h-4 w-4 text-warning-foreground" />
              Non-PO Check-in Details
            </h4>

            <Alert variant="default" className="border-warning bg-warning/20">
              <AlertCircle className="h-4 w-4 text-warning-foreground" />
              <AlertDescription className="text-warning-foreground">
                Non-PO based check-ins require a valid reason and detailed explanation for audit purposes.
              </AlertDescription>
            </Alert>

            <FormField
              control={form.control}
              name="non_po_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Check-in *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {NON_PO_REASONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          <div>
                            <div className="font-medium">{reason.label}</div>
                            <div className="text-xs text-muted-foreground">{reason.description}</div>
                          </div>
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
              name="explanation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detailed Explanation *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a detailed explanation for this check-in (minimum 10 characters)..."
                      className="min-h-[80px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Required for audit compliance
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Items Table */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Items for Check-in</h4>
          <CheckInItemsTable
            items={checkInItems}
            onItemsChange={setCheckInItems}
            products={products}
            isPOBased={checkinType === "po_based"}
            isLoading={isLoadingPOItems}
          />
        </div>

        {/* Additional Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional notes..."
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>Optional additional information</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Summary and Submit */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{validItemsCount}</span> item(s) • 
            Total Quantity: <span className="font-medium">{totalQuantity}</span>
          </div>
          <Button
            type="submit"
            disabled={checkInMutation.isPending || validItemsCount === 0}
          >
            {checkInMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Submit Check-in"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CheckInForm;
