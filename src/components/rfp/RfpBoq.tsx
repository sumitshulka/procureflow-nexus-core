
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Users, Globe, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

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
  mode?: string;
}

interface Vendor {
  id: string;
  company_name: string;
  primary_email: string;
  status: string;
}

const RfpBoq: React.FC<RfpBoqProps> = ({ data, onUpdate, onNext, mode }) => {
  const { toast } = useToast();
  const [boqItems, setBoqItems] = useState<BoqItem[]>(data.boqItems || []);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>(data.vendors || []);
  const [isPublic, setIsPublic] = useState<boolean>(data.isPublic || false);
  const [publicLink, setPublicLink] = useState<string>(data.publicLink || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    if (mode === 'quick') {
      fetchVendors();
      generatePublicLink();
    }
  }, [mode]);

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

  const fetchVendors = async () => {
    try {
      const { data: vendorsData, error } = await supabase
        .from("vendor_registrations")
        .select("id, company_name, primary_email, status")
        .eq("status", "approved")
        .order("company_name");

      if (error) throw error;
      setVendors(vendorsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch vendors",
        variant: "destructive",
      });
    }
  };

  const generatePublicLink = () => {
    const baseUrl = window.location.origin;
    const rfpId = Date.now().toString();
    const link = `${baseUrl}/public/rfp/${rfpId}`;
    setPublicLink(link);
  };

  const handleVendorToggle = (vendorId: string) => {
    setSelectedVendors(prev => 
      prev.includes(vendorId) 
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      toast({
        title: "Success",
        description: "Public link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
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

    // For quick mode, also validate vendor selection
    if (mode === 'quick' && !isPublic && selectedVendors.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one vendor or make the RFP public",
        variant: "destructive",
      });
      return;
    }

    const updateData = { 
      boqItems,
      ...(mode === 'quick' && {
        vendors: selectedVendors,
        isPublic,
        publicLink: isPublic ? publicLink : undefined,
      })
    };

    onUpdate(updateData);
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

      {/* Vendor Selection for Quick Start Mode */}
      {mode === 'quick' && (
        <div className="space-y-6 pt-6 border-t">
          <div>
            <h3 className="text-lg font-medium mb-4">Vendor Selection</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Choose how you want to distribute this RFP - select specific vendors for a closed RFP or make it public for open bidding.
            </p>
          </div>

          <Tabs defaultValue={isPublic ? "public" : "closed"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="closed" 
                onClick={() => setIsPublic(false)}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Closed RFP
              </TabsTrigger>
              <TabsTrigger 
                value="public" 
                onClick={() => setIsPublic(true)}
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                Public RFP
              </TabsTrigger>
            </TabsList>

            <TabsContent value="closed" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Select Vendors</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choose specific vendors to invite for this RFP. Only selected vendors will be able to view and respond.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {vendors.map(vendor => (
                      <div key={vendor.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Checkbox
                          id={vendor.id}
                          checked={selectedVendors.includes(vendor.id)}
                          onCheckedChange={() => handleVendorToggle(vendor.id)}
                        />
                        <div className="flex-1">
                          <Label htmlFor={vendor.id} className="font-medium cursor-pointer">
                            {vendor.company_name}
                          </Label>
                          <p className="text-sm text-muted-foreground">{vendor.primary_email}</p>
                        </div>
                        <Badge variant="outline">{vendor.status}</Badge>
                      </div>
                    ))}
                  </div>
                  
                  {selectedVendors.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">
                        {selectedVendors.length} vendor(s) selected
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="public" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Public RFP Link</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Generate a public link that can be shared on your website or with potential vendors.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="publicLink">Public RFP Link</Label>
                    <div className="flex space-x-2 mt-1">
                      <Input
                        id="publicLink"
                        value={publicLink}
                        readOnly
                        className="bg-gray-50"
                      />
                      <Button onClick={copyPublicLink} variant="outline" size="icon">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This link will be generated after the RFP is created and published
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Public RFP Benefits:</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Wider vendor participation</li>
                      <li>• Increased competition and better pricing</li>
                      <li>• Easy sharing via website or email</li>
                      <li>• Automatic vendor registration process</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleContinue}>
          {mode === 'quick' ? 'Continue to Review' : 'Continue to Vendor Selection'}
        </Button>
      </div>
    </div>
  );
};

export default RfpBoq;
