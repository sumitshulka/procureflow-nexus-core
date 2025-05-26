
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

const deliveryFormSchema = z.object({
  recipient_name: z.string().min(1, "Recipient name is required"),
  recipient_id: z.string().optional(),
  recipient_department: z.string().min(1, "Department is required"),
  delivery_notes: z.string().optional(),
  location: z.string().optional(),
});

type DeliveryFormValues = z.infer<typeof deliveryFormSchema>;

interface DeliveryDetailsDialogProps {
  transactionId: string;
  product: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DeliveryDetailsDialog: React.FC<DeliveryDetailsDialogProps> = ({
  transactionId,
  product,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: {
      recipient_name: "",
      recipient_id: "",
      recipient_department: "",
      delivery_notes: "",
      location: "",
    },
  });

  const onSubmit = async (values: DeliveryFormValues) => {
    try {
      setIsSubmitting(true);
      
      console.info("[DeliveryDetailsDialog] Submitting delivery details for transaction:", transactionId);
      console.info("[DeliveryDetailsDialog] Form values:", values);

      const deliveryDetails = {
        ...values,
        delivered_at: new Date().toISOString(),
      };

      console.info("[DeliveryDetailsDialog] Using direct Supabase update instead of RPC");

      // Update transaction with delivery details and set delivery status to delivered
      // Using direct supabase call instead of RPC to avoid trigger issues
      const { data, error } = await supabase
        .from('inventory_transactions')
        .update({
          delivery_details: deliveryDetails,
          delivery_status: 'delivered'
        })
        .eq('id', transactionId)
        .select();

      if (error) {
        console.error("[DeliveryDetailsDialog] Supabase error:", error);
        throw error;
      }

      console.info("[DeliveryDetailsDialog] Update successful:", data);

      toast({
        title: "Success",
        description: "Delivery details recorded successfully",
      });

      form.reset();
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error("[DeliveryDetailsDialog] Error recording delivery details:", error);
      console.error("[DeliveryDetailsDialog] Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      });
      
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
    console.info("[DeliveryDetailsDialog] Dialog closing");
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
            Product: <span className="font-medium">{product}</span>
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

export default DeliveryDetailsDialog;
