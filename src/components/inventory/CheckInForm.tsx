import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { AlertCircle, Package, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define the check-in form schema
const checkInSchema = z.object({
  checkin_type: z.enum(["po_based", "non_po_based"]),
  // PO-based fields
  purchase_order_id: z.string().optional(),
  grn_id: z.string().optional(),
  // Non-PO based fields
  non_po_reason: z.enum(["return", "correction", "found_stock", "transfer_in", "other"]).optional(),
  explanation: z.string().optional(),
  // Common fields
  product_id: z.string().min(1, "Product is required"),
  target_warehouse_id: z.string().min(1, "Target warehouse is required"),
  quantity: z.string().refine((val) => {
    const num = parseInt(val, 10);
    return !isNaN(num) && num > 0;
  }, "Quantity must be a positive number"),
  reference: z.string().optional(),
  notes: z.string().optional(),
  unit_price: z.string().optional(),
  currency: z.string().default("USD"),
}).refine((data) => {
  // If non-PO based, require reason and explanation
  if (data.checkin_type === "non_po_based") {
    if (!data.non_po_reason) return false;
    if (!data.explanation || data.explanation.trim().length < 10) return false;
  }
  return true;
}, {
  message: "For non-PO based check-ins, reason and detailed explanation (min 10 characters) are required",
  path: ["explanation"],
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

interface GRN {
  id: string;
  grn_number: string;
  status: string;
  purchase_order_id: string;
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
  const [showPriceFields, setShowPriceFields] = useState(false);

  // Define form
  const form = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      checkin_type: "po_based",
      product_id: "",
      target_warehouse_id: "",
      quantity: "",
      reference: "",
      notes: "",
      unit_price: "",
      currency: "USD",
      non_po_reason: undefined,
      explanation: "",
      purchase_order_id: "",
      grn_id: "",
    },
  });

  const checkinType = form.watch("checkin_type");
  const selectedPOId = form.watch("purchase_order_id");
  const referenceValue = form.watch("reference");

  React.useEffect(() => {
    // Show price fields if non-PO based or no reference is provided
    setShowPriceFields(checkinType === "non_po_based" || (!referenceValue || referenceValue.trim() === ""));
  }, [referenceValue, checkinType]);

  // Reset fields when switching check-in type
  React.useEffect(() => {
    if (checkinType === "po_based") {
      form.setValue("non_po_reason", undefined);
      form.setValue("explanation", "");
    } else {
      form.setValue("purchase_order_id", "");
      form.setValue("grn_id", "");
    }
  }, [checkinType, form]);

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products_for_inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        });
        throw error;
      }

      return data as Product[];
    },
  });

  // Fetch warehouses
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ["warehouses_for_inventory"],
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

  // Fetch GRNs for selected PO
  const { data: grns = [] } = useQuery({
    queryKey: ["grns_for_po", selectedPOId],
    queryFn: async () => {
      if (!selectedPOId) return [];
      
      const { data, error } = await supabase
        .from("goods_received_notes")
        .select("id, grn_number, status, purchase_order_id")
        .eq("purchase_order_id", selectedPOId)
        .in("status", ["approved", "pending_approval"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as GRN[];
    },
    enabled: !!selectedPOId && checkinType === "po_based",
  });

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

      // For non-PO based, validate explanation
      if (values.checkin_type === "non_po_based") {
        if (!values.non_po_reason) {
          throw new Error("Reason is required for non-PO based check-ins");
        }
        if (!values.explanation || values.explanation.trim().length < 10) {
          throw new Error("Detailed explanation (minimum 10 characters) is required for non-PO based check-ins");
        }
      }

      // Validate price input if showing price fields
      if (showPriceFields && (!values.unit_price || parseFloat(values.unit_price) <= 0)) {
        throw new Error("Unit price is required when no purchase order reference is provided");
      }

      // Build reference string
      let referenceStr = values.reference || "";
      if (values.checkin_type === "non_po_based") {
        const reasonLabel = NON_PO_REASONS.find(r => r.value === values.non_po_reason)?.label || values.non_po_reason;
        referenceStr = `Non-PO: ${reasonLabel}`;
      } else if (values.purchase_order_id) {
        const selectedPO = purchaseOrders.find(po => po.id === values.purchase_order_id);
        referenceStr = selectedPO ? `PO: ${selectedPO.po_number}` : referenceStr;
        if (values.grn_id) {
          const selectedGRN = grns.find(g => g.id === values.grn_id);
          if (selectedGRN) {
            referenceStr += ` | GRN: ${selectedGRN.grn_number}`;
          }
        }
      }

      // Build notes with explanation for non-PO based
      let notesStr = values.notes || "";
      if (values.checkin_type === "non_po_based" && values.explanation) {
        notesStr = `Reason: ${values.non_po_reason}\nExplanation: ${values.explanation}${notesStr ? `\n\nAdditional Notes: ${notesStr}` : ""}`;
      }

      // Create the inventory transaction
      const transaction = {
        type: "check_in",
        product_id: values.product_id,
        target_warehouse_id: values.target_warehouse_id,
        quantity: parseInt(values.quantity, 10),
        reference: referenceStr || null,
        notes: notesStr || null,
        user_id: userData.id,
        unit_price: showPriceFields && values.unit_price ? parseFloat(values.unit_price) : null,
        currency: values.currency || orgSettings?.base_currency || "USD",
      };

      const { data: transactionData, error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert([transaction])
        .select();

      if (transactionError) throw transactionError;

      // Check if product exists in inventory
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("product_id", values.product_id)
        .eq("warehouse_id", values.target_warehouse_id)
        .maybeSingle();

      if (inventoryError) throw inventoryError;

      // Update or insert inventory item
      if (inventoryItem) {
        // Update existing inventory item
        const { error: updateError } = await supabase
          .from("inventory_items")
          .update({
            quantity: inventoryItem.quantity + parseInt(values.quantity, 10),
            last_updated: new Date().toISOString(),
          })
          .eq("id", inventoryItem.id);

        if (updateError) throw updateError;
      } else {
        // Insert new inventory item
        const { error: insertError } = await supabase
          .from("inventory_items")
          .insert([
            {
              product_id: values.product_id,
              warehouse_id: values.target_warehouse_id,
              quantity: parseInt(values.quantity, 10),
              last_updated: new Date().toISOString(),
            },
          ]);

        if (insertError) throw insertError;
      }

      return transactionData[0];
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory check-in recorded successfully",
      });
      form.reset();
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
                        <div className="text-xs text-muted-foreground">Check-in against Purchase Order/GRN</div>
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

        {/* PO-Based Fields */}
        {checkinType === "po_based" && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Purchase Order Details
            </h4>
            
            <FormField
              control={form.control}
              name="purchase_order_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Order</FormLabel>
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
                  <FormDescription>Select the PO this check-in is associated with</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedPOId && grns.length > 0 && (
              <FormField
                control={form.control}
                name="grn_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goods Received Note (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a GRN (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {grns.map((grn) => (
                          <SelectItem key={grn.id} value={grn.id}>
                            {grn.grn_number} ({grn.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Link to a specific GRN if available</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {/* Non-PO Based Fields */}
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
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Explain why this inventory is being checked in without a Purchase Order. 
                    This is required for audit compliance.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Common Fields */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="product_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
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
                <FormLabel>Target Warehouse *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a warehouse" />
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
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter quantity"
                    {...field}
                    min="1"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {checkinType === "po_based" && (
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Reference</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Invoice number, delivery note, etc."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>Optional additional reference information</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {showPriceFields && (
            <>
              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter unit price"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      {checkinType === "non_po_based" 
                        ? "Required for non-PO based check-ins"
                        : "Required when no purchase order reference is provided"
                      }
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="INR">INR</SelectItem>
                        <SelectItem value="JPY">JPY</SelectItem>
                        <SelectItem value="CNY">CNY</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="AUD">AUD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

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
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="submit" disabled={checkInMutation.isPending}>
            {checkInMutation.isPending ? "Processing..." : "Check In"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CheckInForm;
