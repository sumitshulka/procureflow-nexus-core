
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

// Define the check-in form schema
const checkInSchema = z.object({
  product_id: z.string().min(1, "Product is required"),
  target_warehouse_id: z.string().min(1, "Target warehouse is required"),
  quantity: z.string().refine((val) => {
    const num = parseInt(val, 10);
    return !isNaN(num) && num > 0;
  }, "Quantity must be a positive number"),
  reference: z.string().optional(),
  notes: z.string().optional(),
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

interface CheckInFormProps {
  onSuccess: () => void;
}

const CheckInForm: React.FC<CheckInFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const { userData } = useAuth();

  // Define form
  const form = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      product_id: "",
      target_warehouse_id: "",
      quantity: "",
      reference: "",
      notes: "",
    },
  });

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

  // Create inventory check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (values: CheckInFormValues) => {
      if (!userData?.id) {
        throw new Error("User not authenticated");
      }
      
      // Create the inventory transaction
      const transaction = {
        type: "check_in",
        product_id: values.product_id,
        target_warehouse_id: values.target_warehouse_id,
        quantity: parseInt(values.quantity, 10),
        reference: values.reference || null,
        notes: values.notes || null,
        user_id: userData.id,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="product_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product</FormLabel>
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
              <FormLabel>Target Warehouse</FormLabel>
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
              <FormLabel>Quantity</FormLabel>
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
        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference</FormLabel>
              <FormControl>
                <Input
                  placeholder="Purchase Order or Reference Number"
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
          <Button type="submit" disabled={checkInMutation.isPending}>
            {checkInMutation.isPending ? "Processing..." : "Check In"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CheckInForm;
