import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const deliverySchema = z.object({
  recipient_name: z.string().min(1, "Recipient name is required"),
  recipient_id: z.string().optional(),
  recipient_department: z.string().min(1, "Department is required"),
  delivery_notes: z.string().optional(),
  location: z.string().optional(),
});

type DeliveryFormData = z.infer<typeof deliverySchema>;

interface DeliveryRecordDialogProps {
  transactionId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DeliveryRecordDialog: React.FC<DeliveryRecordDialogProps> = ({
  transactionId,
  productName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DeliveryFormData>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      recipient_name: "",
      recipient_id: "",
      recipient_department: "",
      delivery_notes: "",
      location: "",
    },
  });

  const handleSubmit = async (values: DeliveryFormData) => {
    try {
      setIsSubmitting(true);
      
      console.log("[DeliveryRecord] Starting delivery recording for:", transactionId);
      console.log("[DeliveryRecord] Form data:", values);

      // First, let's check the current state of the transaction
      const { data: currentTransaction, error: fetchError } = await supabase
        .from('inventory_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError) {
        console.error("[DeliveryRecord] Error fetching current transaction:", fetchError);
        throw fetchError;
      }

      console.log("[DeliveryRecord] Current transaction state:", currentTransaction);

      // Check if already delivered to prevent double processing
      if (currentTransaction.delivery_status === 'delivered') {
        console.warn("[DeliveryRecord] Transaction already marked as delivered!");
        toast({
          title: "Warning",
          description: "This transaction is already marked as delivered",
          variant: "destructive",
        });
        return;
      }

      // Get current inventory before update
      const { data: inventoryBefore, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('product_id', currentTransaction.product_id)
        .eq('warehouse_id', currentTransaction.source_warehouse_id)
        .single();

      if (!inventoryError && inventoryBefore) {
        console.log("[DeliveryRecord] Current inventory before delivery:", inventoryBefore.quantity);
      }

      const deliveryData = {
        ...values,
        delivered_at: new Date().toISOString(),
      };

      console.log("[DeliveryRecord] Calling record_delivery_and_update_inventory function");

      // Use the database function to record delivery and update inventory
      const { data, error } = await supabase.rpc('record_delivery_and_update_inventory', {
        transaction_id: transactionId,
        p_delivery_details: deliveryData
      });

      if (error) {
        console.error("[DeliveryRecord] Database function error:", error);
        throw error;
      }

      console.log("[DeliveryRecord] Function executed successfully:", data);

      // Check inventory after update
      const { data: inventoryAfter, error: inventoryAfterError } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('product_id', currentTransaction.product_id)
        .eq('warehouse_id', currentTransaction.source_warehouse_id)
        .single();

      if (!inventoryAfterError && inventoryAfter && inventoryBefore) {
        const reduction = inventoryBefore.quantity - inventoryAfter.quantity;
        console.log("[DeliveryRecord] Inventory reduction:", reduction);
        console.log("[DeliveryRecord] Expected reduction:", currentTransaction.quantity);
        
        if (reduction !== currentTransaction.quantity) {
          console.error("[DeliveryRecord] MISMATCH: Expected reduction", currentTransaction.quantity, "but got", reduction);
        }
      }

      toast({
        title: "Success",
        description: "Delivery details recorded and inventory updated successfully",
      });

      form.reset();
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error("[DeliveryRecord] Error:", error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to record delivery details",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Delivery Details</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Product: <span className="font-medium">{productName}</span>
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipient_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter recipient name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipient_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient ID/Employee ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter employee ID (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipient_department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter department" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Building, floor, room (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="delivery_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about the delivery (optional)" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Recording..." : "Record Delivery"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryRecordDialog;
