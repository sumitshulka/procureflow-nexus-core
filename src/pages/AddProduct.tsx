
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import PageHeader from "@/components/common/PageHeader";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Product form validation schema
const productSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category_id: z.string().min(1, "Category is required"),
  classification: z.enum(["goods", "services"], {
    required_error: "Classification is required",
  }),
  unit_id: z.string().min(1, "Unit is required"),
  currentPrice: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Price must be a positive number",
  }),
});

// Fetch categories from Supabase
const fetchCategories = async () => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

// Fetch units from Supabase
const fetchUnits = async () => {
  const { data, error } = await supabase
    .from("units")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

const AddProduct = () => {
  const navigate = useNavigate();
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const { user } = useAuth();

  // Fetch categories and units
  const { 
    data: categories, 
    isLoading: isLoadingCategories, 
    error: categoriesError 
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { 
    data: units, 
    isLoading: isLoadingUnits, 
    error: unitsError 
  } = useQuery({
    queryKey: ["units"],
    queryFn: fetchUnits,
  });

  // Form setup
  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      category_id: "",
      classification: "goods",
      unit_id: "",
      currentPrice: "",
    },
  });

  // Create product mutation
  const createProduct = useMutation({
    mutationFn: async (values: z.infer<typeof productSchema> & { tags: string[] }) => {
      const { error } = await supabase
        .from("products")
        .insert({
          name: values.name,
          description: values.description,
          category_id: values.category_id,
          classification: values.classification,
          unit_id: values.unit_id,
          current_price: parseFloat(values.currentPrice),
          tags: values.tags,
          created_by: user?.id,
        });

      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Product created",
        description: "The product has been successfully created",
      });
      navigate("/catalog");
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle tag addition
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && currentTag.trim() !== "") {
      e.preventDefault();
      if (!tags.includes(currentTag.trim().toLowerCase())) {
        setTags([...tags, currentTag.trim().toLowerCase()]);
        setCurrentTag("");
      } else {
        toast({
          title: "Tag already exists",
          description: "This tag has already been added",
          variant: "destructive",
        });
      }
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Form submission
  const onSubmit = async (values: z.infer<typeof productSchema>) => {
    createProduct.mutate({ ...values, tags });
  };

  // Show error messages if data fetching fails
  useEffect(() => {
    if (categoriesError) {
      toast({
        title: "Failed to load categories",
        description: "Please try again later",
        variant: "destructive",
      });
    }

    if (unitsError) {
      toast({
        title: "Failed to load units",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  }, [categoriesError, unitsError]);

  return (
    <div className="page-container">
      <PageHeader
        title="Add New Product"
        description="Create a new product in the catalog"
        actions={
          <div className="space-x-2">
            <Button variant="outline" onClick={() => navigate("/catalog")}>
              Cancel
            </Button>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={createProduct.isPending}
            >
              {createProduct.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : "Save Product"}
            </Button>
          </div>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
          {/* Basic Information */}
          <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      defaultValue={field.value}
                      disabled={isLoadingCategories}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingCategories ? (
                          <SelectItem value="loading" disabled>
                            <span className="flex items-center">
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading categories...
                            </span>
                          </SelectItem>
                        ) : categories && categories.length > 0 ? (
                          categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No categories found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
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
          </div>

          {/* Classification & Units */}
          <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
            <h3 className="text-lg font-medium">Classification & Units</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="classification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classification</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
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
                    <FormDescription>
                      Determine if this is a physical good or a service
                    </FormDescription>
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
                      defaultValue={field.value}
                      disabled={isLoadingUnits}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingUnits ? (
                          <SelectItem value="loading" disabled>
                            <span className="flex items-center">
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading units...
                            </span>
                          </SelectItem>
                        ) : units && units.length > 0 ? (
                          units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.name} {unit.abbreviation ? `(${unit.abbreviation})` : ''}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No units found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Unit of measurement
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Price (USD)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
            <h3 className="text-lg font-medium">Tags</h3>
            <div className="space-y-4">
              <div>
                <FormLabel htmlFor="tags">Add Tags</FormLabel>
                <Input
                  id="tags"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Type a tag and press Enter"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Press Enter to add a new tag
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="px-2 py-1 text-sm flex items-center gap-1"
                  >
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <span className="text-sm text-muted-foreground italic">
                    No tags added yet
                  </span>
                )}
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AddProduct;
