
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { updateTransactionDeliveryDetails } from '@/lib/supabase/rpcActions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

interface DeliveryDetailsDialogProps {
  transactionId: string;
  product: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Department {
  id: string;
  name: string;
}

const formSchema = z.object({
  recipient_name: z.string().min(2, { message: "Recipient name is required" }),
  recipient_id: z.string().optional(),
  recipient_department: z.string().min(1, { message: "Department is required" }),
  delivery_notes: z.string().optional(),
  location: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const DeliveryDetailsDialog = ({ 
  transactionId, 
  product,
  isOpen, 
  onClose, 
  onSuccess 
}: DeliveryDetailsDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipient_name: "",
      recipient_id: "",
      recipient_department: "",
      delivery_notes: "",
      location: "",
    }
  });

  // Fetch departments when the dialog opens
  useEffect(() => {
    if (isOpen) {
      const fetchDepartments = async () => {
        try {
          const { data, error } = await supabase
            .from('departments')
            .select('id, name');
            
          if (error) throw error;
          setDepartments(data || []);
        } catch (error) {
          console.error('Error fetching departments:', error);
          toast({
            title: "Error",
            description: "Failed to load departments",
            variant: "destructive",
          });
        }
      };
      
      fetchDepartments();
    }
  }, [isOpen, toast]);

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      console.log('Submitting delivery details for transaction:', transactionId);
      console.log('Form values:', values);

      // Add delivery timestamp
      const deliveryDetails = {
        ...values,
        delivered_at: new Date().toISOString(),
      };

      console.log('Calling updateTransactionDeliveryDetails with:', {
        transactionId,
        deliveryDetails
      });

      const { data, error } = await updateTransactionDeliveryDetails(
        transactionId,
        deliveryDetails
      );

      if (error) {
        console.error('Error updating delivery details:', error);
        toast({
          title: "Error",
          description: `Failed to save delivery details: ${error.message || 'Unknown error'}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Transaction updated successfully:', data);
      
      toast({
        title: "Success",
        description: "Delivery details saved and inventory updated successfully",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving delivery details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save delivery details",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Delivery Details</DialogTitle>
          <DialogDescription>
            Enter the delivery information for <strong>{product}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="recipient_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter recipient's full name" {...field} />
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
                  <FormLabel>Recipient ID/Badge</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter ID or badge number" {...field} />
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
                  <FormLabel>Department*</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
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
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter delivery location" {...field} />
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional notes or comments" 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Delivery Details"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryDetailsDialog;
