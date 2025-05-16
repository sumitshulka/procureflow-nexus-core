
import React from "react";
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Define the transfer form schema
const transferSchema = z.object({
  inventory_item_id: z.string().min(1, "Source inventory item is required"),
  target_warehouse_id: z.string().min(1, "Target warehouse is required"),
  quantity: z.string().refine((val) => {
    const num = parseInt(val, 10);
    return !isNaN(num) && num > 0;
  }, "Quantity must be a positive number"),
  reference: z.string().optional(),
  notes: z.string().optional(),
})
.refine((data) => {
  const inventoryItemParts = data.inventory_item_id.split('|');
  if (inventoryItemParts.length === 2) {
    const sourceWarehouseId = inventoryItemParts[1];
    return sourceWarehouseId !== data.target_warehouse_id;
  }
  return true;
}, {
  message: "Source and target warehouses must be different",
  path: ["target_warehouse_id"],
});

type TransferFormValues = z.infer<typeof transferSchema>;

interface InventoryItem {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  product: {
    name: string;
  };
  warehouse: {
    name: string;
  };
  display_name?: string; // For select dropdown
  composite_id?: string; // Combination of id and warehouse_id for validation
}

interface Warehouse {
  id: string;
  name: string;
}

interface TransferFormProps {
  onSuccess: () => void;
}

const TransferForm: React.FC<TransferFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const { userData } = useAuth();
  const [maxQuantity, setMaxQuantity] = React.useState<number | null>(null);
  const [currentInventoryItem, setCurrentInventoryItem] = React.useState<InventoryItem | null>(null);
  const [sourceWarehouseId, setSourceWarehouseId] = React.useState<string | null>(null);

  // Define form
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      inventory_item_id: "",
      target_warehouse_id: "",
      quantity: "",
      reference: "",
      notes: "",
    },
  });

  // Fetch inventory items with stock
  const { data: inventoryItems = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ["inventory_items_for_transfer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(`
          id,
          product_id,
          warehouse_id,
          quantity,
          product:product_id(name),
          warehouse:warehouse_id(name)
        `)
        .gt("quantity", 0)
        .order("product_id");
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch inventory items",
          variant: "destructive",
        });
        throw error;
      }
      
      // Transform data for display
      const transformedData = data.map((item: InventoryItem) => ({
        ...item,
        display_name: `${item.product.name} - ${item.warehouse.name} (${item.quantity} available)`,
        composite_id: `${item.id}|${item.warehouse_id}`,
      }));
      
      return transformedData as InventoryItem[];
    },
  });

  // Fetch warehouses
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ["warehouses_for_transfer"],
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

  // Watch for inventory_item_id changes to update max quantity and source warehouse
  React.useEffect(() => {
    const inventoryItemCompositeId = form.watch("inventory_item_id");
    if (inventoryItemCompositeId) {
      const parts = inventoryItemCompositeId.split('|');
      if (parts.length === 2) {
        const inventoryItemId = parts[0];
        const warehouseId = parts[1];
        
        const selectedItem = inventoryItems.find(item => item.id === inventoryItemId);
        if (selectedItem) {
          setMaxQuantity(selectedItem.quantity);
          setCurrentInventoryItem(selectedItem);
          setSourceWarehouseId(warehouseId);
          
          // Reset target warehouse if it's the same as source warehouse
          const currentTargetWarehouse = form.getValues("target_warehouse_id");
          if (currentTargetWarehouse === warehouseId) {
            form.setValue("target_warehouse_id", "");
          }
        }
      }
    } else {
      setMaxQuantity(null);
      setCurrentInventoryItem(null);
      setSourceWarehouseId(null);
    }
  }, [form.watch("inventory_item_id"), inventoryItems, form]);

  // Create inventory transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (values: TransferFormValues) => {
      if (!userData?.id) {
        throw new Error("User not authenticated");
      }
      
      if (!currentInventoryItem) {
        throw new Error("No inventory item selected");
      }
      
      const quantity = parseInt(values.quantity, 10);
      
      // Validate quantity
      if (quantity > (maxQuantity || 0)) {
        throw new Error("Cannot transfer more than available quantity");
      }
      
      const parts = values.inventory_item_id.split('|');
      if (parts.length !== 2) {
        throw new Error("Invalid inventory item format");
      }
      
      const inventoryItemId = parts[0];
      const sourceWarehouseId = parts[1];
      
      if (sourceWarehouseId === values.target_warehouse_id) {
        throw new Error("Source and target warehouses must be different");
      }
      
      // Create the inventory transaction
      const transaction = {
        type: "transfer",
        product_id: currentInventoryItem.product_id,
        source_warehouse_id: sourceWarehouseId,
        target_warehouse_id: values.target_warehouse_id,
        quantity,
        reference: values.reference || null,
        notes: values.notes || null,
        user_id: userData.id,
      };
      
      const { data: transactionData, error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert([transaction])
        .select();
      
      if (transactionError) throw transactionError;

      // Update source inventory item
      const { error: updateSourceError } = await supabase
        .from("inventory_items")
        .update({
          quantity: currentInventoryItem.quantity - quantity,
          last_updated: new Date().toISOString(),
        })
        .eq("id", inventoryItemId);
      
      if (updateSourceError) throw updateSourceError;

      // Check if product exists in target warehouse inventory
      const { data: targetInventoryItem, error: targetInventoryError } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("product_id", currentInventoryItem.product_id)
        .eq("warehouse_id", values.target_warehouse_id)
        .maybeSingle();
      
      if (targetInventoryError) throw targetInventoryError;

      // Update or insert target inventory item
      if (targetInventoryItem) {
        // Update existing inventory item
        const { error: updateTargetError } = await supabase
          .from("inventory_items")
          .update({
            quantity: targetInventoryItem.quantity + quantity,
            last_updated: new Date().toISOString(),
          })
          .eq("id", targetInventoryItem.id);
        
        if (updateTargetError) throw updateTargetError;
      } else {
        // Insert new inventory item
        const { error: insertTargetError } = await supabase
          .from("inventory_items")
          .insert([
            {
              product_id: currentInventoryItem.product_id,
              warehouse_id: values.target_warehouse_id,
              quantity: quantity,
              last_updated: new Date().toISOString(),
            },
          ]);
        
        if (insertTargetError) throw insertTargetError;
      }
      
      return transactionData[0];
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory transfer recorded successfully",
      });
      form.reset();
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record inventory transfer: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: TransferFormValues) => {
    transferMutation.mutate(values);
  };

  // Filter out the source warehouse from target warehouse options
  const filteredWarehouses = warehouses.filter(
    warehouse => warehouse.id !== sourceWarehouseId
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="inventory_item_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source Inventory Item</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an inventory item" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.composite_id || ""}>
                      {item.display_name}
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
                    <SelectValue placeholder="Select a target warehouse" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredWarehouses.map((warehouse) => (
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
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter quantity"
                  {...field}
                  min="1"
                  max={maxQuantity?.toString()}
                />
              </FormControl>
              {maxQuantity !== null && (
                <FormDescription>
                  Maximum available: {maxQuantity}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference</FormLabel>
              <FormControl>
                <Input
                  placeholder="Transfer Reference Number"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>Optional reference information</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional notes"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>Optional additional information</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={transferMutation.isPending}>
            {transferMutation.isPending ? "Processing..." : "Transfer"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TransferForm;
