
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
import { AlertTriangle, Loader2, FileBox, PlusCircle } from "lucide-react";
import { 
  Dialog,
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import ProcurementRequestSelector from "./ProcurementRequestSelector";

// Define the schema for the checkout form
const checkoutFormSchema = z.object({
  request_id: z.string().optional(),
  reference: z.string().optional(),
  product_id: z.string({
    required_error: "Please select a product",
  }),
  source_warehouse_id: z.string({
    required_error: "Please select a warehouse",
  }),
  quantity: z.coerce.number().positive({
    message: "Quantity must be a positive number",
  }),
  notes: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

// Define the schema for the product request form
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

interface ProcurementRequest {
  id: string;
  request_number: string;
  title: string;
  department: string | null;
  date_created: string;
  requester_name: string | null;
  items?: {
    id: string;
    product_id: string;
    quantity: number;
    product_name: string;
  }[];
}

const CheckOutRequestForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isProcurementSelectorOpen, setIsProcurementSelectorOpen] = useState(false);
  const [inventoryWarning, setInventoryWarning] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ProcurementRequest | null>(null);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  
  // Form for checkout
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      quantity: 1,
      reference: "",
      notes: "",
    },
  });

  // Form for product request
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

  // Update available products when a procurement request is selected
  useEffect(() => {
    if (selectedRequest?.items && selectedRequest.items.length > 0) {
      // Filter products to show only those in the selected procurement request
      const requestProductIds = selectedRequest.items.map(item => item.product_id);
      const filteredProducts = products.filter(product => requestProductIds.includes(product.id));
      setAvailableProducts(filteredProducts);
    } else {
      setAvailableProducts(products);
    }
  }, [selectedRequest, products]);

  // Check inventory level when product changes
  const checkInventory = async (productId: string, warehouseId: string, quantity: number) => {
    if (!productId || !warehouseId) return;
    
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("quantity")
        .eq("product_id", productId)
        .eq("warehouse_id", warehouseId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {  // No rows returned
          setInventoryWarning("This product is not available in the selected warehouse.");
        } else {
          console.error("Error checking inventory:", error);
        }
        return;
      }

      if (data.quantity < quantity) {
        setInventoryWarning(`Only ${data.quantity} units available. You're requesting ${quantity} units.`);
      } else {
        setInventoryWarning(null);
      }
    } catch (error) {
      console.error("Error checking inventory:", error);
    }
  };

  // Watch for changes to perform inventory check
  const productId = form.watch("product_id");
  const warehouseId = form.watch("source_warehouse_id");
  const quantity = form.watch("quantity");

  useEffect(() => {
    if (productId && warehouseId && quantity) {
      checkInventory(productId, warehouseId, quantity);
    }
  }, [productId, warehouseId, quantity]);

  const handleProductChange = async (productId: string) => {
    form.setValue("product_id", productId);
    
    // Find the selected product to display details
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product);
  };

  // Handle procurement request selection
  const handleRequestSelection = (request: ProcurementRequest) => {
    setSelectedRequest(request);
    form.setValue("request_id", request.request_number);
    form.setValue("reference", `PR: ${request.request_number} - ${request.title}`);
    
    // Reset product selection since we now have new products from the request
    form.setValue("product_id", "");
    setSelectedProduct(null);
    
    toast({
      title: "Request Selected",
      description: `Selected procurement request: ${request.request_number}`,
    });
    
    setIsProcurementSelectorOpen(false);
  };

  // Submit checkout request
  const onSubmit = async (data: CheckoutFormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a checkout request",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("inventory_transactions")
        .insert({
          type: "check_out",
          product_id: data.product_id,
          source_warehouse_id: data.source_warehouse_id,
          quantity: data.quantity,
          reference: data.reference || null,
          request_id: data.request_id || null,
          notes: data.notes || null,
          user_id: user.id,
          approval_status: "pending", // All checkout requests start as pending
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Checkout request submitted for approval",
      });
      
      form.reset();
      setSelectedProduct(null);
      setSelectedRequest(null);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating checkout request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout request",
        variant: "destructive",
      });
    }
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

      // Then create a procurement request with a request_number field
      const { error: requestError } = await supabase
        .from("procurement_requests")
        .insert({
          title: `New Product Request: ${data.name}`,
          description: `Request for new product addition to inventory. ${data.notes || ''}`,
          requester_id: user.id,
          status: "submitted",
          priority: "medium",
          date_needed: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
          request_number: `PR-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
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

  // Create a procurement request
  const createProcurementRequest = async () => {
    if (!user || !selectedProduct) return;
    
    try {
      const { error } = await supabase
        .from("procurement_requests")
        .insert({
          title: `Procurement for ${selectedProduct.name}`,
          description: `Inventory levels low. Additional ${quantity} units needed.`,
          requester_id: user.id,
          status: "submitted",
          priority: "medium",
          date_needed: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
          request_number: `PR-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Procurement request created successfully",
      });
      
      setInventoryWarning(null);
    } catch (error: any) {
      console.error("Error creating procurement request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create procurement request",
        variant: "destructive",
      });
    }
  };

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

          {/* Step 2: Select Product and Warehouse */}
          <div className="p-4 border rounded-lg bg-muted/10">
            <h3 className="text-md font-medium mb-4">Step 2: Select Product and Warehouse</h3>
            
            <div className="flex flex-col md:flex-row gap-2">
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Product</FormLabel>
                    <div className="flex space-x-2">
                      <Select
                        onValueChange={handleProductChange}
                        value={field.value}
                        disabled={availableProducts.length === 0 && !selectedRequest}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedRequest && availableProducts.length === 0 ? 
                              "No products in this request" : "Select a product"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-80">
                          {(selectedRequest ? availableProducts : products).map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsProductModalOpen(true)}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        New
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source_warehouse_id"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Source Warehouse</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!productId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a warehouse" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
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
                name="quantity"
                render={({ field }) => (
                  <FormItem className="md:w-32">
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        disabled={!productId}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {inventoryWarning && (
              <Alert variant="destructive" className="bg-yellow-50 border-yellow-200 text-yellow-800 mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Inventory Warning</AlertTitle>
                <AlertDescription className="flex flex-col gap-2">
                  <span>{inventoryWarning}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={createProcurementRequest}
                  >
                    Create Procurement Request
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {selectedProduct && (
              <div className="p-4 border rounded-md bg-muted/20 mt-4">
                <h3 className="font-medium mb-2">Product Details</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedProduct.description || "No description available"}
                </p>
                <p className="text-sm mt-1">
                  <span className="font-medium">Category:</span> {selectedProduct.category?.name || "Uncategorized"}
                </p>
              </div>
            )}
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
            <Button type="submit" disabled={!form.formState.isValid || !selectedRequest}>Submit Request</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CheckOutRequestForm;
