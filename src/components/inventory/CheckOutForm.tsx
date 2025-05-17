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
    control,
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
        .select('id, request_number, title')
        .in('status', ['approved'])
        .order('date_created', { ascending: false });
    
      if (error) throw error;
    
      setAvailableRequests(data || []);
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

      // Perform the checkout transaction
      const { data: transaction, error } = await supabase.from('inventory_transactions').insert({
        type: 'check_out',
        product_id: productId,
        quantity: 1, // Assuming a quantity of 1 for checkout
        reference: 'procurement_request',
        transaction_date: new Date().toISOString(),
        request_id: procurement_request_id,
        notes: notes,
        approval_status: 'approved', // Assuming auto-approval for checkouts
        delivery_status: 'pending',
        user_id: supabase.auth.user()?.id,
      }).select().single();

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Item checked out successfully!",
      });

      // Reset the form
      reset();

      // Notify parent component
      onSuccess(transaction);
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
                // Manually trigger the form validation for this field
                control._fields.procurement_request_id.onChange(value);
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
                      {request.request_number} - {request.title}
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
            <Input id="notes" type="text" {...control._fields.notes} />
          </div>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking Out...
                </>
              ) : "Check Out"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
};

export default CheckOutForm;
