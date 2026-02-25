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
import { Plus, Edit, Trash2, Barcode, Package } from "lucide-react";
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

interface SkuManagerProps {
  productId: string;
  productName: string;
}

const SkuManager = ({ productId, productName }: SkuManagerProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingSku, setEditingSku] = useState<ProductSku | null>(null);
  const [skuCode, setSkuCode] = useState("");
  const [skuName, setSkuName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [variantKeys, setVariantKeys] = useState<string[]>([""]);
  const [variantValues, setVariantValues] = useState<string[]>([""]);

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
      const attributes: Record<string, string> = {};
      variantKeys.forEach((key, i) => {
        if (key.trim() && variantValues[i]?.trim()) {
          attributes[key.trim()] = variantValues[i].trim();
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
    setVariantKeys([""]);
    setVariantValues([""]);
  };

  const openEditDialog = (sku: ProductSku) => {
    setEditingSku(sku);
    setSkuCode(sku.sku_code);
    setSkuName(sku.name);
    setBarcode(sku.barcode || "");
    const attrs = sku.variant_attributes || {};
    const keys = Object.keys(attrs);
    setVariantKeys(keys.length > 0 ? keys : [""]);
    setVariantValues(keys.length > 0 ? keys.map(k => attrs[k]) : [""]);
    setShowDialog(true);
  };

  const addVariantRow = () => {
    setVariantKeys([...variantKeys, ""]);
    setVariantValues([...variantValues, ""]);
  };

  const removeVariantRow = (index: number) => {
    setVariantKeys(variantKeys.filter((_, i) => i !== index));
    setVariantValues(variantValues.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Barcode className="h-4 w-4" />
            SKU Variants ({skus.filter(s => s.is_active).length})
          </CardTitle>
          <Button size="sm" onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add SKU
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Variant Attributes</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addVariantRow}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                {variantKeys.map((key, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input
                      placeholder="Attribute (e.g., Color)"
                      value={key}
                      onChange={(e) => {
                        const newKeys = [...variantKeys];
                        newKeys[i] = e.target.value;
                        setVariantKeys(newKeys);
                      }}
                    />
                    <Input
                      placeholder="Value (e.g., Black)"
                      value={variantValues[i]}
                      onChange={(e) => {
                        const newVals = [...variantValues];
                        newVals[i] = e.target.value;
                        setVariantValues(newVals);
                      }}
                    />
                    {variantKeys.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => removeVariantRow(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
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
