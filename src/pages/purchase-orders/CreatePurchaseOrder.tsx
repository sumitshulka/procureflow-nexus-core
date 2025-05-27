
import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const poItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit_price: z.number().min(0, "Unit price must be positive"),
  tax_rate: z.number().min(0).max(100).default(0),
  discount_rate: z.number().min(0).max(100).default(0),
  delivery_date: z.date().optional(),
  specifications: z.string().optional(),
  warranty_period: z.string().optional(),
});

const purchaseOrderSchema = z.object({
  vendor_id: z.string().min(1, "Vendor is required"),
  procurement_request_id: z.string().optional(),
  expected_delivery_date: z.date().optional(),
  payment_terms: z.string().optional(),
  delivery_terms: z.string().optional(),
  warranty_terms: z.string().optional(),
  special_instructions: z.string().optional(),
  currency: z.string().default("USD"),
  items: z.array(poItemSchema).min(1, "At least one item is required"),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

interface Vendor {
  id: string;
  company_name: string;
  primary_email: string;
}

const CreatePurchaseOrder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      currency: "USD",
      items: [
        {
          description: "",
          quantity: 1,
          unit_price: 0,
          tax_rate: 0,
          discount_rate: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from("vendor_registrations")
        .select("id, company_name, primary_email")
        .eq("status", "approved")
        .order("company_name");

      if (error) throw error;
      setVendors(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch vendors",
        variant: "destructive",
      });
    }
  };

  const calculateItemTotals = (item: any) => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = (subtotal * item.discount_rate) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * item.tax_rate) / 100;
    const finalAmount = afterDiscount + taxAmount;

    return {
      total_price: subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      final_amount: finalAmount,
    };
  };

  const calculateOrderTotals = (items: any[]) => {
    let totalAmount = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let finalAmount = 0;

    items.forEach((item) => {
      const totals = calculateItemTotals(item);
      totalAmount += totals.total_price;
      totalTax += totals.tax_amount;
      totalDiscount += totals.discount_amount;
      finalAmount += totals.final_amount;
    });

    return {
      total_amount: totalAmount,
      tax_amount: totalTax,
      discount_amount: totalDiscount,
      final_amount: finalAmount,
    };
  };

  const onSubmit = async (data: PurchaseOrderFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a purchase order",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const orderTotals = calculateOrderTotals(data.items);

      // Insert Purchase Order - don't include po_number as it's auto-generated
      const { data: poData, error: poError } = await supabase
        .from("purchase_orders")
        .insert({
          vendor_id: data.vendor_id,
          procurement_request_id: data.procurement_request_id || null,
          expected_delivery_date: data.expected_delivery_date?.toISOString(),
          payment_terms: data.payment_terms,
          delivery_terms: data.delivery_terms,
          warranty_terms: data.warranty_terms,
          special_instructions: data.special_instructions,
          currency: data.currency,
          created_by: user.id,
          status: "draft",
          ...orderTotals,
        } as any)
        .select()
        .single();

      if (poError) throw poError;

      // Insert Purchase Order Items
      const itemsData = data.items.map((item) => {
        const totals = calculateItemTotals(item);
        return {
          po_id: poData.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          discount_rate: item.discount_rate,
          delivery_date: item.delivery_date?.toISOString(),
          specifications: item.specifications,
          warranty_period: item.warranty_period,
          ...totals,
        };
      });

      const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .insert(itemsData);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });

      navigate("/purchase-orders/pending");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const watchedItems = form.watch("items");
  const orderTotals = calculateOrderTotals(watchedItems);

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Purchase Order</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="vendor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.company_name}
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
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="INR">INR</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expected_delivery_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expected Delivery Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : "Pick a date"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Net 30 days" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Purchase Order Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Purchase Order Items</h3>
                  <Button
                    type="button"
                    onClick={() =>
                      append({
                        description: "",
                        quantity: 1,
                        unit_price: 0,
                        tax_rate: 0,
                        discount_rate: 0,
                      })
                    }
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <Card key={field.id} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description *</FormLabel>
                              <FormControl>
                                <Input placeholder="Item description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.unit_price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Price *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.tax_rate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax Rate (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.specifications`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specifications</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Technical specifications" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.warranty_period`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warranty Period</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 12 months" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Item totals display */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Subtotal:</span>{" "}
                          {form.watch("currency")} {calculateItemTotals(watchedItems[index]).total_price.toFixed(2)}
                        </div>
                        <div>
                          <span className="font-medium">Discount:</span>{" "}
                          {form.watch("currency")} {calculateItemTotals(watchedItems[index]).discount_amount.toFixed(2)}
                        </div>
                        <div>
                          <span className="font-medium">Tax:</span>{" "}
                          {form.watch("currency")} {calculateItemTotals(watchedItems[index]).tax_amount.toFixed(2)}
                        </div>
                        <div>
                          <span className="font-medium">Total:</span>{" "}
                          <span className="font-bold">
                            {form.watch("currency")} {calculateItemTotals(watchedItems[index]).final_amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Order Totals */}
              <Card className="p-4 bg-blue-50">
                <h3 className="text-lg font-medium mb-4">Order Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium">Subtotal</p>
                    <p className="text-lg">{form.watch("currency")} {orderTotals.total_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total Discount</p>
                    <p className="text-lg">{form.watch("currency")} {orderTotals.discount_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total Tax</p>
                    <p className="text-lg">{form.watch("currency")} {orderTotals.tax_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Grand Total</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {form.watch("currency")} {orderTotals.final_amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => navigate("/purchase-orders/pending")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Purchase Order"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatePurchaseOrder;
