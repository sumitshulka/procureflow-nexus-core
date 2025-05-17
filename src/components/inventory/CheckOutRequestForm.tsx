
import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { createApprovalRequest } from '@/components/approval';
import ProcurementRequestSelector, { ProcurementRequest, ProcurementRequestItem } from './ProcurementRequestSelector';
import { Link2, LinkIcon, CheckCircle, AlertCircle, ShoppingCart, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

const formSchema = z.object({
  source_warehouse_id: z.string().min(1, "Warehouse is required"),
  notes: z.string().optional(),
  reference: z.string().optional(),
});

interface RequestItemWithAvailability extends ProcurementRequestItem {
  available: number;
  availableForCheckout: boolean;
  selected: boolean;
}

interface CheckOutRequestFormProps {
  onSuccess: () => void;
}

const CheckOutRequestForm = ({ onSuccess }: CheckOutRequestFormProps) => {
  const { userData } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRequestSelectorOpen, setIsRequestSelectorOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ProcurementRequest | null>(null);
  const [requestItems, setRequestItems] = useState<RequestItemWithAvailability[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRfpDialog, setShowRfpDialog] = useState(false);
  const [itemsForRfp, setItemsForRfp] = useState<RequestItemWithAvailability[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: "",
      reference: "",
    },
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

  const watchedWarehouse = form.watch('source_warehouse_id');
  
  // Check inventory levels for all items when warehouse changes
  React.useEffect(() => {
    const checkInventoryLevels = async () => {
      if (!watchedWarehouse || !selectedRequest || !requestItems.length) return;
      
      // Get all product IDs from request items
      const productIds = requestItems.map(item => item.product_id);
      
      try {
        // Fetch inventory levels for all products in the selected warehouse
        const { data, error } = await supabase
          .from('inventory_items')
          .select('product_id, quantity')
          .eq('warehouse_id', watchedWarehouse)
          .in('product_id', productIds);
        
        if (error) throw error;
        
        // Create inventory map for easy lookup
        const inventoryMap = (data || []).reduce((map: Record<string, number>, item) => {
          map[item.product_id] = item.quantity;
          return map;
        }, {});
        
        // Update request items with availability information
        const updatedItems = requestItems.map(item => ({
          ...item,
          available: inventoryMap[item.product_id] || 0,
          availableForCheckout: (inventoryMap[item.product_id] || 0) >= item.quantity,
          selected: (inventoryMap[item.product_id] || 0) >= item.quantity // Auto-select items that are available
        }));
        
        setRequestItems(updatedItems);
      } catch (error) {
        console.error('Error checking inventory levels:', error);
      }
    };
    
    checkInventoryLevels();
  }, [watchedWarehouse, selectedRequest, requestItems.length]);

  const handleProcurementRequestSelect = async (request: ProcurementRequest) => {
    setSelectedRequest(request);
    setIsRequestSelectorOpen(false);
    
    if (request.items && request.items.length > 0) {
      // Initialize all items with default availability values
      const initialItems: RequestItemWithAvailability[] = request.items.map(item => ({
        ...item,
        available: 0,
        availableForCheckout: false,
        selected: false
      }));
      
      setRequestItems(initialItems);
      form.setValue('reference', `PR: ${request.request_number}`);
    }
  };

  const toggleItemSelection = (index: number) => {
    const updatedItems = [...requestItems];
    updatedItems[index].selected = !updatedItems[index].selected;
    setRequestItems(updatedItems);
  };

  const handleCreateRfp = async () => {
    // Get items that are not available and selected for RFP
    const itemsForRfp = requestItems.filter(item => !item.availableForCheckout && item.selected);
    
    if (itemsForRfp.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to include in the RFP",
        variant: "destructive"
      });
      return;
    }
    
    setItemsForRfp(itemsForRfp);
    setShowRfpDialog(true);
  };
  
  const confirmCreateRfp = async () => {
    if (!userData?.id || !selectedRequest) return;
    
    try {
      // In a real implementation, you would create an RFP with the selected items
      // This is a placeholder for the actual RFP creation logic
      
      // For now, we'll just show a toast notification
      toast({
        title: "RFP Creation",
        description: `RFP creation initiated for ${itemsForRfp.length} items from request ${selectedRequest.request_number}`,
      });
      
      // Close the dialog
      setShowRfpDialog(false);
      
      // Navigate to RFP page or show confirmation as needed
      // This would be implemented based on the application's flow
    } catch (error: any) {
      console.error('Error creating RFP:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create RFP",
        variant: "destructive"
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!userData?.id || !selectedRequest) {
        toast({ title: "Error", description: "User not authenticated or no request selected", variant: "destructive" });
        return;
      }
      
      // Get items selected for checkout that are available
      const itemsToCheckout = requestItems.filter(item => item.selected && item.availableForCheckout);
      
      if (itemsToCheckout.length === 0) {
        toast({
          title: "No items to check out",
          description: "Please select at least one available item to check out",
          variant: "destructive"
        });
        return;
      }
      
      setIsSubmitting(true);
      
      // Process each item as a separate checkout transaction
      for (const item of itemsToCheckout) {
        // Create the checkout transaction
        const { data: transaction, error } = await supabase
          .from('inventory_transactions')
          .insert({
            type: 'check_out',
            product_id: item.product_id,
            source_warehouse_id: values.source_warehouse_id,
            quantity: item.quantity,
            user_id: userData.id,
            reference: `PR: ${selectedRequest.request_number}`,
            notes: values.notes || `Checkout for procurement request: ${selectedRequest.request_number}`,
            approval_status: 'pending', // Set as pending until approved
            request_id: selectedRequest.id, // Link to procurement request
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error creating checkout transaction:', error);
          throw error;
        }
        
        // Create approval request for the checkout
        if (transaction) {
          const approvalTitle = `Request to checkout ${item.quantity} of ${item.product_name}`;
          
          const approvalResult = await createApprovalRequest(
            'inventory_checkout',
            transaction.id,
            userData.id,
            approvalTitle
          );
          
          if (!approvalResult.success) {
            console.warn(`Transaction created but approval request failed: ${approvalResult.message}`);
            // Continue since the transaction is created
          }
        }
      }
      
      toast({
        title: "Success",
        description: `Checkout requests submitted for ${itemsToCheckout.length} items from request ${selectedRequest.request_number}`,
      });
      
      // Reset form and state
      form.reset();
      setSelectedRequest(null);
      setRequestItems([]);
      queryClient.invalidateQueries({ queryKey: ['inventory_transactions'] });
      onSuccess();
      
    } catch (error: any) {
      console.error('Error creating checkout requests:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout requests",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
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
            <p className="text-xs text-muted-foreground mt-1">Department: {selectedRequest.department || 'N/A'}</p>
          </div>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

        {selectedRequest && requestItems.length > 0 && watchedWarehouse && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Request Items</CardTitle>
              <CardDescription>
                Select the items you want to check out or move to RFP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Select</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-[100px] text-center">Quantity</TableHead>
                      <TableHead className="w-[100px] text-center">Available</TableHead>
                      <TableHead className="w-[150px] text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestItems.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => toggleItemSelection(index)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-xs text-muted-foreground">{item.product_id}</div>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-center">{item.available}</TableCell>
                        <TableCell className="text-center">
                          {item.availableForCheckout ? (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Insufficient Stock
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateRfp}
                  disabled={!requestItems.some(item => !item.availableForCheckout && item.selected)}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Create RFP for Selected Unavailable Items
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
          disabled={isSubmitting || warehousesLoading || !selectedRequest || !requestItems.some(item => item.selected && item.availableForCheckout)}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            "Submit Checkout Request"
          )}
        </Button>
      </form>

      <AlertDialog open={showRfpDialog} onOpenChange={setShowRfpDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create RFP for Unavailable Items</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to create a new RFP (Request for Proposal) for {itemsForRfp.length} items that are not available in inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 max-h-[200px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsForRfp.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCreateRfp}>
              Create RFP
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
};

export default CheckOutRequestForm;

