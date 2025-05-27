
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BoqItem {
  id: string;
  product_id?: string;
  product_name: string;
  description: string;
  quantity: number;
  unit: string;
  estimated_rate: number;
  total_amount: number;
  specifications?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
}

interface RfpBoqProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
}

const RfpBoq: React.FC<RfpBoqProps> = ({ data, onUpdate, onNext }) => {
  const { toast } = useToast();
  const [boqItems, setBoqItems] = useState<BoqItem[]>(data.boqItems || []);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data: productsData, error } = await supabase
        .from("products")
        .select("id, name, description")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProducts(productsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch products",
        variant: "destructive",
      });
    }
  };

  const addBoqItem = () => {
    const newItem: BoqItem = {
      id: Date.now().toString(),
      product_name: "",
      description: "",
      quantity: 1,
      unit: "each",
      estimated_rate: 0,
      total_amount: 0,
    };
    setBoqItems([...boqItems, newItem]);
  };

  const removeBoqItem = (id: string) => {
    setBoqItems(boqItems.filter(item => item.id !== id));
  };

  const updateBoqItem = (id: string, field: keyof BoqItem, value: any) => {
    const updatedItems = boqItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Auto-calculate total amount
        if (field === 'quantity' || field === 'estimated_rate') {
          updated.total_amount = updated.quantity * updated.estimated_rate;
        }
        
        // If product is selected, auto-fill details
        if (field === 'product_id' && value) {
          const selectedProduct = products.find(p => p.id === value);
          if (selectedProduct) {
            updated.product_name = selectedProduct.name;
            updated.description = selectedProduct.description || "";
          }
        }
        
        return updated;
      }
      return item;
    });
    setBoqItems(updatedItems);
  };

  const handleContinue = () => {
    if (boqItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the BOQ",
        variant: "destructive",
      });
      return;
    }

    const hasEmptyItems = boqItems.some(item => !item.product_name || item.quantity <= 0);
    if (hasEmptyItems) {
      toast({
        title: "Error",
        description: "Please fill in all required fields for BOQ items",
        variant: "destructive",
      });
      return;
    }

    onUpdate({ boqItems });
    onNext();
  };

  const totalValue = boqItems.reduce((sum, item) => sum + item.total_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Bill of Quantities (BOQ)</h3>
        <Button onClick={addBoqItem} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="space-y-4">
        {boqItems.map((item, index) => (
          <Card key={item.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Item {index + 1}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeBoqItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Product</label>
                  <Select
                    value={item.product_id || ""}
                    onValueChange={(value) => updateBoqItem(item.id, "product_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Product Name</label>
                  <Input
                    value={item.product_name}
                    onChange={(e) => updateBoqItem(item.id, "product_name", e.target.value)}
                    placeholder="Enter product name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateBoqItem(item.id, "description", e.target.value)}
                    placeholder="Enter description"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateBoqItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                    min="1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Unit</label>
                  <Select
                    value={item.unit}
                    onValueChange={(value) => updateBoqItem(item.id, "unit", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="each">Each</SelectItem>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="liter">Liter</SelectItem>
                      <SelectItem value="meter">Meter</SelectItem>
                      <SelectItem value="piece">Piece</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Estimated Rate</label>
                  <Input
                    type="number"
                    value={item.estimated_rate}
                    onChange={(e) => updateBoqItem(item.id, "estimated_rate", parseFloat(e.target.value) || 0)}
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Total Amount</label>
                  <Input
                    value={item.total_amount.toFixed(2)}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {boqItems.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Estimated Value:</span>
              <span>{data.basicInfo?.currency || 'USD'} {totalValue.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleContinue}>
          Continue to Vendor Selection
        </Button>
      </div>
    </div>
  );
};

export default RfpBoq;
