
import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const deliveryFormSchema = z.object({
  delivery_method: z.enum(["direct", "courier"], {
    required_error: "Please select a delivery method",
  }),
  recipient_name: z.string().min(2, "Recipient name is required"),
  recipient_contact: z.string().optional(),
  courier_name: z.string().optional(),
  courier_tracking: z.string().optional(),
  delivery_notes: z.string().optional(),
});

type DeliveryFormValues = z.infer<typeof deliveryFormSchema>;

interface DeliveryDetailsFormProps {
  transactionId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const DeliveryDetailsForm = ({ transactionId, onSuccess, onCancel }: DeliveryDetailsFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: {
      delivery_method: "direct",
      recipient_name: "",
      recipient_contact: "",
      courier_name: "",
      courier_tracking: "",
      delivery_notes: "",
    }
  });

  const watchDeliveryMethod = form.watch("delivery_method");

  const onSubmit = async (data: DeliveryFormValues) => {
    try {
      setIsSubmitting(true);

      // Create the delivery details object
      const deliveryDetails = {
        delivery_method: data.delivery_method,
        recipient_name: data.recipient_name,
        recipient_contact: data.recipient_contact,
        delivery_date: new Date().toISOString(),
        ...((data.delivery_method === "courier") ? {
          courier_name: data.courier_name,
          courier_tracking: data.courier_tracking,
        } : {}),
        delivery_notes: data.delivery_notes,
      };

      // Update the transaction with delivery details
      const { error } = await supabase
        .from("inventory_transactions")
        .update({
          delivery_details: deliveryDetails,
          delivery_status: "delivered",
          delivery_date: new Date().toISOString(),
        })
        .eq("id", transactionId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Delivery details recorded successfully",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Error updating delivery details:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update delivery details",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="delivery_method"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Delivery Method</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="direct" id="direct" />
                    <FormLabel htmlFor="direct" className="font-normal cursor-pointer">
                      Direct Handoff
                    </FormLabel>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="courier" id="courier" />
                    <FormLabel htmlFor="courier" className="font-normal cursor-pointer">
                      Courier Service
                    </FormLabel>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="recipient_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipient Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="recipient_contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipient Contact (Optional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchDeliveryMethod === "courier" && (
          <>
            <FormField
              control={form.control}
              name="courier_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Courier Service Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="courier_tracking"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tracking Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="delivery_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : "Record Delivery"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default DeliveryDetailsForm;
