
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

// Define the form schema
const checkOutFormSchema = z.object({
  product_id: z.string({
    required_error: "Please select a product",
  }),
  source_warehouse_id: z.string({
    required_error: "Please select a warehouse",
  }),
  quantity: z.number({
    required_error: "Quantity is required",
  }).positive("Quantity must be positive"),
  request_id: z.string({
    required_error: "Please select a procurement request",
  }),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type CheckOutFormValues = z.infer<typeof checkOutFormSchema>;

interface CheckOutRequestFormProps {
  onSuccess: () => void;
}

const CheckOutRequestForm = ({ onSuccess }: CheckOutRequestFormProps) => {
  const { toast } = useToast();

  // Initialize form with react-hook-form and zod resolver
  const form = useForm<CheckOutFormValues>({
    resolver: zodResolver(checkOutFormSchema),
    defaultValues: {
      reference: "",
      notes: "",
    },
  });

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("is_active", true);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        });
        throw error;
      }
      return data || [];
    },
  });

  // Fetch warehouses
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name")
        .eq("is_active", true);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch warehouses",
          variant: "destructive",
        });
        throw error;
      }
      return data || [];
    },
  });

  // Fetch inventory for selected product and warehouse
  const productId = form.watch("product_id");
  const warehouseId = form.watch("source_warehouse_id");
  const { data: inventoryItem, isLoading: isLoadingInventory } = useQuery({
    queryKey: ["inventory_item", productId, warehouseId],
    queryFn: async () => {
      if (!productId || !warehouseId) return null;

      const { data, error } = await supabase
        .from("inventory_items")
        .select("quantity")
        .eq("product_id", productId)
        .eq("warehouse_id", warehouseId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned" - this is expected if no inventory exists
        toast({
          title: "Error",
          description: "Failed to fetch inventory information",
          variant: "destructive",
        });
        throw error;
      }

      return data || { quantity: 0 };
    },
    enabled: !!productId && !!warehouseId,
  });

  // Fetch procurement requests
  const { data: requests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ["procurement_requests"],
    queryFn: async () => {
      // This is a mock function - in a real app, you'd fetch from your procurement requests table
      // For now, we'll return some dummy data
      return [
        { id: "PR-2023-001", title: "Office Supplies Request" },
        { id: "PR-2023-002", title: "IT Equipment Request" },
        { id: "PR-2023-003", title: "Marketing Materials Request" },
      ];
    },
  });

  const onSubmit = async (data: CheckOutFormValues) => {
    try {
      // Get the current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      const userId = userData.user.id;

      // Create the checkout request in the inventory_transactions table
      const { error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert({
          type: "check_out",
          product_id: data.product_id,
          source_warehouse_id: data.source_warehouse_id,
          quantity: data.quantity,
          reference: data.reference || null,
          notes: data.notes || null,
          user_id: userId,
          request_id: data.request_id,
          approval_status: "pending", // All checkouts start as pending
        });

      if (transactionError) throw transactionError;

      // Success! Call the onSuccess callback
      onSuccess();
    } catch (error) {
      console.error("Error creating checkout request:", error);
      toast({
        title: "Error",
        description: "Failed to create checkout request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isLoading = isLoadingProducts || isLoadingWarehouses || isLoadingInventory || isLoadingRequests;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Create Checkout Request</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Submit a request to check out items from inventory. Your request will be reviewed based on approval levels.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="request_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Procurement Request</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a request" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {requests.map((request) => (
                          <SelectItem key={request.id} value={request.id}>
                            {request.id} - {request.title}
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
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
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
                name="source_warehouse_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Warehouse</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
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
                        {...field}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                      />
                    </FormControl>
                    {inventoryItem && (
                      <p className="text-xs text-muted-foreground">
                        Available: {inventoryItem.quantity}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
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
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 flex justify-end">
              <Button type="submit">Submit Checkout Request</Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};

export default CheckOutRequestForm;
