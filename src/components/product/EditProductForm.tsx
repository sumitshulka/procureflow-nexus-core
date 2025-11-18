
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { checkAuthentication, logDatabaseError } from "@/utils/supabaseHelpers";

const formSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  unitId: z.string().min(1, "Unit is required"),
  classification: z.string().min(1, "Classification is required"),
  currentPrice: z.string().optional(),
  currency: z.string().optional(),
  taxCodeId: z.string().optional(),
  tags: z.string().optional(),
});

interface Product {
  id: string;
  name: string;
  description: string;
  classification: string;
  current_price?: number;
  currency?: string;
  tax_code_id?: string;
  tags: string[];
  category_id: string;
  unit_id: string;
}

interface EditProductFormProps {
  product: Product;
}

const EditProductForm = ({ product }: EditProductFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product.name || "",
      description: product.description || "",
      categoryId: product.category_id || "",
      unitId: product.unit_id || "",
      classification: product.classification || "",
      currentPrice: product.current_price?.toString() || "",
      currency: product.currency || "USD",
      taxCodeId: product.tax_code_id || "",
      tags: product.tags?.join(", ") || "",
    },
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Fetch units
  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Fetch tax codes
  const { data: taxCodes = [] } = useQuery({
    queryKey: ["tax_codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_codes")
        .select("*")
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      return data;
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      console.log("[EditProductForm] Starting product update with values:", values);

      const user = await checkAuthentication();
      if (!user) {
        throw new Error("Authentication required");
      }

      const productData = {
        name: values.name,
        description: values.description || null,
        category_id: values.categoryId,
        unit_id: values.unitId,
        classification: values.classification,
        current_price: values.currentPrice ? parseFloat(values.currentPrice) : null,
        currency: values.currency || "USD",
        tax_code_id: values.taxCodeId || null,
        tags: values.tags ? values.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
        updated_at: new Date().toISOString(),
      };

      console.log("[EditProductForm] Updating product with data:", productData);

      const { data, error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", product.id)
        .select()
        .single();

      console.log("[EditProductForm] Update result:", { data, error });

      if (error) {
        logDatabaseError(error, "update product");
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      console.log("[EditProductForm] Product updated successfully:", data);
      
      toast({
        title: "Success",
        description: "Product updated successfully",
      });

      // Invalidate and refetch product queries
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });

      // Navigate back to product detail page
      navigate(`/product/${product.id}`);
    },
    onError: (error) => {
      console.error("[EditProductForm] Update failed:", error);
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log("[EditProductForm] Form submitted with values:", values);
    updateProductMutation.mutate(values);
  };

  return (
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
                    <SelectItem value="works">Works</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryId"
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
                    {categories?.map((category) => (
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
            name="unitId"
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
                    {units?.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name} ({unit.abbreviation})
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
            name="currentPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Price</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
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
        </div>

        <FormField
          control={form.control}
          name="taxCodeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tax Code (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tax code" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  
                  {taxCodes.map((taxCode) => (
                    <SelectItem key={taxCode.id} value={taxCode.id}>
                      {taxCode.code} - {taxCode.name}
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter product description"
                  className="min-h-[100px]"
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input placeholder="Enter tags separated by commas" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit" disabled={updateProductMutation.isPending}>
            {updateProductMutation.isPending ? "Updating..." : "Update Product"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/product/${product.id}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default EditProductForm;
