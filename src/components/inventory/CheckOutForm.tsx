
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle, Package, TruckIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import DeliveryDetailsForm from "./DeliveryDetailsForm";

// Define interface for checkout request data without recursive types
interface PendingCheckoutRequest {
  id: string;
  product_id: string;
  source_warehouse_id: string;
  quantity: number;
  reference: string | null;
  request_id: string | null;
  transaction_date: string;
  notes: string | null;
  approval_status: string;
  product: {
    name: string;
  };
  source_warehouse: {
    name: string;
  } | null;
  delivery_status?: string;
}

// Define the form schema for the approval form
const approvalFormSchema = z.object({
  transaction_id: z.string({
    required_error: "Please select a checkout request",
  }),
  approval_decision: z.enum(["approved", "rejected"]),
  notes: z.string().optional(),
});

type ApprovalFormValues = z.infer<typeof approvalFormSchema>;

// This component is now for approving checkout requests, not creating them
const CheckOutForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();
  const [isAutoApproving, setIsAutoApproving] = React.useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = React.useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = React.useState<string | null>(null);
  const [approvedTransactions, setApprovedTransactions] = React.useState<string[]>([]);

  // Initialize form
  const form = useForm<ApprovalFormValues>({
    resolver: zodResolver(approvalFormSchema),
    defaultValues: {
      notes: "",
    },
  });

  // Fetch pending checkout requests
  const { data: pendingRequests = [], isLoading: isLoadingRequests, refetch: refetchRequests } = useQuery({
    queryKey: ["pending_checkout_requests"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("inventory_transactions")
          .select(`
            id,
            product_id,
            source_warehouse_id,
            quantity,
            reference,
            request_id,
            transaction_date,
            notes,
            approval_status,
            delivery_status,
            product:product_id(name),
            source_warehouse:source_warehouse_id(name)
          `)
          .eq("type", "check_out")
          .eq("approval_status", "pending")
          .order("transaction_date", { ascending: false });

        if (error) {
          toast({
            title: "Error",
            description: "Failed to fetch pending checkout requests",
            variant: "destructive",
          });
          throw error;
        }
        
        // Filter out any items where source_warehouse has an error
        const rawData = data || [];
        
        // First filter our data and cast properly
        const validRequests: PendingCheckoutRequest[] = [];
        
        for (const item of rawData) {
          // Safely handle null and undefined by using a default empty object
          const sourceObj = item.source_warehouse || {};
          
          // First determine if we have a proper object with a name
          let warehouseName: string | null = null;
          
          // Only try to access properties if we have a non-null object
          if (
            typeof sourceObj === 'object' && 
            sourceObj !== null &&
            'name' in sourceObj && 
            typeof sourceObj.name === 'string'
          ) {
            warehouseName = sourceObj.name;
          }
          
          // Push to valid requests with properly formatted data
          validRequests.push({
            ...item,
            source_warehouse: warehouseName ? { name: warehouseName } : null
          });
        }
        
        return validRequests;
      } catch (error) {
        console.error("Error fetching pending requests:", error);
        return [] as PendingCheckoutRequest[];
      }
    },
  });

  // Fetch approved checkout requests that need delivery details
  const { data: approvedRequests = [], isLoading: isLoadingApprovedRequests } = useQuery({
    queryKey: ["approved_checkout_requests_no_delivery"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("inventory_transactions")
          .select(`
            id,
            product_id,
            source_warehouse_id,
            quantity,
            reference,
            request_id,
            transaction_date,
            notes,
            approval_status,
            delivery_status,
            product:product_id(name),
            source_warehouse:source_warehouse_id(name)
          `)
          .eq("type", "check_out")
          .eq("approval_status", "approved")
          .or("delivery_status.is.null,delivery_status.eq.pending")
          .order("transaction_date", { ascending: false });

        if (error) {
          console.error("Error fetching approved checkout requests:", error);
          return [] as PendingCheckoutRequest[];
        }

        // Process data similar to pendingRequests
        const validRequests: PendingCheckoutRequest[] = [];
        
        for (const item of data || []) {
          const sourceObj = item.source_warehouse || {};
          let warehouseName: string | null = null;
          
          if (
            typeof sourceObj === 'object' && 
            sourceObj !== null &&
            'name' in sourceObj && 
            typeof sourceObj.name === 'string'
          ) {
            warehouseName = sourceObj.name;
          }
          
          validRequests.push({
            ...item,
            source_warehouse: warehouseName ? { name: warehouseName } : null
          });
        }
        
        return validRequests;
      } catch (error) {
        console.error("Error fetching approved requests:", error);
        return [] as PendingCheckoutRequest[];
      }
    },
  });

  // Auto-approval for admins and procurement officers
  React.useEffect(() => {
    const autoApproveRequests = async () => {
      // Check if the user is an admin or procurement officer
      const isAdmin = hasRole(UserRole.ADMIN);
      const isProcurementOfficer = hasRole(UserRole.PROCUREMENT_OFFICER);
      
      if (pendingRequests.length > 0 && (isAdmin || isProcurementOfficer) && !isAutoApproving) {
        setIsAutoApproving(true);
        
        // Allow auto-approval if user is an admin
        if (isAdmin) {
          try {
            toast({
              title: "Auto-approval",
              description: "As an admin, your checkout requests can be automatically approved.",
            });
            
            // Loop through all pending requests and approve them
            for (const request of pendingRequests) {
              if (request.id) {
                await processApproval({
                  transaction_id: request.id,
                  approval_decision: "approved",
                  notes: "Auto-approved by admin"
                });
              }
            }
            
            // Refresh the pending requests
            refetchRequests();
          } catch (error) {
            console.error("Error during auto-approval:", error);
          } finally {
            setIsAutoApproving(false);
          }
        } else {
          setIsAutoApproving(false);
        }
      }
    };
    
    autoApproveRequests();
  }, [pendingRequests, hasRole, refetchRequests]);

  const processApproval = async (data: ApprovalFormValues) => {
    try {
      // Get current user
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      const userId = user.id;
      const selectedRequest = pendingRequests.find(req => req.id === data.transaction_id);
      
      if (!selectedRequest) {
        throw new Error("Selected request not found");
      }

      // Update the transaction approval status
      const { error: updateError } = await supabase
        .from("inventory_transactions")
        .update({
          approval_status: data.approval_decision,
          notes: data.notes ? `${selectedRequest.notes || ''}\n\nApproval note: ${data.notes}` : selectedRequest.notes
        })
        .eq("id", data.transaction_id);

      if (updateError) throw updateError;

      // If approved, update inventory
      if (data.approval_decision === "approved") {
        // Check if we have enough inventory
        const { data: inventoryData, error: inventoryError } = await supabase
          .from("inventory_items")
          .select("quantity")
          .eq("warehouse_id", selectedRequest.source_warehouse_id)
          .eq("product_id", selectedRequest.product_id)
          .single();
          
        if (inventoryError) throw inventoryError;

        if (!inventoryData || inventoryData.quantity < selectedRequest.quantity) {
          toast({
            title: "Error",
            description: "Not enough inventory available for this checkout",
            variant: "destructive",
          });
          return false;
        }

        // Update inventory
        const { error: updateInventoryError } = await supabase
          .from("inventory_items")
          .update({
            quantity: inventoryData.quantity - selectedRequest.quantity,
            last_updated: new Date().toISOString(),
          })
          .eq("warehouse_id", selectedRequest.source_warehouse_id)
          .eq("product_id", selectedRequest.product_id);

        if (updateInventoryError) throw updateInventoryError;
        
        // Add this transaction to the approved list
        setApprovedTransactions(prev => [...prev, data.transaction_id]);
      }

      // Only show toast for manual approvals
      if (!isAutoApproving) {
        toast({
          title: "Success",
          description: `Checkout request ${data.approval_decision}`,
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["pending_checkout_requests"] });
        queryClient.invalidateQueries({ queryKey: ["approved_checkout_requests_no_delivery"] });
        queryClient.invalidateQueries({ queryKey: ["inventory_transactions"] });
        queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
        
        onSuccess();
      }
      
      return true;
    } catch (error) {
      console.error("Error processing checkout approval:", error);
      toast({
        title: "Error",
        description: "Failed to process checkout approval",
        variant: "destructive",
      });
      return false;
    }
  }

  const onSubmit = async (data: ApprovalFormValues) => {
    await processApproval(data);
  };

  const handleDeliveryRecord = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    setShowDeliveryForm(true);
  };

  const handleDeliverySuccess = () => {
    setShowDeliveryForm(false);
    setSelectedTransactionId(null);
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["approved_checkout_requests_no_delivery"] });
    queryClient.invalidateQueries({ queryKey: ["inventory_transactions"] });
    toast({
      title: "Success",
      description: "Delivery information has been recorded successfully",
    });
    onSuccess();
  };

  if (isLoadingRequests || isLoadingApprovedRequests) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show delivery form if needed
  if (showDeliveryForm && selectedTransactionId) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-medium">Record Delivery Details</h2>
        <p className="text-sm text-muted-foreground">
          Enter the recipient and delivery information for this checkout.
        </p>
        <DeliveryDetailsForm 
          transactionId={selectedTransactionId} 
          onSuccess={handleDeliverySuccess}
          onCancel={() => setShowDeliveryForm(false)}
        />
      </div>
    );
  }

  // Display approval form if there are pending requests
  if (pendingRequests.length > 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium">Approve Checkout Requests</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve or reject pending checkout requests.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="transaction_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Checkout Request</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a checkout request" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pendingRequests.map((request) => (
                        <SelectItem key={request.id} value={request.id}>
                          {request.product.name} - {request.quantity} units from {request.source_warehouse?.name || 'Unknown location'}
                          {request.request_id ? ` (${request.request_id})` : ''}
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
              name="approval_decision"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decision</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your decision" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="approved">Approve</SelectItem>
                      <SelectItem value="rejected">Reject</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Textarea {...field} placeholder="Add any notes about this decision..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 flex justify-end">
              <Button type="submit">Process Request</Button>
            </div>
          </form>
        </Form>
      </div>
    );
  }
  
  // Display delivery recording section if there are approved requests without delivery details
  if (approvedRequests.length > 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium">Record Delivery Information</h2>
          <p className="text-sm text-muted-foreground mt-1">
            The following items have been approved for checkout but need delivery information.
          </p>
        </div>
        
        <div className="space-y-4">
          {approvedRequests.map((request) => (
            <div 
              key={request.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-background"
            >
              <div>
                <p className="font-medium">{request.product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {request.quantity} units from {request.source_warehouse?.name || 'Unknown location'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {request.request_id ? `Request ID: ${request.request_id}` : 'No request ID'}
                </p>
              </div>
              <Button 
                onClick={() => handleDeliveryRecord(request.id)}
                className="flex items-center gap-2"
              >
                <TruckIcon className="h-4 w-4" />
                Record Delivery
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If no pending requests and no approved requests without delivery
  return (
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>No pending actions</AlertTitle>
      <AlertDescription>
        There are no checkout requests waiting for approval or delivery information at this time.
      </AlertDescription>
    </Alert>
  );
};

export default CheckOutForm;
