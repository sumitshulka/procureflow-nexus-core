
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import CreateRfpForProduct from "@/components/product/CreateRfpForProduct";
import { X, ArrowLeft, Package, DollarSign, Barcode, Hash, Tags, Box, AlertCircle } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  unitId: z.string().min(1, "Unit is required"),
  classificationId: z.string().optional(),
  classification: z.string().min(1, "Classification is required"),
  currentPrice: z.number().min(0, "Price must be positive").optional(),
  currency: z.string().min(1, "Currency is required"),
  taxCodeId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  trackingType: z.string().default("none"),
  requiresSerialTracking: z.boolean().default(false),
});

type ProductFormData = z.infer<typeof productSchema>;

const AddProduct = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [showRfpOption, setShowRfpOption] = useState(false);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  const { data: orgSettings } = useQuery({
    queryKey: ["organization_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: units = [] } = useQuery({
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

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      unitId: "",
      classificationId: "",
      classification: "",
      currentPrice: undefined,
      currency: orgSettings?.base_currency || "USD",
      taxCodeId: "",
      tags: [],
      trackingType: "none",
      requiresSerialTracking: false,
    },
  });

  useEffect(() => {
    if (orgSettings?.base_currency) {
      form.setValue("currency", orgSettings.base_currency);
    }
  }, [orgSettings, form]);

  const watchTrackingType = form.watch("trackingType");

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

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      const { data: product, error } = await supabase
        .from("products")
        .insert({
          name: data.name,
          description: data.description,
          category_id: data.categoryId,
          unit_id: data.unitId,
          classification_id: data.classificationId,
          classification: data.classification,
          current_price: data.currentPrice,
          currency: data.currency,
          tax_code_id: data.taxCodeId || null,
          tags: data.tags || [],
          tracking_type: data.trackingType,
          requires_serial_tracking: data.requiresSerialTracking,
        })
        .select()
        .single();

      if (error) throw error;

      if (data.currentPrice) {
        await supabase
          .from("product_price_history")
          .insert({
            product_id: product.id,
            price: data.currentPrice,
            currency: data.currency,
            source_type: "manual",
            notes: "Initial price set during product creation",
          });
      }

      toast({ title: "Success", description: "Product created successfully" });
      queryClient.invalidateQueries({ queryKey: ["products"] });

      if (!data.currentPrice) {
        setCreatedProductId(product.id);
        setShowRfpOption(true);
      } else {
        navigate("/products");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create product", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showRfpOption && createdProductId) {
    return (
      <div className="page-container max-w-3xl">
        <CreateRfpForProduct
          productName={form.getValues("name")}
          productId={createdProductId}
          onCreateRfp={() => {
            toast({ title: "Redirecting", description: "Taking you to RFP creation..." });
          }}
        />
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => navigate("/products")} className="flex-1">
            Skip for Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/products")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Product</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define product details, inventory tracking, and pricing configuration
          </p>
        </div>
      </div>

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
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} />
                    </FormControl>
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
                      <Textarea placeholder="Enter product description, specifications, or notes" className="min-h-[80px] resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
                      <FormLabel>Unit of Measure <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>
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
                      <FormLabel>Classification <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select classification" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classifications.map((c) => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  <CardDescription>Set initial pricing and applicable tax configuration</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="currentPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Leave blank if price is TBD via RFP</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                        </FormControl>
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
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxCodeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Code</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select tax code" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {taxCodes.map((tc) => (
                            <SelectItem key={tc.id} value={tc.id}>{tc.code} — {tc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              <FormField
                control={form.control}
                name="trackingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select tracking type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None — Basic quantity tracking only</SelectItem>
                        <SelectItem value="batch">Batch — Track by lot number, expiry date (FEFO supported)</SelectItem>
                        <SelectItem value="serial">Serial — Individual unit serial number tracking</SelectItem>
                        <SelectItem value="batch_and_serial">Batch + Serial — Full traceability per unit within batches</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contextual info based on tracking type */}
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
                    <p>Every individual unit will be assigned a unique serial number during check-in, enabling full lifecycle traceability from receipt to issue.</p>
                  </div>
                </div>
              )}

              {watchTrackingType === "batch_and_serial" && (
                <div className="flex items-start gap-3 rounded-md border border-border bg-muted/50 p-3">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Full Traceability (Batch + Serial)</p>
                    <p>Products will be tracked at both batch and individual serial levels. Each serial number will be associated with a specific batch for complete supply chain visibility.</p>
                  </div>
                </div>
              )}

              {(watchTrackingType === "serial" || watchTrackingType === "batch_and_serial") && (
                <FormField
                  control={form.control}
                  name="requiresSerialTracking"
                  render={({ field }) => (
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
                  )}
                />
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
                  <CardDescription>Add searchable tags for filtering and categorization</CardDescription>
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
            <Button type="submit" disabled={isSubmitting} size="lg">
              {isSubmitting ? "Creating Product..." : "Create Product"}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={() => navigate("/products")}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AddProduct;
