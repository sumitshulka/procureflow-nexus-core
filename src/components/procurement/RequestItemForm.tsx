
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
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
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Define the schema for the item form
const requestItemSchema = z.object({
  product_id: z.string().optional(),
  description: z.string().min(3, "Description must be at least 3 characters").optional(),
  quantity: z.coerce.number().positive({
    message: "Quantity must be a positive number",
  }),
  estimated_price: z.coerce.number().nonnegative().optional(),
});

// Define the schema for the new product form
const newProductSchema = z.object({
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
});

type RequestItemFormValues = z.infer<typeof requestItemSchema>;
type NewProductFormValues = z.infer<typeof newProductSchema>;

interface RequestItemFormProps {
  requestId: string;
  onSuccess: () => void;
  existingItem?: {
    id: string;
    product_id?: string;
    description?: string;
    quantity: number;
    estimated_price?: number;
  };
}

const RequestItemForm: React.FC<RequestItemFormProps> = ({
  requestId,
  onSuccess,
  existingItem,
}) => {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [inventoryStatus, setInventoryStatus] = useState<{
    available: number;
    status: "ok" | "low" | "none";
    message: string;
  } | null>(null);

  // Form for request item
  const form = useForm<RequestItemFormValues>({
    resolver: zodResolver(requestItemSchema),
    defaultValues: {
      product_id: existingItem?.product_id || "",
      description: existingItem?.description || "",
      quantity: existingItem?.quantity || 1,
      estimated_price: existingItem?.estimated_price || 0,
    },
  });

  // Form for new product
  const newProductForm = useForm<NewProductFormValues>({
    resolver: zodResolver(newProductSchema),
    defaultValues: {
      name: "",
      description: "",
      classification: "goods",
      category_id: "",
      unit_id: "",
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
          category:category_id(id, name),
          unit:unit_id(id, name, abbreviation)
        `)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch categories for new product form
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

  // Fetch units for new product form
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

  // Check inventory when product and quantity change
  const productId = form.watch("product_id");
  const quantity = form.watch("quantity");

  useEffect(() => {
    if (!productId) {
      setInventoryStatus(null);
      return;
    }
    
    checkInventory(productId, quantity);
  }, [productId, quantity]);

  // Function to check inventory level
  const checkInventory = async (productId: string, quantity: number) => {
    if (!productId) return;

    try {
      // Get total inventory across all warehouses
      const { data, error } = await supabase
        .from("inventory_items")
        .select("quantity")
        .eq("product_id", productId);

      if (error) {
        console.error("Error checking inventory:", error);
        return;
      }

      const totalQuantity = data.reduce((sum, item) => sum + item.quantity, 0);
      
      if (totalQuantity === 0) {
        setInventoryStatus({
          available: 0,
          status: "none",
          message: "This product is not available in any warehouse. Consider creating a procurement request."
        });
      } else if (totalQuantity < quantity) {
        setInventoryStatus({
          available: totalQuantity,
          status: "low",
          message: `Only ${totalQuantity} units available. You're requesting ${quantity}. Consider creating a procurement request for the difference.`
        });
      } else {
        setInventoryStatus({
          available: totalQuantity,
          status: "ok",
          message: `${totalQuantity} units available.`
        });
      }
    } catch (error) {
      console.error("Error checking inventory:", error);
    }
  };

  // Handle product selection
  const handleProductChange = (productId: string) => {
    form.setValue("product_id", productId);
    setSelectedProduct(products.find(p => p.id === productId));
  };

  // Create procurement request for the product
  const createProcurementRequest = async () => {
    if (!selectedProduct) return;
    
    toast({
      title: "Creating procurement request",
      description: "Please wait...",
    });

    try {
      // Generate a temporary request number (in a real app, this would be handled by a DB trigger)
      const tempRequestNumber = `PR-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      // Create the procurement request
      const { data, error } = await supabase
        .from("procurement_requests")
        .insert({
          title: `Procurement for ${selectedProduct.name}`,
          description: `Procurement request for inventory replenishment`,
          requester_id: (await supabase.auth.getUser()).data.user?.id,
          status: "submitted",
          priority: "medium",
          date_needed: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
          request_number: tempRequestNumber,
        })
        .select("id")
        .single();
      
      if (error) throw error;
      
      // Add the product as an item to the request
      const { error: itemError } = await supabase
        .from("procurement_request_items")
        .insert({
          request_id: data.id,
          product_id: selectedProduct.id,
          quantity: quantity - (inventoryStatus?.available || 0),
          description: `Replenishment for inventory shortage`
        });
      
      if (itemError) throw itemError;
      
      toast({
        title: "Success",
        description: "Procurement request created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create procurement request",
        variant: "destructive",
      });
    }
  };

  // Submit request item
  const onSubmit = async (data: RequestItemFormValues) => {
    try {
      if (existingItem) {
        // Update existing item
        const { error } = await supabase
          .from("procurement_request_items")
          .update({
            product_id: data.product_id,
            description: data.description,
            quantity: data.quantity,
            estimated_price: data.estimated_price || 0,
          })
          .eq("id", existingItem.id);

        if (error) throw error;
      } else {
        // Insert new item
        const { error } = await supabase
          .from("procurement_request_items")
          .insert({
            request_id: requestId,
            product_id: data.product_id,
            description: data.description,
            quantity: data.quantity,
            estimated_price: data.estimated_price || 0,
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: existingItem ? "Item updated successfully" : "Item added successfully",
      });
      
      form.reset();
      setSelectedProduct(null);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save item",
        variant: "destructive",
      });
    }
  };

  // Submit new product form
  const onSubmitNewProduct = async (data: NewProductFormValues) => {
    try {
      const { data: newProduct, error } = await supabase
        .from("products")
        .insert({
          name: data.name,
          description: data.description,
          category_id: data.category_id,
          classification: data.classification,
          unit_id: data.unit_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "New product added to catalog",
      });
      
      // Set the newly created product as the selected product
      form.setValue("product_id", newProduct.id);
      setSelectedProduct(newProduct);
      
      newProductForm.reset();
      setIsNewProductModalOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add product",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* New Product Dialog */}
      <Dialog open={isNewProductModalOpen} onOpenChange={setIsNewProductModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Product to Catalog</DialogTitle>
            <DialogDescription>
              This product will be added to the catalog and can be used in future requests
            </DialogDescription>
          </DialogHeader>
          
          <Form {...newProductForm}>
            <form onSubmit={newProductForm.handleSubmit(onSubmitNewProduct)} className="space-y-4">
              <FormField
                control={newProductForm.control}
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
                control={newProductForm.control}
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
                  control={newProductForm.control}
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
                  control={newProductForm.control}
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
              
              <FormField
                control={newProductForm.control}
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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsNewProductModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Product</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Request Item Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Product</FormLabel>
                  <div className="flex space-x-2">
                    <Select
                      onValueChange={handleProductChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-80">
                        {productsLoading ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : products.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            No products found
                          </div>
                        ) : (
                          products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" onClick={() => setIsNewProductModalOpen(true)}>
                      Product Not Listed
                    </Button>
                  </div>
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimated_price"
              render={({ field }) => (
                <FormItem className="md:w-48">
                  <FormLabel>Estimated Price (Each)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Show inventory status */}
          {inventoryStatus && (
            <Alert
              variant={inventoryStatus.status === "ok" ? "default" : "destructive"}
              className={
                inventoryStatus.status === "ok" 
                  ? "bg-green-50 text-green-800 border-green-200"
                  : inventoryStatus.status === "low"
                    ? "bg-yellow-50 text-yellow-800 border-yellow-200"
                    : "bg-red-50 text-red-800 border-red-200"
              }
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Inventory Status</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                <span>{inventoryStatus.message}</span>
                {inventoryStatus.status !== "ok" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={createProcurementRequest}
                    className={
                      inventoryStatus.status === "low"
                        ? "border-yellow-300 hover:bg-yellow-100"
                        : "border-red-300 hover:bg-red-100"
                    }
                  >
                    Create Procurement Request
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Show product details if a product is selected */}
          {selectedProduct && (
            <div className="p-4 border rounded-md bg-muted/20">
              <h3 className="font-medium mb-2">Product Details</h3>
              <p className="text-sm text-muted-foreground">
                {selectedProduct.description || "No description available"}
              </p>
              <div className="grid grid-cols-2 mt-2 gap-2 text-sm">
                <p>
                  <span className="font-medium">Category:</span> {selectedProduct.category?.name || "Uncategorized"}
                </p>
                <p>
                  <span className="font-medium">Unit:</span> {selectedProduct.unit?.name || "N/A"}
                </p>
              </div>
            </div>
          )}

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Add any specific details about this request item"
                  />
                </FormControl>
                <FormDescription>
                  Include any specific requirements or specifications for this item
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="pt-4 flex justify-end">
            <Button type="submit">
              {existingItem ? "Update Item" : "Add Item"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default RequestItemForm;
