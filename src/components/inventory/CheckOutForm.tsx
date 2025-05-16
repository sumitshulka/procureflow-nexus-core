
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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

  // Initialize form
  const form = useForm<ApprovalFormValues>({
    resolver: zodResolver(approvalFormSchema),
    defaultValues: {
      notes: "",
    },
  });

  // Fetch pending checkout requests
  const { data: pendingRequests = [], isLoading: isLoadingRequests } = useQuery({
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
          // Skip items with error in source_warehouse
          if (!item.source_warehouse || 
              typeof item.source_warehouse !== 'object' ||
              'error' in item.source_warehouse) {
            continue;
          }
          
          // Add item to valid requests with proper typing
          // Use a non-null assertion here as we've already checked it's not null above
          validRequests.push({
            ...item,
            source_warehouse: item.source_warehouse as { name: string }
          });
        }
        
        return validRequests;
      } catch (error) {
        console.error("Error fetching pending requests:", error);
        return [] as PendingCheckoutRequest[];
      }
    },
  });

  const onSubmit = async (data: ApprovalFormValues) => {
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userId = userData.user.id;
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
          return;
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
      }

      toast({
        title: "Success",
        description: `Checkout request ${data.approval_decision}`,
      });
      onSuccess();
    } catch (error) {
      console.error("Error processing checkout approval:", error);
      toast({
        title: "Error",
        description: "Failed to process checkout approval",
        variant: "destructive",
      });
    }
  };

  if (isLoadingRequests) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No pending checkout requests</AlertTitle>
        <AlertDescription>
          There are no checkout requests waiting for approval at this time.
        </AlertDescription>
      </Alert>
    );
  }

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
};

export default CheckOutForm;
