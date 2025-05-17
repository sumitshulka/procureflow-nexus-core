
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProcurementRequest, InventoryTransaction } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const checkOutFormSchema = z.object({
  procurement_request_id: z.string().min(1, "Procurement Request is required"),
  notes: z.string().optional(),
});

type CheckOutFormValues = z.infer<typeof checkOutFormSchema>;

interface CheckOutFormProps {
  productId: string;
  onSuccess: (transaction: InventoryTransaction) => void;
  onCancel: () => void;
}

const CheckOutForm = ({ productId, onSuccess, onCancel }: CheckOutFormProps) => {
  const [availableRequests, setAvailableRequests] = useState<ProcurementRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    handleSubmit,
    register,
    formState: { errors },
    reset
  } = useForm<CheckOutFormValues>({
    resolver: zodResolver(checkOutFormSchema),
    defaultValues: {
      procurement_request_id: "",
      notes: "",
    },
  });

  // Modify the fetchProcurementRequests function to filter out completed requests
  const fetchProcurementRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('procurement_requests')
        .select('id, request_number, title, description, requester_id, status, priority, date_created, date_needed')
        .in('status', ['approved'])
        .order('date_created', { ascending: false });
    
      if (error) throw error;
    
      // Type assertion to ensure data matches ProcurementRequest[]
      const typedData: ProcurementRequest[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        requesterId: item.requester_id,
        status: item.status,
        priority: item.priority,
        dateCreated: item.date_created,
        dateNeeded: item.date_needed,
        items: [],
        approvalChain: [],
        totalEstimatedValue: 0
      }));
      
      setAvailableRequests(typedData);
    } catch (err) {
      console.error('Error fetching procurement requests:', err);
      toast({
        title: 'Error',
        description: 'Could not load procurement requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcurementRequests();
  }, []);

  const onSubmit = async (data: CheckOutFormValues) => {
    setIsSubmitting(true);
    try {
      const { procurement_request_id, notes } = data;

      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Perform the checkout transaction
      const { data: transactionData, error } = await supabase
        .from('inventory_transactions')
        .insert({
          type: 'check_out',
          product_id: productId,
          quantity: 1, // Assuming a quantity of 1 for checkout
          reference: 'procurement_request',
          transaction_date: new Date().toISOString(),
          request_id: procurement_request_id,
          notes: notes,
          approval_status: 'approved', // Assuming auto-approval for checkouts
          delivery_status: 'pending',
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Convert the Supabase response to match InventoryTransaction type
      const inventoryTransaction: InventoryTransaction = {
        id: transactionData.id,
        type: transactionData.type,
        productId: transactionData.product_id,
        quantity: transactionData.quantity,
        reference: transactionData.reference || '',
        date: transactionData.transaction_date || '',
        userId: transactionData.user_id,
        comments: transactionData.notes,
        // Include the database field names
        product_id: transactionData.product_id,
        transaction_date: transactionData.transaction_date,
        user_id: transactionData.user_id,
        request_id: transactionData.request_id,
        approval_status: transactionData.approval_status,
        notes: transactionData.notes,
        delivery_status: transactionData.delivery_status,
        delivery_details: transactionData.delivery_details,
        source_warehouse_id: transactionData.source_warehouse_id,
        target_warehouse_id: transactionData.target_warehouse_id
      };

      toast({
        title: "Success",
        description: "Item checked out successfully!",
      });

      // Reset the form
      reset();

      // Notify parent component
      onSuccess(inventoryTransaction);
    } catch (error: any) {
      console.error("Error during checkout:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to check out item",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check Out Item</CardTitle>
        <CardDescription>
          Associate this item with a procurement request and record the checkout.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="procurement_request_id">Procurement Request</Label>
            <Select 
              onValueChange={(value) => {
                // Use register's onChange to update value
                const event = { target: { value, name: "procurement_request_id" } };
                register("procurement_request_id").onChange(event);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a request" />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <SelectItem value="loading" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading requests...
                  </SelectItem>
                ) : (
                  availableRequests.map((request) => (
                    <SelectItem key={request.id} value={request.id}>
                      {request.id} - {request.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.procurement_request_id && (
              <p className="text-sm text-red-500 mt-1">{errors.procurement_request_id?.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input id="notes" type="text" {...register("notes")} />
          </div>
          <CardFooter className="px-0">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking Out...
                </>
              ) : "Check Out"}
            </Button>
            <Button type="button" variant="outline" className="ml-2" onClick={onCancel}>
              Cancel
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
};

export default CheckOutForm;
