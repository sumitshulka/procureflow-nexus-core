
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Edit, Save, Tag, History, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Define product interface
interface Product {
  id: string;
  name: string;
  description: string | null;
  category: {
    id: string;
    name: string;
  } | null;
  classification: string;
  unit: {
    id: string;
    name: string;
    abbreviation?: string;
  } | null;
  current_price: number | null;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Define history entry interface
interface ProductHistory {
  id: string;
  product_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
  user_name: string | null;
}

// Form schema for product edit
const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category_id: z.string().min(1, "Category is required"),
  classification: z.string().min(1, "Classification is required"),
  unit_id: z.string().min(1, "Unit is required"),
  current_price: z.coerce.number().optional(),
  tags: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [tagInput, setTagInput] = useState("");
  
  // Fetch product data
  const { 
    data: product, 
    isLoading,
    error 
  } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, 
          name, 
          description, 
          classification,
          current_price,
          tags,
          is_active,
          created_at,
          updated_at,
          category:category_id(id, name),
          unit:unit_id(id, name, abbreviation)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });
  
  // Fetch categories for the form
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });
  
  // Fetch units for the form
  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, name, abbreviation")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });
  
  // Fetch product history
  const { data: productHistory = [] } = useQuery({
    queryKey: ["product-history", id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from("product_history")
        .select(`
          id,
          product_id,
          field,
          old_value,
          new_value,
          changed_by,
          changed_at
        `)
        .eq('product_id', id)
        .order('changed_at', { ascending: false });
      
      if (error) throw error;
      
      // Get unique user IDs from the history
      const userIds = [...new Set(data.map(item => item.changed_by).filter(Boolean))];
      
      // Fetch user names if there are any user IDs
      let userMap = {};
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in('id', userIds);
          
        if (!profilesError && profiles) {
          userMap = profiles.reduce((acc, profile) => ({
            ...acc,
            [profile.id]: profile.full_name
          }), {});
        }
      }
      
      // Map user names to history entries
      return data.map(item => ({
        ...item,
        user_name: item.changed_by ? userMap[item.changed_by] || 'Unknown user' : 'Unknown user'
      }));
    },
    enabled: !!id,
  });
  
  // Setup form
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category_id: "",
      classification: "",
      unit_id: "",
      current_price: undefined,
      tags: [],
      is_active: true
    }
  });
  
  // Update form values when product data is loaded
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description || "",
        category_id: product.category?.id || "",
        classification: product.classification,
        unit_id: product.unit?.id || "",
        current_price: product.current_price || undefined,
        tags: product.tags || [],
        is_active: product.is_active
      });
    }
  }, [product, form]);
  
  // Update product mutation
  const updateProduct = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      if (!id || !user) throw new Error("Missing required information");
      
      // Get the current product data for comparison
      const { data: currentProduct, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Create history entries for changed fields
      const historyEntries = [];
      
      // Check each field for changes
      for (const [key, newValue] of Object.entries(values)) {
        // Skip arrays and objects for direct comparison
        if (key === 'tags') continue;
        
        const oldValue = currentProduct[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          historyEntries.push({
            product_id: id,
            field: key,
            old_value: oldValue !== null ? String(oldValue) : null,
            new_value: newValue !== null ? String(newValue) : null,
            changed_by: user.id,
            changed_at: new Date().toISOString()
          });
        }
      }
      
      // Check for tag changes
      if (JSON.stringify(currentProduct.tags) !== JSON.stringify(values.tags)) {
        historyEntries.push({
          product_id: id,
          field: 'tags',
          old_value: JSON.stringify(currentProduct.tags),
          new_value: JSON.stringify(values.tags),
          changed_by: user.id,
          changed_at: new Date().toISOString()
        });
      }
      
      // Begin transaction to update product and add history entries
      const { error } = await supabase
        .from("products")
        .update({
          name: values.name,
          description: values.description,
          category_id: values.category_id,
          classification: values.classification,
          unit_id: values.unit_id,
          current_price: values.current_price,
          tags: values.tags,
          is_active: values.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Insert history entries if there are changes
      if (historyEntries.length > 0) {
        const { error: historyError } = await supabase
          .from("product_history")
          .insert(historyEntries);
          
        if (historyError) throw historyError;
      }
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["product-history", id] });
    },
    onError: (error) => {
      console.error("Error updating product:", error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    }
  });
  
  // Form submission handler
  const onSubmit = (values: ProductFormValues) => {
    updateProduct.mutate(values);
  };
  
  // Add a tag to the form
  const addTag = () => {
    if (tagInput && !form.getValues("tags").includes(tagInput)) {
      form.setValue("tags", [...form.getValues("tags"), tagInput]);
      setTagInput("");
    }
  };
  
  // Remove a tag from the form
  const removeTag = (tagToRemove: string) => {
    form.setValue(
      "tags",
      form.getValues("tags").filter((tag) => tag !== tagToRemove)
    );
  };
  
  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading product details...</span>
        </div>
      </div>
    );
  }
  
  if (error || !product) {
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-red-500">Error loading product details</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => navigate("/catalog")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Catalog
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="page-container">
      <PageHeader
        title="Product Details"
        description={product.name}
        actions={
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate("/catalog")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Catalog
            </Button>
            
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" /> Edit Product
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            )}
          </div>
        }
      />
      
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="history">Change History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-6">
          {!isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
                <CardDescription>Details about this product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Name</h3>
                      <p className="text-sm mt-1 font-medium">{product.name}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Category</h3>
                      <p className="text-sm mt-1">{product.category?.name || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Classification</h3>
                      <Badge variant={product.classification === 'goods' ? 'default' : 'secondary'}>
                        {product.classification === 'goods' ? 'Goods' : 'Services'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Unit</h3>
                      <p className="text-sm mt-1">{product.unit?.name || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Current Price</h3>
                      <p className="text-sm mt-1">
                        {product.current_price 
                          ? new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(product.current_price)
                          : 'Not set'
                        }
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Status</h3>
                      <Badge variant={product.is_active ? 'default' : 'outline'}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Description</h3>
                  <p className="text-sm mt-1 whitespace-pre-line">
                    {product.description || 'No description provided'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Tags</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {product.tags && product.tags.length > 0 ? (
                      product.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">No tags</span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Created</h3>
                    <p className="text-sm mt-1">
                      {new Date(product.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                    <p className="text-sm mt-1">
                      {new Date(product.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Edit Product</CardTitle>
                <CardDescription>Update product information</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter product name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="category_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
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
                      
                      <FormField
                        control={form.control}
                        name="classification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Classification</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
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
                        control={form.control}
                        name="unit_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {units.map((unit) => (
                                  <SelectItem key={unit.id} value={unit.id}>
                                    {unit.name} {unit.abbreviation ? `(${unit.abbreviation})` : ''}
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
                        name="current_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Price</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="0.00" 
                                {...field} 
                                value={field.value === undefined ? '' : field.value}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="is_active"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Active</FormLabel>
                              <FormDescription>
                                Active products appear in searches and can be ordered
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter product description"
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tags"
                      render={() => (
                        <FormItem>
                          <FormLabel>Tags</FormLabel>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Add tag..."
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addTag();
                                }
                              }}
                            />
                            <Button type="button" onClick={addTag}>
                              Add
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {form.getValues("tags").map((tag, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="px-2 py-1 gap-1"
                              >
                                {tag}
                                <button
                                  type="button"
                                  className="ml-1 rounded-full h-4 w-4 flex items-center justify-center bg-muted-foreground/20 hover:bg-muted-foreground/40 text-muted-foreground"
                                  onClick={() => removeTag(tag)}
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={updateProduct.isPending}>
                        {updateProduct.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change History</CardTitle>
              <CardDescription>
                Track changes made to this product over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {productHistory.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <History className="mx-auto h-10 w-10 mb-2 opacity-30" />
                  <p>No history records found for this product</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {productHistory.map((entry) => (
                    <div key={entry.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {entry.field.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            by {entry.user_name}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(entry.changed_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Old Value</div>
                          <div className="text-sm bg-muted/20 p-2 rounded-md max-h-24 overflow-auto">
                            {entry.field === 'tags' ? (
                              entry.old_value ? (
                                <div className="flex flex-wrap gap-1">
                                  {JSON.parse(entry.old_value).map((tag: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">No tags</span>
                              )
                            ) : (
                              entry.old_value || <span className="text-muted-foreground italic">Empty</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">New Value</div>
                          <div className="text-sm bg-muted/20 p-2 rounded-md max-h-24 overflow-auto">
                            {entry.field === 'tags' ? (
                              entry.new_value ? (
                                <div className="flex flex-wrap gap-1">
                                  {JSON.parse(entry.new_value).map((tag: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">No tags</span>
                              )
                            ) : (
                              entry.new_value || <span className="text-muted-foreground italic">Empty</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductDetail;
