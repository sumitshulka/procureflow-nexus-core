
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

// Define the check-out form schema
const checkOutSchema = z.object({
  inventory_item_id: z.string().min(1, "Inventory item is required"),
  quantity: z.string().refine((val) => {
    const num = parseInt(val, 10);
    return !isNaN(num) && num > 0;
  }, "Quantity must be a positive number"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type CheckOutFormValues = z.infer<typeof checkOutSchema>;

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
}

interface CheckOutFormProps {
  onSuccess: () => void;
}

const CheckOutForm: React.FC<CheckOutFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const { userData } = useAuth();
  const [maxQuantity, setMaxQuantity] = React.useState<number | null>(null);
  const [currentInventoryItem, setCurrentInventoryItem] = React.useState<InventoryItem | null>(null);

  // Define form
  const form = useForm<CheckOutFormValues>({
    resolver: zodResolver(checkOutSchema),
    defaultValues: {
      inventory_item_id: "",
      quantity: "",
      reference: "",
      notes: "",
    },
  });

  // Fetch inventory items with stock
  const { data: inventoryItems = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ["inventory_items_with_stock"],
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
      }));
      
      return transformedData as InventoryItem[];
    },
  });

  // Watch for inventory_item_id changes to update max quantity
  React.useEffect(() => {
    const inventoryItemId = form.watch("inventory_item_id");
    if (inventoryItemId) {
      const selectedItem = inventoryItems.find(item => item.id === inventoryItemId);
      if (selectedItem) {
        setMaxQuantity(selectedItem.quantity);
        setCurrentInventoryItem(selectedItem);
      }
    } else {
      setMaxQuantity(null);
      setCurrentInventoryItem(null);
    }
  }, [form.watch("inventory_item_id"), inventoryItems]);

  // Create inventory check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async (values: CheckOutFormValues) => {
      if (!userData?.id) {
        throw new Error("User not authenticated");
      }
      
      if (!currentInventoryItem) {
        throw new Error("No inventory item selected");
      }
      
      const quantity = parseInt(values.quantity, 10);
      
      // Validate quantity
      if (quantity > (maxQuantity || 0)) {
        throw new Error("Cannot check out more than available quantity");
      }
      
      // Create the inventory transaction
      const transaction = {
        type: "check_out",
        product_id: currentInventoryItem.product_id,
        source_warehouse_id: currentInventoryItem.warehouse_id,
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

      // Update inventory item
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({
          quantity: currentInventoryItem.quantity - quantity,
          last_updated: new Date().toISOString(),
        })
        .eq("id", values.inventory_item_id);
      
      if (updateError) throw updateError;
      
      return transactionData[0];
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory check-out recorded successfully",
      });
      form.reset();
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record inventory check-out: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: CheckOutFormValues) => {
    checkOutMutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="inventory_item_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Inventory Item</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an inventory item" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
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
                  placeholder="Requisition or Reference Number"
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
          <Button type="submit" disabled={checkOutMutation.isPending}>
            {checkOutMutation.isPending ? "Processing..." : "Check Out"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CheckOutForm;
