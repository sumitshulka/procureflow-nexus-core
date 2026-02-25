
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Package, Users, Barcode, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CreateRfpForProduct from "@/components/product/CreateRfpForProduct";
import ProductPriceHistory from "@/components/product/ProductPriceHistory";
import SuppliersTable from "@/components/product/SuppliersTable";
import SkuManager from "@/components/product/SkuManager";

interface Product {
  id: string;
  name: string;
  description: string;
  classification: string;
  current_price?: number;
  currency?: string;
  tags: string[];
  tracking_type?: string;
  requires_serial_tracking?: boolean;
  category: { name: string };
  unit: { name: string; abbreviation: string };
  tax_code?: { code: string; name: string; rates: Array<{ rate_name: string; rate_percentage: number }> } | null;
  created_by?: { full_name: string } | null;
  created_at: string;
}

const ProductDetail = () => {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product_detail", productId],
    queryFn: async () => {
      if (!productId) throw new Error("Product ID is required");

      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:category_id(name),
          unit:unit_id(name, abbreviation),
          tax_code:tax_code_id(
            code,
            name,
            tax_rates(rate_name, rate_percentage, is_active)
          )
        `)
        .eq("id", productId)
        .single();

      if (error) {
        toast({ title: "Error", description: "Failed to fetch product details", variant: "destructive" });
        throw error;
      }
      if (!data) throw new Error("Product not found");

      let createdBy: { full_name: string } | null = null;
      if (data.created_by) {
        const { data: profileData } = await supabase
          .from("profiles").select("full_name").eq("id", data.created_by).single();
        if (profileData) createdBy = { full_name: profileData.full_name || "Unknown User" };
      }

      let taxCode: any = null;
      if (data.tax_code) {
        const rates = Array.isArray((data as any).tax_code.tax_rates) ? (data as any).tax_code.tax_rates : [];
        taxCode = {
          code: (data as any).tax_code.code,
          name: (data as any).tax_code.name,
          rates: rates.filter((r: any) => r == null || r.is_active == null || r.is_active === true)
            .map((r: any) => ({ rate_name: r.rate_name, rate_percentage: r.rate_percentage })),
        };
      }

      if (!taxCode && data.tax_code_id) {
        const { data: taxCodeData } = await supabase.from("tax_codes").select("code, name").eq("id", data.tax_code_id).single();
        if (taxCodeData) {
          const { data: ratesData } = await supabase.from("tax_rates").select("rate_name, rate_percentage").eq("tax_code_id", data.tax_code_id).eq("is_active", true).order("rate_name");
          taxCode = { code: taxCodeData.code, name: taxCodeData.name, rates: ratesData || [] };
        }
      }

      return {
        id: data.id, name: data.name, description: data.description, classification: data.classification,
        current_price: data.current_price, currency: data.currency, tags: data.tags || [],
        tracking_type: (data as any).tracking_type, requires_serial_tracking: (data as any).requires_serial_tracking,
        category: data.category, unit: data.unit, tax_code: taxCode, created_by: createdBy, created_at: data.created_at,
      } as Product;
    },
    enabled: !!productId,
  });

  const { data: hasPrice } = useQuery({
    queryKey: ["product_has_price", productId],
    queryFn: async () => {
      if (!productId) return false;
      const { data } = await supabase.from("product_price_history").select("id").eq("product_id", productId).limit(1);
      return data && data.length > 0;
    },
    enabled: !!productId,
  });

  const { data: vendors } = useQuery({
    queryKey: ["product_vendors", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("vendor_products")
        .select(`*, vendor_registrations:vendor_id(company_name, vendor_number, status, primary_email, primary_phone, currency)`)
        .eq("product_id", productId).eq("is_active", true).order("registered_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!productId,
  });

  const getTrackingBadge = (type?: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      none: { label: "No Tracking", variant: "outline" },
      batch: { label: "Batch Tracking", variant: "secondary" },
      serial: { label: "Serial Tracking", variant: "default" },
      batch_and_serial: { label: "Batch + Serial", variant: "default" },
    };
    const t = map[type || "none"] || map.none;
    return <Badge variant={t.variant}>{t.label}</Badge>;
  };

  if (isLoading) return <div className="page-container"><div className="flex justify-center py-8">Loading product details...</div></div>;
  if (error) return <div className="page-container"><div className="text-center py-8"><p className="text-destructive mb-4">Error loading product details</p><Button onClick={() => navigate("/products")} className="mt-4">Back to Catalog</Button></div></div>;
  if (!product) return <div className="page-container"><div className="text-center py-8">Product not found</div></div>;

  return (
    <div className="page-container">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate("/products")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Catalog
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{product.name}</h1>
        </div>
        <Button onClick={() => navigate(`/products/${productId}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Product
        </Button>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Product Details</TabsTrigger>
          <TabsTrigger value="skus">
            <Barcode className="h-4 w-4 mr-1" />
            SKU Variants
          </TabsTrigger>
          <TabsTrigger value="pricing">Price History</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Product Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-lg font-semibold">{product.name}</p>
                  </div>
                  {product.description && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <p className="mt-1">{product.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Category</label>
                      <p className="mt-1">{product.category?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Unit</label>
                      <p className="mt-1">{product.unit?.name} ({product.unit?.abbreviation})</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Classification</label>
                      <p className="mt-1 capitalize">{product.classification}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Inventory Tracking</label>
                      <div className="mt-1 flex items-center gap-2">
                        {getTrackingBadge(product.tracking_type)}
                        {product.requires_serial_tracking && (
                          <Badge variant="outline" className="text-xs">Serial Required</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {product.tax_code && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tax Code</label>
                      <div className="mt-1">
                        <p className="font-medium">{product.tax_code.code} - {product.tax_code.name}</p>
                        {product.tax_code.rates.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {product.tax_code.rates.map((rate, i) => (
                              <Badge key={i} variant="secondary">{rate.rate_name}: {rate.rate_percentage}%</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {product.current_price && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Current Price</label>
                      <p className="mt-1 text-lg font-semibold">{product.currency} {product.current_price.toLocaleString()}</p>
                    </div>
                  )}
                  {product.tags && product.tags.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tags</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {product.tags.map((tag, i) => (<Badge key={i} variant="secondary">{tag}</Badge>))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {!hasPrice && <CreateRfpForProduct productId={product.id} productName={product.name} />}
              <Card>
                <CardHeader><CardTitle>Additional Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {product.created_by && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Created By</label>
                      <p className="mt-1">{product.created_by.full_name}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                    <p className="mt-1">{new Date(product.created_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="skus">
          <SkuManager productId={product.id} productName={product.name} />
        </TabsContent>

        <TabsContent value="pricing">
          <ProductPriceHistory productId={product.id} productName={product.name} />
        </TabsContent>

        <TabsContent value="suppliers">
          {vendors && vendors.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Suppliers ({vendors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SuppliersTable suppliers={vendors} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">No suppliers registered for this product.</CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductDetail;
