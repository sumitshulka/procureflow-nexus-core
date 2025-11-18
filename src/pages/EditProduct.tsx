
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EditProductForm from "@/components/product/EditProductForm";

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
  category: {
    name: string;
  };
  unit: {
    name: string;
    abbreviation: string;
  };
  created_at: string;
}

const EditProduct = () => {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  console.log("EditProduct component - Product ID:", productId);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      console.log("Starting product fetch for editing, ID:", productId);
      
      if (!productId) {
        console.error("Product ID is missing");
        throw new Error("Product ID is required");
      }
      
      console.log("Executing Supabase query for edit...");
      
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:category_id(name),
          unit:unit_id(name, abbreviation)
        `)
        .eq("id", productId)
        .single();

      console.log("Supabase query result for edit:", { data, error });

      if (error) {
        console.error("Supabase error:", error);
        toast({
          title: "Error",
          description: "Failed to fetch product details for editing",
          variant: "destructive",
        });
        throw error;
      }

      if (!data) {
        console.error("No product data returned");
        throw new Error("Product not found");
      }

      console.log("Raw product data from Supabase for edit:", data);

      const transformedProduct: Product = {
        id: data.id,
        name: data.name,
        description: data.description,
        classification: data.classification,
        current_price: data.current_price,
        currency: data.currency,
        tax_code_id: data.tax_code_id,
        tags: data.tags || [],
        category_id: data.category_id,
        unit_id: data.unit_id,
        category: data.category,
        unit: data.unit,
        created_at: data.created_at,
      };

      console.log("Transformed product data for edit:", transformedProduct);
      return transformedProduct;
    },
    enabled: !!productId,
  });

  console.log("EditProduct component state:", { isLoading, error, product });

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex justify-center py-8">Loading product for editing...</div>
      </div>
    );
  }

  if (error) {
    console.error("Query error:", error);
    return (
      <div className="page-container">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">Error loading product for editing</p>
          <p className="text-sm text-gray-600">{error.message}</p>
          <Button onClick={() => navigate("/products")} className="mt-4">
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
        <Button variant="ghost" onClick={() => navigate(`/product/${productId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Product Details
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Edit Product: {product.name}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Edit Product Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EditProductForm product={product} />
        </CardContent>
      </Card>
    </div>
  );
};

export default EditProduct;
