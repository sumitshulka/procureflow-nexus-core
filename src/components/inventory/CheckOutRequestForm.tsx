import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, FileBox, PlusCircle, Trash2, Plus } from "lucide-react";
import { 
  Dialog,
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import ProcurementRequestSelector, { ProcurementRequest, ProcurementRequestItem } from "./ProcurementRequestSelector";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

// Define interface for checkout item
interface CheckoutItem {
  product_id: string;
  product_name: string;
  source_warehouse_id: string;
  quantity: number;
  notes?: string;
  available: boolean;
  inventory_quantity?: number;
}

// Define schema for checkout request form
const checkoutFormSchema = z.object({
  request_id: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

// Define schema for product request form
const productRequestSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  category_id: z.string({
    required_error: "Please select a category",
  }),
  classification: z.enum(["goods", "services"], {
    required_error: "Please select a classification",
  }),
  unit_id: z.string({
    required_error: "Please select a unit",
  }),
  quantity_needed: z.coerce.number().positive({
    message: "Quantity needed must be a positive number",
  }),
  notes: z.string().optional(),
});

type ProductRequestFormValues = z.infer<typeof productRequestSchema>;

const CheckOutRequestForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isProcurementSelectorOpen, setIsProcurementSelectorOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ProcurementRequest | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
  const [isRFPModalOpen, setIsRFPModalOpen] = useState(false);
  const [missingProducts, setMissingProducts] = useState<ProcurementRequestItem[]>([]);
  const [customItem, setCustomItem] = useState<{
    product_id: string;
    source_warehouse_id: string;
    quantity: number;
  } | null>(null);
  
  // Forms for checkout and product request
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      reference: "",
      notes: "",
    },
  });

  const productRequestForm = useForm<ProductRequestFormValues>({
    resolver: zodResolver(productRequestSchema),
    defaultValues: {
      name: "",
      description: "",
      classification: "goods",
      quantity_needed: 1,
      notes: "",
    },
  });

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, 
          name, 
          description,
          category:category_id(id, name)
        `)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        });
        throw error;
      }
      return data;
    },
  });

  // Fetch warehouses
  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name, description")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch warehouses",
          variant: "destructive",
        });
        throw error;
      }
      return data;
    },
  });

  // Fetch categories for product request
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch units for product request
  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, name, abbreviation")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Handle procurement request selection and auto-populate items
  const handleRequestSelection = async (request: ProcurementRequest) => {
    setSelectedRequest(request);
    form.setValue("request_id", request.request_number);
    form.setValue("reference", `PR: ${request.request_number} - ${request.title}`);
    
    // Reset checkout items
    setCheckoutItems([]);
    
    if (!request.items || request.items.length === 0) {
      toast({
        title: "Warning",
        description: "This request doesn't have any items",
        variant: "destructive",
      });
      setIsProcurementSelectorOpen(false);
      return;
    }
    
    // Process each item in the request
    const newCheckoutItems: CheckoutItem[] = [];
    const unavailableItems: ProcurementRequestItem[] = [];
    
    for (const item of request.items) {
      // Find product details
      const product = products.find(p => p.id === item.product_id);
      
      if (!product) {
        unavailableItems.push(item);
        continue;
      }
      
      // Check inventory availability for this product across all warehouses
      const { data: inventoryItems, error } = await supabase
        .from("inventory_items")
        .select("warehouse_id, quantity")
        .eq("product_id", item.product_id)
        .gt("quantity", 0);
        
      if (error || !inventoryItems || inventoryItems.length === 0) {
        // Product exists but no inventory
        unavailableItems.push(item);
        continue;
      }
      
      // Find best warehouse (one with most inventory)
      const bestWarehouse = inventoryItems.reduce((prev, current) => 
        (prev.quantity > current.quantity) ? prev : current);
        
      // Add to checkout items
      newCheckoutItems.push({
        product_id: item.product_id,
        product_name: product.name,
        source_warehouse_id: bestWarehouse.warehouse_id,
        quantity: Math.min(item.quantity, bestWarehouse.quantity), // Only allow checking out what's available
        available: true,
        inventory_quantity: bestWarehouse.quantity
      });
    }
    
    setCheckoutItems(newCheckoutItems);
    setMissingProducts(unavailableItems);
    
    if (unavailableItems.length > 0) {
      setIsRFPModalOpen(true);
    }
    
    toast({
      title: "Request Selected",
      description: `Populated ${newCheckoutItems.length} items from request`,
    });
    
    setIsProcurementSelectorOpen(false);
  };

  // Add custom item to checkout
  const addCustomItem = () => {
    if (!customItem?.product_id || !customItem?.source_warehouse_id || !customItem?.quantity) {
      toast({
        title: "Error",
        description: "Please select product, warehouse, and quantity",
        variant: "destructive",
      });
      return;
    }
    
    const product = products.find(p => p.id === customItem.product_id);
    
    if (!product) {
      toast({
        title: "Error",
        description: "Selected product not found",
        variant: "destructive",
      });
      return;
    }
    
    setCheckoutItems([...checkoutItems, {
      product_id: customItem.product_id,
      product_name: product.name,
      source_warehouse_id: customItem.source_warehouse_id,
      quantity: customItem.quantity,
      available: true
    }]);
    
    setCustomItem(null);
  };

  // Check inventory level for a specific checkout item
  const checkInventory = async (item: CheckoutItem) => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("quantity")
        .eq("product_id", item.product_id)
        .eq("warehouse_id", item.source_warehouse_id)
        .single();

      if (error) {
        console.error("Error checking inventory:", error);
        return;
      }

      const updatedItems = checkoutItems.map(existingItem => {
        if (existingItem.product_id === item.product_id && 
            existingItem.source_warehouse_id === item.source_warehouse_id) {
          return {
            ...existingItem,
            available: data.quantity >= item.quantity,
            inventory_quantity: data.quantity
          };
        }
        return existingItem;
      });
      
      setCheckoutItems(updatedItems);
    } catch (error) {
      console.error("Error checking inventory:", error);
    }
  };

  // Create a procurement request for missing items
  const createProcurementRequest = async () => {
    if (!user || missingProducts.length === 0) return;
    
    try {
      // Generate a request number (format: PR-YYYY-MM-DD-XXXX)
      const requestNumber = `PR-${new Date().toISOString().slice(0, 10)}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Create a procurement request
      const { data: newRequest, error } = await supabase
        .from("procurement_requests")
        .insert({
          request_number: requestNumber,
          title: `Auto-generated request for missing inventory items`,
          description: `Items needed for checkout that were not available in inventory.\nOriginal request: ${selectedRequest?.request_number}`,
          requester_id: user.id,
          status: "submitted",
          priority: "high",
          date_needed: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        })
        .select()
        .single();

      if (error) throw error;
      
      // Add items to the request
      const requestItems = missingProducts.map(item => ({
        request_id: newRequest.id,
        product_id: item.product_id,
        quantity: item.quantity,
      }));
      
      const { error: itemsError } = await supabase
        .from("procurement_request_items")
        .insert(requestItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Procurement request created for missing items",
      });
      
      setIsRFPModalOpen(false);
    } catch (error: any) {
      console.error("Error creating procurement request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create procurement request",
        variant: "destructive",
      });
    }
  };

  // Remove item from checkout list
  const removeItem = (index: number) => {
    const newItems = [...checkoutItems];
    newItems.splice(index, 1);
    setCheckoutItems(newItems);
  };

  // Submit product request
  const onSubmitProductRequest = async (data: ProductRequestFormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to request a new product",
        variant: "destructive",
      });
      return;
    }

    try {
      // First create the product
      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          name: data.name,
          description: data.description,
          category_id: data.category_id,
          classification: data.classification,
          unit_id: data.unit_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (productError) throw productError;

      // Generate a request number (format: PR-YYYY-MM-DD-XXXX)
      const requestNumber = `PR-${new Date().toISOString().slice(0, 10)}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Then create a procurement request with a request_number field
      const { error: requestError } = await supabase
        .from("procurement_requests")
        .insert({
          request_number: requestNumber,
          title: `New Product Request: ${data.name}`,
          description: `Request for new product addition to inventory. ${data.notes || ''}`,
          requester_id: user.id,
          status: "submitted",
          priority: "medium",
          date_needed: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
        });

      if (requestError) throw requestError;

      toast({
        title: "Success",
        description: "New product request submitted successfully",
      });
      
      productRequestForm.reset();
      setIsProductModalOpen(false);
      
      // Refresh the products list
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error: any) {
      console.error("Error requesting new product:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to request new product",
        variant: "destructive",
      });
    }
  };

  // Submit checkout request for all items
  const onSubmit = async (data: CheckoutFormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a checkout request",
        variant: "destructive",
      });
      return;
    }

    if (checkoutItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to check out",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create checkout transactions for each item
      const transactions = checkoutItems.map(item => ({
        type: "check_out",
        product_id: item.product_id,
        source_warehouse_id: item.source_warehouse_id,
        quantity: item.quantity,
        reference: data.reference || null,
        request_id: data.request_id || null,
        notes: item.notes || data.notes || null,
        user_id: user.id,
        approval_status: "pending", // All checkout requests start as pending
      }));

      const { error } = await supabase
        .from("inventory_transactions")
        .insert(transactions);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Checkout requests submitted for approval",
      });
      
      form.reset();
      setCheckoutItems([]);
      setSelectedRequest(null);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating checkout requests:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout requests",
        variant: "destructive",
      });
    }
  };

  // Check inventory when item details change
  useEffect(() => {
    checkoutItems.forEach(item => {
      if (item.product_id && item.source_warehouse_id) {
        checkInventory(item);
      }
    });
  }, [checkoutItems.map(item => `${item.product_id}-${item.source_warehouse_id}-${item.quantity}`).join(',')]);

  if (productsLoading || warehousesLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Request Item Checkout</h2>
        <p className="text-sm text-muted-foreground mt-1">
          First select a procurement request, then choose products to check out from inventory.
        </p>
      </div>

      {/* Product request dialog */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Request New Product</DialogTitle>
            <DialogDescription>
              Fill out this form to request a new product that's not in the catalog
            </DialogDescription>
          </DialogHeader>
          
          <Form {...productRequestForm}>
            <form onSubmit={productRequestForm.handleSubmit(onSubmitProductRequest)} className="space-y-4">
              <FormField
                control={productRequestForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={productRequestForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={productRequestForm.control}
                  name="classification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classification</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select classification" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="goods">Goods</SelectItem>
                          <SelectItem value="services">Services</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={productRequestForm.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={productRequestForm.control}
                  name="unit_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.name} ({unit.abbreviation || ''})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={productRequestForm.control}
                  name="quantity_needed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity Needed</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={productRequestForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Any specific requirements or details" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit Request</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Missing Products RFP Dialog */}
      <Dialog open={isRFPModalOpen} onOpenChange={setIsRFPModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Missing Products</DialogTitle>
            <DialogDescription>
              Some products from the procurement request are not available in inventory
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingProducts.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Missing Inventory</AlertTitle>
              <AlertDescription>
                These items are not available in inventory. Would you like to create a procurement request for them?
              </AlertDescription>
            </Alert>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRFPModalOpen(false)}>
                Skip
              </Button>
              <Button onClick={createProcurementRequest}>
                Create Procurement Request
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Procurement Request Selector */}
      <ProcurementRequestSelector 
        isOpen={isProcurementSelectorOpen}
        onOpenChange={setIsProcurementSelectorOpen}
        onSelect={handleRequestSelection}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Step 1: Select Procurement Request */}
          <div className="p-4 border rounded-lg bg-muted/10">
            <h3 className="text-md font-medium mb-4">Step 1: Select Procurement Request</h3>
            
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procurement Request</FormLabel>
                  <div className="flex space-x-2">
                    <FormControl>
                      <div className="flex-1 flex items-center">
                        {selectedRequest ? (
                          <div className="bg-muted p-2 rounded-md flex-1 flex items-center">
                            <FileBox className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm">{field.value}</span>
                          </div>
                        ) : (
                          <Input {...field} placeholder="No request selected" readOnly className="bg-muted" />
                        )}
                      </div>
                    </FormControl>
                    <Button 
                      type="button" 
                      onClick={() => setIsProcurementSelectorOpen(true)}
                      className="whitespace-nowrap"
                    >
                      {selectedRequest ? "Change Request" : "Select Request"}
                    </Button>
                  </div>
                  <FormDescription>
                    Select an approved procurement request to check out items
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Step 2: Checkout Items */}
          <div className="p-4 border rounded-lg bg-muted/10">
            <h3 className="text-md font-medium mb-4">Step 2: Items to Check Out</h3>
            
            {/* Display checkout items */}
            {checkoutItems.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Availability</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checkoutItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>
                            <Select
                              value={item.source_warehouse_id}
                              onValueChange={(value) => {
                                const updatedItems = [...checkoutItems];
                                updatedItems[index].source_warehouse_id = value;
                                setCheckoutItems(updatedItems);
                              }}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select warehouse" />
                              </SelectTrigger>
                              <SelectContent>
                                {warehouses.map((warehouse) => (
                                  <SelectItem key={warehouse.id} value={warehouse.id}>
                                    {warehouse.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              className="w-20"
                              value={item.quantity}
                              onChange={(e) => {
                                const updatedItems = [...checkoutItems];
                                updatedItems[index].quantity = parseInt(e.target.value, 10) || 1;
                                setCheckoutItems(updatedItems);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {item.inventory_quantity !== undefined ? (
                              item.inventory_quantity >= item.quantity ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Available ({item.inventory_quantity})
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                  Limited ({item.inventory_quantity})
                                </Badge>
                              )
                            ) : (
                              <Badge variant="outline" className="bg-slate-50">
                                Checking...
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <Card className="bg-muted/20">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <p className="text-muted-foreground mb-2">No items selected for checkout</p>
                    <p className="text-sm text-muted-foreground">Select a procurement request to populate items</p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Add custom item */}
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Add Custom Item</h4>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="w-full sm:w-auto">
                  <Select
                    value={customItem?.product_id || ""}
                    onValueChange={(value) => setCustomItem({
                      ...customItem || { quantity: 1, source_warehouse_id: "" },
                      product_id: value
                    })}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-auto">
                  <Select
                    value={customItem?.source_warehouse_id || ""}
                    onValueChange={(value) => setCustomItem({
                      ...customItem || { quantity: 1, product_id: "" },
                      source_warehouse_id: value
                    })}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Qty"
                    min="1"
                    className="w-20"
                    value={customItem?.quantity || ""}
                    onChange={(e) => setCustomItem({
                      ...customItem || { product_id: "", source_warehouse_id: "" },
                      quantity: parseInt(e.target.value, 10) || 1
                    })}
                  />
                </div>
                <Button 
                  type="button"
                  variant="secondary"
                  onClick={addCustomItem}
                  disabled={!customItem?.product_id || !customItem?.source_warehouse_id}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsProductModalOpen(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Product
                </Button>
              </div>
            </div>
          </div>

          {/* Step 3: Add Notes */}
          <div className="p-4 border rounded-lg bg-muted/10">
            <h3 className="text-md font-medium mb-4">Step 3: Add Notes (Optional)</h3>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add any notes about this checkout request"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="pt-4 flex justify-end">
            <Button 
              type="submit" 
              disabled={checkoutItems.length === 0}
            >
              Submit Request
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CheckOutRequestForm;
