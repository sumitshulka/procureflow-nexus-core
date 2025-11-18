import { useState } from "react";
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
import { Plus, Trash2, Upload } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_rate: number;
}

const CreateInvoice = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isNonPO, setIsNonPO] = useState(false);
  const [selectedPO, setSelectedPO] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryDesignation, setSignatoryDesignation] = useState("");
  const [nonPOJustification, setNonPOJustification] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }
  ]);

  // Fetch vendor's purchase orders
  const { data: purchaseOrders } = useQuery({
    queryKey: ["vendor-purchase-orders"],
    queryFn: async () => {
      const { data: vendorReg } = await supabase
        .from("vendor_registrations")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!vendorReg) return [];

      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, purchase_order_items(*)")
        .eq("vendor_id", vendorReg.id)
        .eq("status", "approved");

      if (error) throw error;
      return data;
    },
    enabled: !isNonPO,
  });

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateItemTotal = (item: InvoiceItem) => {
    const subtotal = item.quantity * item.unit_price;
    const discount = subtotal * (item.discount_rate / 100);
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * (item.tax_rate / 100);
    return afterDiscount + tax;
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const discount = items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price * (item.discount_rate / 100)), 0
    );
    const afterDiscount = subtotal - discount;
    const tax = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unit_price;
      const itemDiscount = itemSubtotal * (item.discount_rate / 100);
      return sum + ((itemSubtotal - itemDiscount) * (item.tax_rate / 100));
    }, 0);
    const total = afterDiscount + tax;

    return { subtotal, discount, tax, total };
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const { data: vendorReg } = await supabase
        .from("vendor_registrations")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!vendorReg) throw new Error("Vendor registration not found");

      const totals = calculateTotals();

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          vendor_id: vendorReg.id,
          purchase_order_id: isNonPO ? null : selectedPO || null,
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          currency,
          subtotal_amount: totals.subtotal,
          tax_amount: totals.tax,
          discount_amount: totals.discount,
          total_amount: totals.total,
          is_non_po_invoice: isNonPO,
          non_po_justification: isNonPO ? nonPOJustification : null,
          signatory_name: signatoryName,
          signatory_designation: signatoryDesignation,
          notes,
          status: "submitted",
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Insert invoice items
      const invoiceItems = items.map(item => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        tax_amount: (item.quantity * item.unit_price - item.quantity * item.unit_price * (item.discount_rate / 100)) * (item.tax_rate / 100),
        discount_rate: item.discount_rate,
        discount_amount: item.quantity * item.unit_price * (item.discount_rate / 100),
        total_price: item.quantity * item.unit_price,
        final_amount: calculateItemTotal(item),
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      return invoice;
    },
    onSuccess: (invoice) => {
      toast({
        title: "Success",
        description: `Invoice ${invoice.invoice_number} created successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      navigate(`/invoices/${invoice.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const totals = calculateTotals();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Create Invoice"
        description="Create a new invoice for a purchase order"
      />

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Non-PO Invoice Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="non-po"
              checked={isNonPO}
              onCheckedChange={(checked) => setIsNonPO(checked as boolean)}
            />
            <Label htmlFor="non-po" className="text-sm font-medium">
              This is a non-PO invoice
            </Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isNonPO && (
              <div className="space-y-2">
                <Label>Purchase Order *</Label>
                <Select value={selectedPO} onValueChange={setSelectedPO}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select PO" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseOrders?.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.po_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Invoice Date *</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Currency *</Label>
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

          {isNonPO && (
            <div className="space-y-2">
              <Label>Justification for Non-PO Invoice *</Label>
              <Textarea
                value={nonPOJustification}
                onChange={(e) => setNonPOJustification(e.target.value)}
                placeholder="Explain why this invoice doesn't require a PO..."
                required
              />
            </div>
          )}

          <Separator />

          {/* Invoice Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Invoice Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-2 space-y-2">
                      <Label>Description *</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        placeholder="Item description"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
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
                        onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Total</Label>
                      <Input
                        value={calculateItemTotal(item).toFixed(2)}
                        disabled
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tax Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.tax_rate}
                        onChange={(e) => updateItem(index, "tax_rate", parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Discount (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.discount_rate}
                        onChange={(e) => updateItem(index, "discount_rate", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Separator />

          {/* Signatory Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Authorized Signatory</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Designation *</Label>
                <Input
                  value={signatoryDesignation}
                  onChange={(e) => setSignatoryDesignation(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
            />
          </div>

          <Separator />

          {/* Totals */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-medium">{currency} {totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Discount:</span>
              <span className="font-medium">-{currency} {totals.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax:</span>
              <span className="font-medium">{currency} {totals.tax.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{currency} {totals.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/invoices")}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createInvoiceMutation.mutate()}
              disabled={createInvoiceMutation.isPending || items.length === 0}
            >
              Create Invoice
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateInvoice;
