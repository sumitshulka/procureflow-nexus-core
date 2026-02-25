
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { checkAuthentication, logDatabaseError } from "@/utils/supabaseHelpers";
import { Package, DollarSign, Box, Tags, AlertCircle, X } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  unitId: z.string().min(1, "Unit is required"),
  classification: z.string().min(1, "Classification is required"),
  currentPrice: z.string().optional(),
  currency: z.string().optional(),
  taxCodeId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  trackingType: z.string().default("none"),
  requiresSerialTracking: z.boolean().default(false),
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
  tracking_type?: string;
  requires_serial_tracking?: boolean;
}

interface EditProductFormProps {
  product: Product;
}

const EditProductForm = ({ product }: EditProductFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState("");

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
      tags: product.tags || [],
      trackingType: product.tracking_type || "none",
      requiresSerialTracking: product.requires_serial_tracking || false,
    },
  });

  const watchTrackingType = form.watch("trackingType");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: classifications = [] } = useQuery({
    queryKey: ["product_classifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_classifications").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: taxCodes = [] } = useQuery({
    queryKey: ["tax_codes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tax_codes").select("*").eq("is_active", true).order("code");
      if (error) throw error;
      return data;
    },
  });

  React.useEffect(() => {
    const vals = form.getValues();
    if (!vals.categoryId && product.category_id) form.setValue("categoryId", product.category_id);
    if (!vals.unitId && product.unit_id) form.setValue("unitId", product.unit_id);
    if ((vals.taxCodeId === undefined || vals.taxCodeId === "") && product.tax_code_id) {
      form.setValue("taxCodeId", product.tax_code_id);
    }
  }, [categories, units, taxCodes, product, form]);

  const handleAddTag = () => {
    if (newTag.trim()) {
      const currentTags = form.getValues("tags") || [];
      if (!currentTags.includes(newTag.trim())) {
        form.setValue("tags", [...currentTags, newTag.trim()]);
      }
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove));
  };

  const updateProductMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const user = await checkAuthentication();
      if (!user) throw new Error("Authentication required");

      const productData = {
        name: values.name,
        description: values.description || null,
        category_id: values.categoryId,
        unit_id: values.unitId,
        classification: values.classification,
        current_price: values.currentPrice ? parseFloat(values.currentPrice) : null,
        currency: values.currency || "USD",
        tax_code_id: (values.taxCodeId === undefined || values.taxCodeId === '') ? product.tax_code_id : values.taxCodeId,
        tags: values.tags || [],
        tracking_type: values.trackingType,
        requires_serial_tracking: values.requiresSerialTracking,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", product.id)
        .select()
        .single();

      if (error) {
        logDatabaseError(error, "update product");
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Product updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      queryClient.invalidateQueries({ queryKey: ["product_detail", product.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate(`/product/${product.id}`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update product. Please try again.", variant: "destructive" });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    updateProductMutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">

        {/* Section 1: Basic Information */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Basic Information</CardTitle>
                <CardDescription>Core product identification and categorization</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="Enter product name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter product description, specifications, or notes" className="min-h-[80px] resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="categoryId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {categories?.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="unitId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit of Measure <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {units?.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="classification" render={({ field }) => (
                <FormItem>
                  <FormLabel>Classification <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select classification" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {classifications.map((c) => (<SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Pricing & Tax */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Pricing & Tax</CardTitle>
                <CardDescription>Current pricing and applicable tax configuration</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="currentPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Price</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="currency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="USD">USD — US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR — Euro</SelectItem>
                      <SelectItem value="GBP">GBP — British Pound</SelectItem>
                      <SelectItem value="JPY">JPY — Japanese Yen</SelectItem>
                      <SelectItem value="CNY">CNY — Chinese Yuan</SelectItem>
                      <SelectItem value="INR">INR — Indian Rupee</SelectItem>
                      <SelectItem value="CAD">CAD — Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD — Australian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="taxCodeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Code</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select tax code" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {taxCodes.map((tc) => (<SelectItem key={tc.id} value={tc.id}>{tc.code} — {tc.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Inventory Tracking Configuration */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Box className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Inventory Tracking Configuration</CardTitle>
                <CardDescription>Define how this product is tracked in warehouses — batches, serial numbers, or both</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField control={form.control} name="trackingType" render={({ field }) => (
              <FormItem>
                <FormLabel>Tracking Method</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select tracking type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">None — Basic quantity tracking only</SelectItem>
                    <SelectItem value="batch">Batch — Track by lot number, expiry date (FEFO supported)</SelectItem>
                    <SelectItem value="serial">Serial — Individual unit serial number tracking</SelectItem>
                    <SelectItem value="batch_and_serial">Batch + Serial — Full traceability per unit within batches</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {watchTrackingType === "batch" && (
              <div className="flex items-start gap-3 rounded-md border border-border bg-muted/50 p-3">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Batch Tracking Enabled</p>
                  <p>Each check-in will require a batch/lot number and optional expiry date. Check-outs will follow <strong>FEFO</strong> (First Expired, First Out) ordering with manual override capability.</p>
                </div>
              </div>
            )}

            {watchTrackingType === "serial" && (
              <div className="flex items-start gap-3 rounded-md border border-border bg-muted/50 p-3">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Serial Number Tracking Enabled</p>
                  <p>Every individual unit will be assigned a unique serial number during check-in, enabling full lifecycle traceability.</p>
                </div>
              </div>
            )}

            {watchTrackingType === "batch_and_serial" && (
              <div className="flex items-start gap-3 rounded-md border border-border bg-muted/50 p-3">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Full Traceability (Batch + Serial)</p>
                  <p>Products will be tracked at both batch and individual serial levels for complete supply chain visibility.</p>
                </div>
              </div>
            )}

            {(watchTrackingType === "serial" || watchTrackingType === "batch_and_serial") && (
              <FormField control={form.control} name="requiresSerialTracking" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">Mandatory Serial Number</FormLabel>
                    <FormDescription className="text-xs">
                      When enabled, check-in transactions will require serial numbers for every unit
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />
            )}
          </CardContent>
        </Card>

        {/* Section 4: Tags */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Tags className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Tags & Labels</CardTitle>
                <CardDescription>Searchable tags for filtering and categorization</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Type a tag and press Enter or click Add"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="max-w-sm"
              />
              <Button type="button" onClick={handleAddTag} variant="outline" size="sm">
                Add
              </Button>
            </div>
            {(form.watch("tags") || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {(form.watch("tags") || []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1 pl-2.5 pr-1.5 py-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={updateProductMutation.isPending} size="lg">
            {updateProductMutation.isPending ? "Updating Product..." : "Update Product"}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => navigate(`/product/${product.id}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default EditProductForm;
