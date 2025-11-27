import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface InvoiceItem {
  item_type: 'product' | 'custom';
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total_price: number;
  final_amount: number;
}

const VendorCreateInvoice = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [selectedPO, setSelectedPO] = useState('');
  const [currency, setCurrency] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([{
    item_type: 'custom',
    product_id: null,
    description: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 0,
    total_price: 0,
    final_amount: 0,
  }]);

  // Fetch vendor registration
  const { data: vendorReg } = useQuery({
    queryKey: ["vendor_registration", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("vendor_registrations")
        .select("id, currency")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Set default currency based on vendor's business currency
  React.useEffect(() => {
    if (vendorReg) {
      if (vendorReg.currency) {
        setCurrency(vendorReg.currency);
      } else {
        setCurrency('USD');
        toast.warning('Business currency not set', {
          description: 'Please update your business currency in profile settings for accurate invoicing.'
        });
      }
    }
  }, [vendorReg]);

  // Fetch approved purchase orders for this vendor
  const { data: purchaseOrders } = useQuery({
    queryKey: ["vendor_purchase_orders", vendorReg?.id],
    queryFn: async () => {
      if (!vendorReg?.id) return [];
      
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, po_number, total_amount, currency")
        .eq("vendor_id", vendorReg.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendorReg?.id,
  });

  // Fetch vendor's registered products
  const { data: vendorProducts } = useQuery({
    queryKey: ["vendor_products", vendorReg?.id],
    queryFn: async () => {
      if (!vendorReg?.id) return [];
      
      const { data, error } = await supabase
        .from("vendor_products")
        .select(`
          id,
          product_id,
          vendor_price,
          vendor_currency,
          products (
            id,
            name,
            description
          )
        `)
        .eq("vendor_id", vendorReg.id)
        .eq("is_active", true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendorReg?.id,
  });

  const addItem = () => {
    setItems([...items, {
      item_type: 'custom',
      product_id: null,
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      total_price: 0,
      final_amount: 0,
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // If switching item type, reset product-specific fields
    if (field === 'item_type') {
      if (value === 'custom') {
        updatedItems[index].product_id = null;
        updatedItems[index].description = '';
        updatedItems[index].unit_price = 0;
      }
    }
    
    // If selecting a product, auto-fill details
    if (field === 'product_id' && value) {
      const product = vendorProducts?.find(vp => vp.product_id === value);
      if (product && product.products) {
        updatedItems[index].description = product.products.name;
        if (product.vendor_price) {
          updatedItems[index].unit_price = Number(product.vendor_price);
        }
      }
    }
    
    // Recalculate totals
    const item = updatedItems[index];
    item.total_price = item.quantity * item.unit_price;
    const taxAmount = item.total_price * (item.tax_rate / 100);
    item.final_amount = item.total_price + taxAmount;
    
    setItems(updatedItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const taxAmount = items.reduce((sum, item) => {
      const tax = item.total_price * (item.tax_rate / 100);
      return sum + tax;
    }, 0);
    const total = subtotal + taxAmount;
    
    return { subtotal, taxAmount, total };
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      if (!vendorReg?.id) throw new Error("Vendor registration not found");
      
      const totals = calculateTotals();
      
      const invoiceData = {
        vendor_id: vendorReg.id,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        purchase_order_id: selectedPO && selectedPO !== 'none' ? selectedPO : null,
        currency,
        subtotal_amount: totals.subtotal,
        tax_amount: totals.taxAmount,
        total_amount: totals.total,
        notes,
        status: isDraft ? 'draft' : 'submitted',
        is_non_po_invoice: !selectedPO,
        created_by: user!.id,
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert(invoiceData)
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Insert invoice items
      const itemsData = items.map(item => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        tax_rate: item.tax_rate,
        tax_amount: item.total_price * (item.tax_rate / 100),
        final_amount: item.final_amount,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(itemsData);

      if (itemsError) throw itemsError;

      return invoice;
    },
    onSuccess: (invoice, isDraft) => {
      toast.success(isDraft ? 'Invoice saved as draft' : 'Invoice submitted successfully');
      queryClient.invalidateQueries({ queryKey: ["vendor_invoices"] });
      navigate('/vendor/invoices');
    },
    onError: (error) => {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    },
  });

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/vendor/invoices')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Invoice</h1>
          <p className="text-muted-foreground">Submit a new invoice for payment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                  <Input
                    id="invoiceNumber"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceDate">Invoice Date *</Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="po">Related Purchase Order (Optional)</Label>
                <Select value={selectedPO} onValueChange={setSelectedPO}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a PO (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {purchaseOrders?.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.po_number} - {po.currency} {Number(po.total_amount).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes or comments..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Line Items</CardTitle>
                <Button onClick={addItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Item Type *</Label>
                    <RadioGroup
                      value={item.item_type}
                      onValueChange={(value) => updateItem(index, 'item_type', value as 'product' | 'custom')}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="product" id={`product-${index}`} />
                        <Label htmlFor={`product-${index}`} className="font-normal cursor-pointer">
                          Select Product
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id={`custom-${index}`} />
                        <Label htmlFor={`custom-${index}`} className="font-normal cursor-pointer">
                          Custom Item
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {item.item_type === 'product' ? (
                    <>
                      <div className="space-y-2">
                        <Label>Select Product *</Label>
                        <Select
                          value={item.product_id || ''}
                          onValueChange={(value) => updateItem(index, 'product_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a product" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendorProducts?.map((vp) => (
                              <SelectItem key={vp.product_id} value={vp.product_id}>
                                {vp.products?.name}
                                {vp.vendor_price && ` - ${vp.vendor_currency || currency} ${Number(vp.vendor_price).toLocaleString()}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {item.product_id && (
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Auto-filled from product"
                            className="bg-muted"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label>Description *</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Item description"
                        required
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Price *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.tax_rate}
                        onChange={(e) => updateItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total</Label>
                      <Input
                        type="text"
                        value={item.final_amount.toFixed(2)}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{currency} {totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span className="font-medium">{currency} {totals.taxAmount.toFixed(2)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold">{currency} {totals.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Button
                  className="w-full"
                  onClick={() => createInvoiceMutation.mutate(false)}
                  disabled={!invoiceNumber || items.some(i => !i.description) || createInvoiceMutation.isPending}
                >
                  Submit Invoice
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => createInvoiceMutation.mutate(true)}
                  disabled={!invoiceNumber || items.some(i => !i.description) || createInvoiceMutation.isPending}
                >
                  Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VendorCreateInvoice;
