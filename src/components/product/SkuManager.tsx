import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Barcode, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ProductSku {
  id: string;
  sku_code: string;
  name: string;
  variant_attributes: Record<string, string>;
  barcode: string | null;
  is_active: boolean;
  created_at: string;
}

interface SkuAttribute {
  id: string;
  attribute_name: string;
  display_order: number;
  is_required: boolean;
}

interface SkuManagerProps {
  productId: string;
  productName: string;
  categoryId?: string;
}

const SkuManager = ({ productId, productName, categoryId }: SkuManagerProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingSku, setEditingSku] = useState<ProductSku | null>(null);
  const [skuCode, setSkuCode] = useState("");
  const [skuName, setSkuName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});

  const { data: resolvedCategoryId } = useQuery({
    queryKey: ["product-category-id", productId, categoryId],
    queryFn: async () => {
      if (categoryId) return categoryId;
      const { data, error } = await supabase
        .from("products")
        .select("category_id")
        .eq("id", productId)
        .single();
      if (error) throw error;
      return data.category_id as string;
    },
    enabled: !!productId,
  });

  // Fetch category SKU attributes
  const { data: categoryAttributes = [] } = useQuery({
    queryKey: ["category-sku-attributes", resolvedCategoryId],
    queryFn: async () => {
      if (!resolvedCategoryId) return [];
      const { data, error } = await supabase
        .from("category_sku_attributes")
        .select("*")
        .eq("category_id", resolvedCategoryId)
        .order("display_order");
      if (error) throw error;
      return data as SkuAttribute[];
    },
    enabled: !!resolvedCategoryId,
  });

  const { data: skus = [], isLoading } = useQuery({
    queryKey: ["product-skus", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_skus")
        .select("*")
        .eq("product_id", productId)
        .order("sku_code");
      if (error) throw error;
      return (data || []) as ProductSku[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Build attributes from category-defined keys + user-entered values
      const attributes: Record<string, string> = {};
      categoryAttributes.forEach((attr) => {
        const val = attrValues[attr.attribute_name]?.trim();
        if (val) {
          attributes[attr.attribute_name] = val;
        } else if (attr.is_required) {
          throw new Error(`"${attr.attribute_name}" is required`);
        }
      });

      const payload = {
        product_id: productId,
        sku_code: skuCode.trim(),
        name: skuName.trim(),
        variant_attributes: attributes,
        barcode: barcode.trim() || null,
        created_by: user?.id,
      };

      if (editingSku) {
        const { error } = await supabase
          .from("product_skus")
          .update(payload)
          .eq("id", editingSku.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("product_skus")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Success", description: `SKU ${editingSku ? "updated" : "created"} successfully` });
      queryClient.invalidateQueries({ queryKey: ["product-skus", productId] });
      queryClient.invalidateQueries({ queryKey: ["inventory_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (skuId: string) => {
      const { error } = await supabase
        .from("product_skus")
        .update({ is_active: false })
        .eq("id", skuId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "SKU deactivated" });
      queryClient.invalidateQueries({ queryKey: ["product-skus", productId] });
    },
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingSku(null);
    setSkuCode("");
    setSkuName("");
    setBarcode("");
    setAttrValues({});
  };

  const openEditDialog = (sku: ProductSku) => {
    setEditingSku(sku);
    setSkuCode(sku.sku_code);
    setSkuName(sku.name);
    setBarcode(sku.barcode || "");
    setAttrValues(sku.variant_attributes || {});
    setShowDialog(true);
  };

  const openCreateDialog = () => {
    resetForm();
    // Pre-populate attribute keys with empty values
    const defaults: Record<string, string> = {};
    categoryAttributes.forEach(a => { defaults[a.attribute_name] = ""; });
    setAttrValues(defaults);
    setShowDialog(true);
  };

  const hasAttributes = categoryAttributes.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Barcode className="h-4 w-4" />
            SKU Variants ({skus.filter(s => s.is_active).length})
          </CardTitle>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1" />
            Add SKU
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasAttributes && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 mb-4">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              No SKU attributes are defined for this product's category. Go to <strong>Settings → Master Data → Categories</strong> and configure SKU attributes (e.g., Color, Size) for the category first.
            </p>
          </div>
        )}

        {skus.filter(s => s.is_active).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No SKU variants defined. Add SKUs to track inventory at the variant level.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skus.filter(s => s.is_active).map((sku) => (
                <TableRow key={sku.id}>
                  <TableCell className="font-mono font-medium">{sku.sku_code}</TableCell>
                  <TableCell>{sku.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(sku.variant_attributes || {}).map(([key, val]) => (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {key}: {val}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{sku.barcode || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(sku)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(sku.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingSku ? "Edit SKU" : "Add SKU Variant"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>SKU Code *</Label>
                <Input value={skuCode} onChange={(e) => setSkuCode(e.target.value)} placeholder="e.g., LAPTOP-16GB-512" />
              </div>
              <div>
                <Label>Variant Name *</Label>
                <Input value={skuName} onChange={(e) => setSkuName(e.target.value)} placeholder="e.g., 16GB RAM / 512GB SSD" />
              </div>
              <div>
                <Label>Barcode</Label>
                <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="EAN / UPC barcode" />
              </div>

              {/* Category-driven attribute fields */}
              {hasAttributes ? (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Variant Attributes</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Attributes inherited from category. Enter a value for each.
                  </p>
                  <div className="space-y-3">
                    {categoryAttributes.map((attr) => (
                      <div key={attr.id}>
                        <Label className="text-xs">
                          {attr.attribute_name} {attr.is_required && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                          placeholder={`Enter ${attr.attribute_name.toLowerCase()}...`}
                          value={attrValues[attr.attribute_name] || ""}
                          onChange={(e) =>
                            setAttrValues((prev) => ({ ...prev, [attr.attribute_name]: e.target.value }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-3">
                  <p className="text-xs text-muted-foreground text-center">
                    No category attributes configured. SKU will be created without variant attributes.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!skuCode.trim() || !skuName.trim() || saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingSku ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SkuManager;
