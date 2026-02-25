
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EditProductForm from "@/components/product/EditProductForm";

const EditProduct = () => {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      if (!productId) throw new Error("Product ID is required");

      const { data, error } = await supabase
        .from("products")
        .select(`*, category:category_id(name), unit:unit_id(name, abbreviation)`)
        .eq("id", productId)
        .single();

      if (error) {
        toast({ title: "Error", description: "Failed to fetch product details for editing", variant: "destructive" });
        throw error;
      }
      if (!data) throw new Error("Product not found");

      return {
        id: data.id, name: data.name, description: data.description, classification: data.classification,
        current_price: data.current_price, currency: data.currency, tax_code_id: data.tax_code_id,
        tags: data.tags || [], category_id: data.category_id, unit_id: data.unit_id,
        tracking_type: (data as any).tracking_type, requires_serial_tracking: (data as any).requires_serial_tracking,
        category: data.category, unit: data.unit, created_at: data.created_at,
      };
    },
    enabled: !!productId,
  });

  if (isLoading) {
    return <div className="page-container"><div className="flex justify-center py-8 text-muted-foreground">Loading product for editing...</div></div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="text-center py-8">
          <p className="text-destructive mb-2">Error loading product for editing</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button onClick={() => navigate("/products")} className="mt-4">Back to Catalog</Button>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="page-container"><div className="text-center py-8 text-muted-foreground">Product not found</div></div>;
  }

  return (
    <div className="page-container">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/product/${productId}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Product</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Editing: <span className="font-medium text-foreground">{product.name}</span>
          </p>
        </div>
      </div>

      <EditProductForm product={product} />
    </div>
  );
};

export default EditProduct;
