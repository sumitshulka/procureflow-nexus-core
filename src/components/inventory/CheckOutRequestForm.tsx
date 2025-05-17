
import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Input,
} from '@/components/ui/input';
import {
  Textarea,
} from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { createApprovalRequest } from '@/components/approval';
import ProcurementRequestSelector, { ProcurementRequest } from './ProcurementRequestSelector';
import { Link2, LinkIcon } from 'lucide-react';

const formSchema = z.object({
  product_id: z.string().min(1, "Product is required"),
  source_warehouse_id: z.string().min(1, "Warehouse is required"),
  quantity: z.number().positive("Quantity must be positive"),
  notes: z.string().optional(),
  reference: z.string().optional(),
});

interface CheckOutRequestFormProps {
  onSuccess: () => void;
}

const CheckOutRequestForm = ({ onSuccess }: CheckOutRequestFormProps) => {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [isRequestSelectorOpen, setIsRequestSelectorOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ProcurementRequest | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [requestItem, setRequestItem] = useState<{id: string, quantity: number} | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      notes: "",
      reference: "",
    },
  });

  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);
      
      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }
      return data || [];
    }
  });

  // Fetch warehouses
  const { data: warehouses, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('is_active', true);
      
      if (error) {
        console.error('Error fetching warehouses:', error);
        throw error;
      }
      return data || [];
    }
  });

  // Fetch inventory for the selected product and warehouse
  const watchedProduct = form.watch('product_id');
  const watchedWarehouse = form.watch('source_warehouse_id');
  
  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', watchedProduct, watchedWarehouse],
    enabled: !!watchedProduct && !!watchedWarehouse,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('product_id', watchedProduct)
        .eq('warehouse_id', watchedWarehouse)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching inventory:', error);
        throw error;
      }
      return data || { quantity: 0 };
    }
  });
  
  const availableQuantity = inventory?.quantity || 0;

  const handleProcurementRequestSelect = (request: ProcurementRequest) => {
    setSelectedRequest(request);
    setIsRequestSelectorOpen(false);
    
    if (request.items && request.items.length > 0) {
      // If only one product in the request, auto-select it
      if (request.items.length === 1) {
        const item = request.items[0];
        setSelectedProduct(item.product_id);
        setRequestItem({id: item.id, quantity: item.quantity});
        form.setValue('product_id', item.product_id);
        form.setValue('quantity', item.quantity);
        form.setValue('reference', `PR: ${request.request_number}`);
      }
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!userData?.id) {
        toast({ title: "Error", description: "User not authenticated", variant: "destructive" });
        return;
      }
      
      // Verify quantity is available
      if (values.quantity > availableQuantity) {
        toast({
          title: "Error",
          description: `Not enough quantity available. Available: ${availableQuantity}`,
          variant: "destructive"
        });
        return;
      }
      
      // Get product name for the approval title
      let productName = "Product";
      if (watchedProduct) {
        const product = products?.find(p => p.id === watchedProduct);
        if (product) {
          productName = product.name;
        }
      }
      
      // Create the checkout transaction
      const { data: transaction, error } = await supabase
        .from('inventory_transactions')
        .insert({
          type: 'check_out',
          product_id: values.product_id,
          source_warehouse_id: values.source_warehouse_id,
          quantity: values.quantity,
          user_id: userData.id,
          reference: values.reference || null,
          notes: values.notes || null,
          approval_status: 'pending', // Set as pending until approved
          request_id: selectedRequest?.id || null, // Link to procurement request if selected
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating checkout transaction:', error);
        throw error;
      }
      
      // Create approval request for the checkout
      if (transaction) {
        const approvalTitle = `Request to checkout ${values.quantity} of ${productName}`;
        
        const approvalResult = await createApprovalRequest(
          'inventory_checkout',
          transaction.id,
          userData.id,
          approvalTitle
        );
        
        if (!approvalResult.success) {
          toast({
            title: "Warning",
            description: "Transaction created but approval request failed: " + approvalResult.message,
            variant: "destructive"
          });
          // Continue since the transaction is created
        }
      }
      
      toast({
        title: "Success",
        description: "Checkout request submitted for approval",
      });
      
      form.reset();
      setSelectedRequest(null);
      setSelectedProduct(null);
      setRequestItem(null);
      onSuccess();
      
    } catch (error: any) {
      console.error('Error creating checkout request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout request",
        variant: "destructive"
      });
    }
  };

  return (
    <Form {...form}>
      <div className="mb-6">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => setIsRequestSelectorOpen(true)} 
          className="w-full flex items-center justify-center gap-2"
        >
          <LinkIcon className="h-4 w-4" />
          {selectedRequest ? `Linked to PR: ${selectedRequest.request_number}` : "Link to Procurement Request"}
        </Button>

        <ProcurementRequestSelector 
          isOpen={isRequestSelectorOpen}
          onOpenChange={setIsRequestSelectorOpen}
          onSelect={handleProcurementRequestSelect}
        />
        
        {selectedRequest && (
          <div className="mt-2 p-3 border rounded-md bg-muted/30">
            <p className="text-sm font-medium">Linked to procurement request: {selectedRequest.request_number}</p>
            <p className="text-sm text-muted-foreground">{selectedRequest.title}</p>
          </div>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="product_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product</FormLabel>
                <Select
                  disabled={productsLoading || !!selectedProduct}
                  onValueChange={(value) => {
                    field.onChange(value);
                    // If linked to request but this product doesn't match any request item,
                    // clear the request link
                    if (selectedRequest && !selectedRequest.items?.some(item => item.product_id === value)) {
                      setSelectedRequest(null);
                      setSelectedProduct(null);
                      setRequestItem(null);
                      form.setValue('reference', '');
                    }
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {products?.map((product) => (
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
                  disabled={warehousesLoading}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {warehouses?.map((warehouse) => (
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
                    min={1}
                    disabled={!!requestItem}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    value={field.value}
                  />
                </FormControl>
                {!inventoryLoading && watchedProduct && watchedWarehouse && (
                  <p className="text-xs text-muted-foreground">
                    Available: {availableQuantity}
                  </p>
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
                  <Input {...field} placeholder="Optional reference number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Add any additional notes about this checkout request"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={form.formState.isSubmitting || productsLoading || warehousesLoading}
          className="w-full"
        >
          {form.formState.isSubmitting ? "Submitting..." : "Submit Checkout Request"}
        </Button>
      </form>
    </Form>
  );
};

export default CheckOutRequestForm;
