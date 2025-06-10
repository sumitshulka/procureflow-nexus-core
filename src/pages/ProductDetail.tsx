import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CreateRfpForProduct from "@/components/product/CreateRfpForProduct";
import ProductPriceHistory from "@/components/product/ProductPriceHistory";

interface Product {
  id: string;
  name: string;
  description: string;
  classification: string;
  current_price?: number;
  currency?: string;
  tags: string[];
  category: {
    name: string;
  };
  unit: {
    name: string;
    abbreviation: string;
  };
  created_by?: {
    full_name: string;
  } | null;
  created_at: string;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  console.log("ProductDetail component - Product ID:", id);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      console.log("Starting product fetch for ID:", id);
      
      if (!id) {
        console.error("Product ID is missing");
        throw new Error("Product ID is required");
      }
      
      console.log("Executing Supabase query...");
      
      // First fetch the product with its category and unit
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:category_id(name),
          unit:unit_id(name, abbreviation)
        `)
        .eq("id", id)
        .single();

      console.log("Supabase query result:", { data, error });

      if (error) {
        console.error("Supabase error:", error);
        toast({
          title: "Error",
          description: "Failed to fetch product details",
          variant: "destructive",
        });
        throw error;
      }

      if (!data) {
        console.error("No product data returned");
        throw new Error("Product not found");
      }

      console.log("Raw product data from Supabase:", data);

      // Fetch creator profile separately if created_by exists
      let createdBy: { full_name: string } | null = null;
      
      if (data.created_by) {
        console.log("Fetching creator profile for ID:", data.created_by);
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.created_by)
          .single();
          
        if (!profileError && profileData) {
          createdBy = { full_name: profileData.full_name || "Unknown User" };
        } else {
          console.log("Could not fetch creator profile:", profileError);
        }
      }

      const transformedProduct: Product = {
        id: data.id,
        name: data.name,
        description: data.description,
        classification: data.classification,
        current_price: data.current_price,
        currency: data.currency,
        tags: data.tags || [],
        category: data.category,
        unit: data.unit,
        created_by: createdBy,
        created_at: data.created_at,
      };

      console.log("Transformed product data:", transformedProduct);
      return transformedProduct;
    },
    enabled: !!id,
  });

  const { data: hasPrice } = useQuery({
    queryKey: ["product_has_price", id],
    queryFn: async () => {
      if (!id) return false;
      
      const { data, error } = await supabase
        .from("product_price_history")
        .select("id")
        .eq("product_id", id)
        .limit(1);

      if (error) {
        console.error("Error checking price history:", error);
        return false;
      }

      return data && data.length > 0;
    },
    enabled: !!id,
  });

  console.log("Component state:", { isLoading, error, product });

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex justify-center py-8">Loading product details...</div>
      </div>
    );
  }

  if (error) {
    console.error("Query error:", error);
    return (
      <div className="page-container">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">Error loading product details</p>
          <p className="text-sm text-gray-600">{error.message}</p>
          <Button onClick={() => navigate("/catalog")} className="mt-4">
            Back to Catalog
          </Button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-container">
        <div className="text-center py-8">Product not found</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate("/catalog")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Catalog
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{product.name}</h1>
        </div>
        <Button onClick={() => navigate(`/products/${id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Product
        </Button>
      </div>

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

              <div>
                <label className="text-sm font-medium text-muted-foreground">Classification</label>
                <p className="mt-1 capitalize">{product.classification}</p>
              </div>

              {product.current_price && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Price</label>
                  <p className="mt-1 text-lg font-semibold">
                    {product.currency} {product.current_price.toLocaleString()}
                  </p>
                </div>
              )}

              {product.tags && product.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tags</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {product.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Price History Section */}
          <ProductPriceHistory productId={product.id} productName={product.name} />
        </div>

        <div className="space-y-6">
          {/* Show RFP creation prompt if no price history exists */}
          {!hasPrice && (
            <CreateRfpForProduct
              productId={product.id}
              productName={product.name}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
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
    </div>
  );
};

export default ProductDetail;
