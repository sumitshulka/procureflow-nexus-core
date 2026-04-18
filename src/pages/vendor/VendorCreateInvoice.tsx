import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Lock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import VendorPOGRNList from '@/components/vendor/VendorPOGRNList';
import { formatCurrency } from '@/utils/currencyUtils';

interface InvoiceItem {
  item_type: 'product' | 'custom' | 'po';
  product_id: string | null;
  po_item_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total_price: number;
  final_amount: number;
  /** For PO-locked items: ordered qty minus already-invoiced qty. */
  max_quantity?: number;
  ordered_quantity?: number;
  already_invoiced?: number;
}

const emptyCustomItem = (): InvoiceItem => ({
  item_type: 'custom',
  product_id: null,
  po_item_id: null,
  description: '',
  quantity: 1,
  unit_price: 0,
  tax_rate: 0,
  total_price: 0,
  final_amount: 0,
});

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
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([emptyCustomItem()]);

  const isPoLocked = !!selectedPO && selectedPO !== 'none';

  // Fetch vendor registration
  const { data: vendorReg } = useQuery({
    queryKey: ['vendor_registration', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('vendor_registrations')
        .select('id, currency')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Default currency from vendor business
  React.useEffect(() => {
    if (vendorReg && !isPoLocked) {
      if (vendorReg.currency) {
        setCurrency(vendorReg.currency);
      } else if (!currency) {
        setCurrency('USD');
        toast.warning('Business currency not set', {
          description: 'Please update your business currency in profile settings for accurate invoicing.',
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorReg, isPoLocked]);

  // Fetch approved POs
  const { data: purchaseOrders } = useQuery({
    queryKey: ['vendor_purchase_orders_for_invoice', vendorReg?.id],
    queryFn: async () => {
      if (!vendorReg?.id) return [];
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, total_amount, currency')
        .eq('vendor_id', vendorReg.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendorReg?.id,
  });

  // Vendor's products (only used when no PO is selected)
  const { data: vendorProducts } = useQuery({
    queryKey: ['vendor_products', vendorReg?.id],
    queryFn: async () => {
      if (!vendorReg?.id) return [];
      const { data, error } = await supabase
        .from('vendor_products')
        .select(`
          id, product_id, vendor_price, vendor_currency,
          products ( id, name, description )
        `)
        .eq('vendor_id', vendorReg.id)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendorReg?.id,
  });

  // Fetch PO items + already-invoiced qty when PO selected
  const { data: poDetails } = useQuery({
    queryKey: ['vendor_po_for_invoice', selectedPO],
    queryFn: async () => {
      if (!isPoLocked) return null;
      const [{ data: po, error: poErr }, { data: invoicedItems, error: invErr }] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select(`
            id, po_number, currency,
            items:purchase_order_items(id, description, quantity, unit_price, tax_rate, product_id)
          `)
          .eq('id', selectedPO)
          .single(),
        supabase
          .from('invoice_items')
          .select('po_item_id, quantity, invoices!inner(purchase_order_id, status)')
          .eq('invoices.purchase_order_id', selectedPO)
          .neq('invoices.status', 'rejected')
          .neq('invoices.status', 'cancelled'),
      ]);
      if (poErr) throw poErr;
      if (invErr) throw invErr;

      const invoicedMap: Record<string, number> = {};
      (invoicedItems || []).forEach((it: any) => {
        if (it.po_item_id) {
          invoicedMap[it.po_item_id] = (invoicedMap[it.po_item_id] || 0) + Number(it.quantity || 0);
        }
      });
      return { po, invoicedMap };
    },
    enabled: isPoLocked,
  });

  // When PO data arrives, replace items + lock currency
  React.useEffect(() => {
    if (!isPoLocked) return;
    if (!poDetails?.po) return;
    const { po, invoicedMap } = poDetails;
    if (po.currency) setCurrency(po.currency);
    const locked: InvoiceItem[] = (po.items || []).map((it: any) => {
      const ordered = Number(it.quantity || 0);
      const invoiced = invoicedMap[it.id] || 0;
      const remaining = Math.max(0, ordered - invoiced);
      const qty = remaining;
      const unitPrice = Number(it.unit_price || 0);
      const taxRate = Number(it.tax_rate || 0);
      const total = qty * unitPrice;
      const final = total + total * (taxRate / 100);
      return {
        item_type: 'po',
        product_id: it.product_id || null,
        po_item_id: it.id,
        description: it.description,
        quantity: qty,
        unit_price: unitPrice,
        tax_rate: taxRate,
        total_price: total,
        final_amount: final,
        ordered_quantity: ordered,
        already_invoiced: invoiced,
        max_quantity: remaining,
      };
    });
    setItems(locked.length > 0 ? locked : [emptyCustomItem()]);
  }, [poDetails, isPoLocked]);

  // When PO is cleared, reset to one custom item
  const handlePoChange = (val: string) => {
    setSelectedPO(val);
    if (val === 'none' || !val) {
      setItems([emptyCustomItem()]);
      if (vendorReg?.currency) setCurrency(vendorReg.currency);
    }
  };

  const addItem = () => setItems([...items, emptyCustomItem()]);

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const target = { ...updated[index], [field]: value } as InvoiceItem;

    // Enforce max quantity for PO-locked items
    if (field === 'quantity' && target.item_type === 'po' && typeof target.max_quantity === 'number') {
      const num = Number(value) || 0;
      if (num > target.max_quantity) {
        toast.warning(`Quantity cannot exceed remaining ${target.max_quantity}`);
        target.quantity = target.max_quantity;
      } else if (num < 0) {
        target.quantity = 0;
      }
    }

    if (field === 'item_type') {
      if (value === 'custom') {
        target.product_id = null;
        target.description = '';
        target.unit_price = 0;
      }
    }

    if (field === 'product_id' && value && target.item_type === 'product') {
      const p = vendorProducts?.find((vp) => vp.product_id === value);
      if (p?.products) {
        target.description = p.products.name;
        if (p.vendor_price) target.unit_price = Number(p.vendor_price);
      }
    }

    target.total_price = (target.quantity || 0) * (target.unit_price || 0);
    target.final_amount = target.total_price + target.total_price * ((target.tax_rate || 0) / 100);
    updated[index] = target;
    setItems(updated);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((s, it) => s + it.total_price, 0);
    const taxAmount = items.reduce((s, it) => s + it.total_price * (it.tax_rate / 100), 0);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      if (!vendorReg?.id) throw new Error('Vendor registration not found');

      // Validation in PO mode: at least one row with quantity > 0
      if (isPoLocked) {
        const hasAny = items.some((it) => (it.quantity || 0) > 0);
        if (!hasAny) throw new Error('Please enter quantity for at least one PO item.');
      }

      const totals = calculateTotals();

      let pdfUrl: string | null = null;
      if (pdfFile) {
        setIsUploadingPdf(true);
        const fileExt = pdfFile.name.split('.').pop();
        const fileName = `${vendorReg.id}/${invoiceNumber}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('invoice-pdfs')
          .upload(fileName, pdfFile, { cacheControl: '3600', upsert: false });
        if (uploadError) {
          setIsUploadingPdf(false);
          throw new Error(`Failed to upload PDF: ${uploadError.message}`);
        }
        const { data: { publicUrl } } = supabase.storage.from('invoice-pdfs').getPublicUrl(fileName);
        pdfUrl = publicUrl;
        setIsUploadingPdf(false);
      }

      const invoiceData = {
        vendor_id: vendorReg.id,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        purchase_order_id: isPoLocked ? selectedPO : null,
        currency,
        subtotal_amount: totals.subtotal,
        tax_amount: totals.taxAmount,
        total_amount: totals.total,
        notes,
        status: isDraft ? 'draft' : 'submitted',
        is_non_po_invoice: !isPoLocked,
        created_by: user!.id,
        invoice_pdf_url: pdfUrl,
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();
      if (invoiceError) throw invoiceError;

      // In PO mode, drop zero-qty rows
      const itemsToInsert = (isPoLocked ? items.filter((it) => (it.quantity || 0) > 0) : items).map((it) => ({
        invoice_id: invoice.id,
        product_id: it.product_id,
        po_item_id: it.po_item_id,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total_price: it.total_price,
        tax_rate: it.tax_rate,
        tax_amount: it.total_price * (it.tax_rate / 100),
        final_amount: it.final_amount,
      }));

      const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;
      return invoice;
    },
    onSuccess: (_inv, isDraft) => {
      toast.success(isDraft ? 'Invoice saved as draft' : 'Invoice submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['vendor_invoices'] });
      navigate('/vendor/invoices');
    },
    onError: (error: any) => {
      console.error('Error creating invoice:', error);
      toast.error(error?.message || 'Failed to create invoice');
    },
  });

  const totals = calculateTotals();

  const canSubmit =
    !!invoiceNumber &&
    !createInvoiceMutation.isPending &&
    !isUploadingPdf &&
    (isPoLocked
      ? items.some((it) => (it.quantity || 0) > 0)
      : items.every((it) => !!it.description));

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <Label htmlFor="currency">
                    Currency * {isPoLocked && <span className="text-xs text-muted-foreground">(from PO)</span>}
                  </Label>
                  <Select value={currency} onValueChange={setCurrency} disabled={isPoLocked}>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Select value={selectedPO} onValueChange={handlePoChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a PO (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Non-PO Invoice)</SelectItem>
                    {purchaseOrders?.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.po_number} — {formatCurrency(Number(po.total_amount || 0), po.currency || 'USD')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isPoLocked && (
                  <p className="text-xs text-muted-foreground">
                    Items below are locked to this PO. You can adjust quantity (≤ remaining) and tax only.
                  </p>
                )}
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

              <div className="space-y-2">
                <Label htmlFor="pdfFile">Attach Invoice PDF (Optional)</Label>
                <Input
                  id="pdfFile"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.type !== 'application/pdf') {
                        toast.error('Please select a PDF file');
                        e.target.value = '';
                        return;
                      }
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error('File size must be less than 10MB');
                        e.target.value = '';
                        return;
                      }
                      setPdfFile(file);
                    }
                  }}
                />
                {pdfFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <CardTitle className="flex items-center gap-2">
                  Line Items
                  {isPoLocked && (
                    <Badge variant="outline" className="gap-1">
                      <Lock className="h-3 w-3" /> Locked to PO
                    </Badge>
                  )}
                </CardTitle>
                {!isPoLocked && (
                  <Button onClick={addItem} size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Add Item
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={item.po_item_id || index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">
                      Item {index + 1}
                      {item.item_type === 'po' && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          Ordered: {item.ordered_quantity} • Already invoiced: {item.already_invoiced} • Remaining: {item.max_quantity}
                        </span>
                      )}
                    </h4>
                    {!isPoLocked && items.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {item.item_type === 'po' ? (
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input value={item.description} readOnly className="bg-muted" />
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="0"
                        max={item.item_type === 'po' ? item.max_quantity : undefined}
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
                        readOnly={item.item_type === 'po'}
                        className={item.item_type === 'po' ? 'bg-muted' : ''}
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

          {/* GRNs for the selected PO */}
          {isPoLocked && <VendorPOGRNList poId={selectedPO} />}
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
                  <span className="font-medium">{formatCurrency(totals.subtotal, currency || 'USD')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span className="font-medium">{formatCurrency(totals.taxAmount, currency || 'USD')}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold">{formatCurrency(totals.total, currency || 'USD')}</span>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Button
                  className="w-full"
                  onClick={() => createInvoiceMutation.mutate(false)}
                  disabled={!canSubmit}
                >
                  {isUploadingPdf ? 'Uploading PDF...' : 'Submit Invoice'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => createInvoiceMutation.mutate(true)}
                  disabled={!canSubmit}
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
