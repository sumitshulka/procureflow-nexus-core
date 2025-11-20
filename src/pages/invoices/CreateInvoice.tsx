import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { parseAddress } from "@/types/vendor";
import { formatCurrencyAmount, amountToWords } from "@/utils/numberFormatting";

interface InvoiceItem {
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_details: Array<{ name: string; rate: number }> | null;
  discount_rate: number;
}

const CreateInvoice = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isNonPO, setIsNonPO] = useState(false);
  const [selectedPO, setSelectedPO] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedPOLineItems, setSelectedPOLineItems] = useState<string[]>([]);
  const [isTimeAndMaterial, setIsTimeAndMaterial] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [currency, setCurrency] = useState("");
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryDesignation, setSignatoryDesignation] = useState("");
  const [nonPOJustification, setNonPOJustification] = useState("");
  const [notes, setNotes] = useState("");
  const [timeMaterialAmount, setTimeMaterialAmount] = useState(0);
  const [invoicePdfFile, setInvoicePdfFile] = useState<File | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([
    { product_id: null, description: "", quantity: 1, unit_price: 0, tax_rate: 0, tax_details: null, discount_rate: 0 }
  ]);

  const { data: vendors } = useQuery({
    queryKey: ["all-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_registrations")
        .select("id, company_name, vendor_number")
        .eq("status", "approved")
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: selectedVendorDetails } = useQuery({
    queryKey: ["vendor-details", selectedVendor],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_registrations")
        .select("*")
        .eq("id", selectedVendor)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedVendor,
  });

  // Auto-detect currency when vendor is selected for non-PO invoices
  useEffect(() => {
    if (isNonPO && selectedVendorDetails) {
      setCurrency(selectedVendorDetails.currency || 'USD');
    }
  }, [isNonPO, selectedVendorDetails]);

  const { data: products } = useQuery({
    queryKey: ["products-with-tax"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`id, name, current_price, currency, tax_code_id, tax_codes (id, code, name, tax_rates (rate_name, rate_percentage))`)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: purchaseOrders } = useQuery({
    queryKey: ["vendor-pos", selectedVendor],
    queryFn: async () => {
      if (!selectedVendor) return [];
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, po_number, po_date, final_amount, currency")
        .eq("vendor_id", selectedVendor)
        .in("status", ["approved", "partially_invoiced"])
        .order("po_date", { ascending: false });
      if (error) throw error;

      const posWithPending = await Promise.all(
        (data || []).map(async (po) => {
          const { data: invoices } = await supabase
            .from("invoices")
            .select("total_amount")
            .eq("purchase_order_id", po.id)
            .neq("status", "cancelled");
          const invoicedAmount = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
          return { ...po, pending_amount: Number(po.final_amount) - invoicedAmount };
        })
      );
      return posWithPending.filter(po => po.pending_amount > 0);
    },
    enabled: !isNonPO && !!selectedVendor,
  });

  // Set currency when PO is selected
  const selectedPOData = purchaseOrders?.find(po => po.id === selectedPO);
  if (selectedPOData && selectedPOData.currency && currency !== selectedPOData.currency) {
    setCurrency(selectedPOData.currency);
  }

  const { data: poLineItems } = useQuery({
    queryKey: ["po-items", selectedPO],
    queryFn: async () => {
      if (!selectedPO) return [];
      const { data, error } = await supabase
        .from("purchase_order_items")
        .select("id, description, quantity, unit_price, tax_rate, total_price, final_amount, product_id")
        .eq("po_id", selectedPO);
      if (error) throw error;
      return data;
    },
    enabled: !isNonPO && !!selectedPO && !isTimeAndMaterial,
  });

  const handleProductSelect = async (index: number, productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (!product || !selectedVendor) return;

    let taxRate = 0;
    let taxDetails = null;

    // Get tax rates from product
    const taxRates = product.tax_codes?.tax_rates || [];
    
    if (taxRates.length > 0) {
      // Fetch vendor location
      const { data: vendorData } = await supabase
        .from('vendor_registrations')
        .select('registered_address, business_address')
        .eq('id', selectedVendor)
        .single();
      
      // Fetch organization location (first active location as buyer location)
      const { data: orgLocation } = await supabase
        .from('locations')
        .select('state, country')
        .eq('is_active', true)
        .limit(1)
        .single();
      
      // Determine vendor state using parseAddress
      const vendorAddr = parseAddress(vendorData?.business_address || vendorData?.registered_address);
      const vendorState = vendorAddr.state;
      const buyerState = orgLocation?.state;
      
      // Determine if intra-state or inter-state
      const isIntraState = vendorState && buyerState && vendorState === buyerState;
      
      // Filter applicable tax rates
      if (isIntraState) {
        // Intra-state: Use CGST + SGST (exclude IGST)
        const applicableRates = taxRates.filter((r: any) => 
          r.rate_name !== 'IGST' && (r.rate_name === 'CGST' || r.rate_name === 'SGST')
        );
        taxRate = applicableRates.reduce((sum: number, r: any) => sum + Number(r.rate_percentage), 0);
        taxDetails = applicableRates.map((r: any) => ({ 
          name: r.rate_name, 
          rate: Number(r.rate_percentage) 
        }));
      } else {
        // Inter-state: Use IGST only (exclude CGST, SGST)
        const applicableRates = taxRates.filter((r: any) => r.rate_name === 'IGST');
        taxRate = applicableRates.reduce((sum: number, r: any) => sum + Number(r.rate_percentage), 0);
        taxDetails = applicableRates.map((r: any) => ({ 
          name: r.rate_name, 
          rate: Number(r.rate_percentage) 
        }));
      }
    }

    // Get product price and currency from vendor_products if available
    const { data: vendorProduct } = await supabase
      .from('vendor_products')
      .select('vendor_price, vendor_currency')
      .eq('vendor_id', selectedVendor)
      .eq('product_id', productId)
      .single();

    const unitPrice = vendorProduct?.vendor_price 
      ? Number(vendorProduct.vendor_price) 
      : Number(product.current_price) || 0;

    // Set currency from vendor product if available and not already set
    if (vendorProduct?.vendor_currency && !currency) {
      setCurrency(vendorProduct.vendor_currency);
    }

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      product_id: productId,
      description: product.name,
      unit_price: unitPrice,
      tax_rate: taxRate,
      tax_details: taxDetails
    };
    setItems(newItems);
  };

  const handlePOLineItemToggle = (itemId: string) => {
    setSelectedPOLineItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      if (!selectedVendor) throw new Error("Vendor required");
      
      // Use the provided invoice number or generate a new one
      let finalInvoiceNumber = invoiceNumber.trim();
      if (!finalInvoiceNumber) {
        const { data: lastInvoice } = await supabase.from("invoices").select("invoice_number").order("created_at", { ascending: false }).limit(1).single();
        const lastNumber = lastInvoice?.invoice_number?.match(/\d+$/)?.[0] || "0";
        finalInvoiceNumber = `INV-${String(Number(lastNumber) + 1).padStart(6, "0")}`;
      }

      let subtotal = 0, totalTax = 0, totalDiscount = 0;
      if (isTimeAndMaterial && !isNonPO) {
        subtotal = timeMaterialAmount;
      } else if (!isNonPO && selectedPOLineItems.length > 0) {
        const selectedItems = poLineItems?.filter(item => selectedPOLineItems.includes(item.id)) || [];
        selectedItems.forEach(item => {
          subtotal += Number(item.total_price);
          totalTax += Number(item.total_price) * (Number(item.tax_rate) / 100);
        });
      } else {
        invoiceData.items.forEach((item: InvoiceItem) => {
          const itemTotal = item.quantity * item.unit_price;
          subtotal += itemTotal;
          totalTax += itemTotal * (item.tax_rate / 100);
          totalDiscount += itemTotal * (item.discount_rate / 100);
        });
      }

      // Upload invoice PDF if provided
      let invoicePdfUrl = null;
      if (invoicePdfFile) {
        const fileExt = invoicePdfFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user!.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('invoice-documents')
          .upload(filePath, invoicePdfFile);
        
        if (uploadError) throw uploadError;
        invoicePdfUrl = filePath;
      }

      const { data: invoice, error: invoiceError } = await supabase.from("invoices").insert({
        invoice_number: finalInvoiceNumber,
        vendor_id: selectedVendor,
        purchase_order_id: !isNonPO && selectedPO ? selectedPO : null,
        is_non_po_invoice: isNonPO,
        non_po_justification: isNonPO ? nonPOJustification : null,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        currency,
        subtotal_amount: subtotal,
        tax_amount: totalTax,
        discount_amount: totalDiscount,
        total_amount: subtotal + totalTax - totalDiscount,
        signatory_name: signatoryName || null,
        signatory_designation: signatoryDesignation || null,
        notes: notes || null,
        invoice_pdf_url: invoicePdfUrl,
        status: "submitted",
        created_by: user!.id,
      }).select().single();
      if (invoiceError) throw invoiceError;

      if (isTimeAndMaterial && !isNonPO) {
        await supabase.from("invoice_items").insert({ 
          invoice_id: invoice.id, description: "Time & Material Services", quantity: 1, 
          unit_price: timeMaterialAmount, total_price: timeMaterialAmount, 
          final_amount: timeMaterialAmount, tax_rate: 0, tax_amount: 0 
        });
      } else if (!isNonPO && selectedPOLineItems.length > 0) {
        const selectedItems = poLineItems?.filter(item => selectedPOLineItems.includes(item.id)) || [];
        await supabase.from("invoice_items").insert(selectedItems.map(item => ({
          invoice_id: invoice.id, po_item_id: item.id, product_id: item.product_id, 
          description: item.description, quantity: item.quantity, unit_price: item.unit_price, 
          total_price: item.total_price, tax_rate: item.tax_rate,
          tax_amount: Number(item.total_price) * (Number(item.tax_rate) / 100), 
          final_amount: item.final_amount
        })));
      } else {
        await supabase.from("invoice_items").insert(invoiceData.items.map((item: InvoiceItem) => {
          const itemTotal = item.quantity * item.unit_price;
          return {
            invoice_id: invoice.id, product_id: item.product_id, description: item.description, 
            quantity: item.quantity, unit_price: item.unit_price, total_price: itemTotal, 
            tax_rate: item.tax_rate, tax_amount: itemTotal * (item.tax_rate / 100), 
            discount_rate: item.discount_rate, discount_amount: itemTotal * (item.discount_rate / 100),
            final_amount: itemTotal + itemTotal * (item.tax_rate / 100) - itemTotal * (item.discount_rate / 100)
          };
        }));
      }
      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Success", description: "Invoice created" });
      navigate("/invoices");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addItem = () => setItems([...items, { product_id: null, description: "", quantity: 1, unit_price: 0, tax_rate: 0, tax_details: null, discount_rate: 0 }]);
  const removeItem = (index: number) => items.length > 1 && setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotals = () => {
    if (isTimeAndMaterial && !isNonPO) return { subtotal: timeMaterialAmount, tax: 0, discount: 0, total: timeMaterialAmount };
    if (!isNonPO && selectedPOLineItems.length > 0 && poLineItems) {
      const selected = poLineItems.filter(item => selectedPOLineItems.includes(item.id));
      const subtotal = selected.reduce((sum, item) => sum + Number(item.total_price), 0);
      const tax = selected.reduce((sum, item) => sum + (Number(item.total_price) * Number(item.tax_rate) / 100), 0);
      return { subtotal, tax, discount: 0, total: subtotal + tax };
    }
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = items.reduce((sum, item) => sum + (item.quantity * item.unit_price * item.tax_rate / 100), 0);
    const discount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price * item.discount_rate / 100), 0);
    return { subtotal, tax, discount, total: subtotal + tax - discount };
  };

  const totals = calculateTotals();
  
  // Determine if Indian currency (INR) for proper formatting
  const isIndianCurrency = currency === 'INR';
  const formattedSubtotal = formatCurrencyAmount(totals.subtotal, currency || 'USD', isIndianCurrency);
  const formattedTax = formatCurrencyAmount(totals.tax, currency || 'USD', isIndianCurrency);
  const formattedDiscount = formatCurrencyAmount(totals.discount, currency || 'USD', isIndianCurrency);
  const formattedTotal = formatCurrencyAmount(totals.total, currency || 'USD', isIndianCurrency);
  const totalInWords = amountToWords(totals.total, currency || 'USD', isIndianCurrency);

  return (
    <div className="container mx-auto py-6">
      <PageHeader title="Create Invoice" />
      <form onSubmit={(e) => { e.preventDefault(); createInvoiceMutation.mutate({ items }); }} className="space-y-6">
        
        <Card>
          <CardHeader><CardTitle>Invoice Type</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="nonPO" checked={isNonPO} onCheckedChange={(checked) => { setIsNonPO(checked as boolean); setSelectedPO(""); setSelectedPOLineItems([]); setIsTimeAndMaterial(false); }} />
              <Label htmlFor="nonPO">Non-PO Invoice</Label>
            </div>
            <div className="space-y-2">
              <Label>Select Vendor *</Label>
              <Select value={selectedVendor} onValueChange={(value) => { setSelectedVendor(value); setSelectedPO(""); setSelectedPOLineItems([]); }}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>{vendors?.map((vendor) => (<SelectItem key={vendor.id} value={vendor.id}>{vendor.company_name} ({vendor.vendor_number})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            {isNonPO ? (
              <div className="space-y-2">
                <Label>Justification *</Label>
                <Textarea value={nonPOJustification} onChange={(e) => setNonPOJustification(e.target.value)} placeholder="Explain why..." />
              </div>
            ) : selectedVendor && (
              <>
                <div className="space-y-2">
                  <Label>Select Purchase Order *</Label>
                  <Select value={selectedPO} onValueChange={(value) => { setSelectedPO(value); setSelectedPOLineItems([]); setIsTimeAndMaterial(false); }}>
                    <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
                    <SelectContent>{purchaseOrders?.map((po) => (<SelectItem key={po.id} value={po.id}>{po.po_number} - {new Date(po.po_date).toLocaleDateString()} - {po.currency} {po.pending_amount.toFixed(2)} pending</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                {selectedPO && (
                  <div className="flex items-center space-x-2">
                    <Checkbox id="timeAndMaterial" checked={isTimeAndMaterial} onCheckedChange={(checked) => { setIsTimeAndMaterial(checked as boolean); setSelectedPOLineItems([]); }} />
                    <Label htmlFor="timeAndMaterial">Time & Material Invoice</Label>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {selectedVendor && selectedVendorDetails && (() => {
          const billingAddr = parseAddress(selectedVendorDetails.billing_address);
          const registeredAddr = parseAddress(selectedVendorDetails.registered_address);
          const businessAddr = parseAddress(selectedVendorDetails.business_address);
          
          return (
            <Card>
              <CardHeader><CardTitle>Vendor Information</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground">Company</Label><p className="font-medium">{selectedVendorDetails.company_name}</p></div>
                  <div><Label className="text-muted-foreground">Vendor #</Label><p className="font-medium">{selectedVendorDetails.vendor_number}</p></div>
                  {selectedVendorDetails.gst_number && <div><Label className="text-muted-foreground">GST</Label><p>{selectedVendorDetails.gst_number}</p></div>}
                  {selectedVendorDetails.pan_number && <div><Label className="text-muted-foreground">PAN</Label><p>{selectedVendorDetails.pan_number}</p></div>}
                  {billingAddr.street && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Billing Address</Label>
                      <p className="text-sm">{billingAddr.street}, {billingAddr.city}, {billingAddr.state} - {billingAddr.postal_code}, {billingAddr.country}</p>
                    </div>
                  )}
                  {registeredAddr.street && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Registered Address</Label>
                      <p className="text-sm">{registeredAddr.street}, {registeredAddr.city}, {registeredAddr.state} - {registeredAddr.postal_code}, {registeredAddr.country}</p>
                    </div>
                  )}
                  {businessAddr.street && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Business Address</Label>
                      <p className="text-sm">{businessAddr.street}, {businessAddr.city}, {businessAddr.state} - {businessAddr.postal_code}, {businessAddr.country}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {!isNonPO && selectedPO && (
          <Card>
            <CardHeader><CardTitle>{isTimeAndMaterial ? "Time & Material Amount" : "Select Line Items"}</CardTitle></CardHeader>
            <CardContent>
              {isTimeAndMaterial ? (
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input type="number" step="0.01" value={timeMaterialAmount} onChange={(e) => setTimeMaterialAmount(Number(e.target.value))} />
                  {selectedPOData && <p className="text-sm text-muted-foreground">Max: {currency} {selectedPOData.pending_amount.toFixed(2)}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  {poLineItems?.map((item) => (
                    <div key={item.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox checked={selectedPOLineItems.includes(item.id)} onCheckedChange={() => handlePOLineItemToggle(item.id)} />
                      <div className="flex-1">
                        <div className="font-medium">{item.description}</div>
                        <div className="text-sm text-muted-foreground">Qty: {item.quantity} × {currency} {item.unit_price} = {currency} {item.total_price}</div>
                        {item.tax_rate > 0 && <div className="text-sm text-muted-foreground">Tax: {item.tax_rate}%</div>}
                      </div>
                      <div className="font-medium">{currency} {item.final_amount}</div>
                    </div>
                  ))}
                  {(!poLineItems || poLineItems.length === 0) && <p className="text-muted-foreground text-center py-4">No line items found</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isNonPO && (
          <Card>
            <CardHeader><CardTitle>Invoice Items</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {items.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}><Trash2 className="w-4 h-4" /></Button>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Product (Optional)</Label>
                      <Select value={item.product_id || ""} onValueChange={(value) => handleProductSelect(index, value)}>
                        <SelectTrigger><SelectValue placeholder="Select or enter manually" /></SelectTrigger>
                        <SelectContent>{products?.map((product) => (<SelectItem key={product.id} value={product.id}>{product.name} - {product.currency} {product.current_price}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Description *</Label>
                      <Input value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} disabled={!!item.product_id} />
                    </div>
                    <div className="space-y-2"><Label>Quantity *</Label><Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, "quantity", Number(e.target.value))} /></div>
                    <div className="space-y-2"><Label>Unit Price *</Label><Input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", Number(e.target.value))} disabled={!!item.product_id} /></div>
                    <div className="space-y-2">
                      <Label>Tax Rate (%)</Label>
                      {item.product_id && item.tax_details ? (
                        <div className="p-2 border rounded-md bg-muted">
                          {item.tax_details.map((tax, idx) => (<div key={idx} className="text-sm">{tax.name}: {tax.rate}%</div>))}
                          <div className="text-sm font-medium mt-1">Total: {item.tax_rate}%</div>
                        </div>
                      ) : (<Input type="number" step="0.01" value={item.tax_rate} onChange={(e) => updateItem(index, "tax_rate", Number(e.target.value))} />)}
                    </div>
                    <div className="space-y-2"><Label>Discount Rate (%)</Label><Input type="number" step="0.01" value={item.discount_rate} onChange={(e) => updateItem(index, "discount_rate", Number(e.target.value))} /></div>
                  </div>
                  <div className="flex justify-end"><div className="text-right"><Label className="text-muted-foreground">Item Total</Label><p className="text-lg font-medium">{currency} {(item.quantity * item.unit_price * (1 + item.tax_rate / 100) * (1 - item.discount_rate / 100)).toFixed(2)}</p></div></div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addItem} className="w-full"><Plus className="w-4 h-4 mr-2" />Add Item</Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input 
                  value={invoiceNumber} 
                  onChange={(e) => setInvoiceNumber(e.target.value)} 
                  placeholder="Leave blank to auto-generate"
                />
                <p className="text-xs text-muted-foreground">Enter vendor's invoice number or leave blank to auto-generate</p>
              </div>
              <div className="space-y-2"><Label>Invoice Date *</Label><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input 
                  value={currency || (isNonPO ? 'Select vendor first' : 'Select PO first')} 
                  readOnly 
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {isNonPO ? 'Auto-detected from vendor' : 'Auto-detected from Purchase Order'}
                </p>
              </div>
              <div className="space-y-2"><Label>Signatory Name</Label><Input value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Signatory Designation</Label><Input value={signatoryDesignation} onChange={(e) => setSignatoryDesignation(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>Invoice PDF Attachment</Label>
              <Input 
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setInvoicePdfFile(file);
                  }
                }}
              />
              {invoicePdfFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {invoicePdfFile.name} ({(invoicePdfFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Invoice Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between"><span>Subtotal:</span><span className="font-medium">{formattedSubtotal}</span></div>
            <div className="flex justify-between"><span>Tax:</span><span className="font-medium">{formattedTax}</span></div>
            {totals.discount > 0 && <div className="flex justify-between text-red-600"><span>Discount:</span><span className="font-medium">-{formattedDiscount}</span></div>}
            <Separator />
            <div className="flex justify-between text-lg font-bold"><span>Total:</span><span>{formattedTotal}</span></div>
            <Separator className="my-3" />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Amount in Words:</p>
              <p className="text-sm font-semibold italic leading-relaxed">{totalInWords}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate("/invoices")}>Cancel</Button>
          <Button type="submit" disabled={createInvoiceMutation.isPending || !selectedVendor || (!isNonPO && !selectedPO) || (!isNonPO && !isTimeAndMaterial && selectedPOLineItems.length === 0) || (!isNonPO && isTimeAndMaterial && (timeMaterialAmount <= 0 || (selectedPOData && timeMaterialAmount > selectedPOData.pending_amount))) || (isNonPO && !nonPOJustification) || (isNonPO && items.some(item => !item.description || item.quantity <= 0 || item.unit_price < 0))}>Create Invoice</Button>
        </div>
      </form>
    </div>
  );
};

export default CreateInvoice;
