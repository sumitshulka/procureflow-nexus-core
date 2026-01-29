import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateGRN, usePOItemsForGRN, useMatchingSettings } from '@/hooks/useGRN';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Loader2, AlertTriangle, Package } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/currencyUtils';
import type { CreateGRNItemInput } from '@/types/grn';

interface GRNItemForm extends CreateGRNItemInput {
  product_name?: string;
  pending_qty?: number;
}

const CreateGRN = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPoId = searchParams.get('po');

  const [selectedPoId, setSelectedPoId] = useState<string>(preselectedPoId || '');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [receiptDate, setReceiptDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [remarks, setRemarks] = useState('');
  const [discrepancies, setDiscrepancies] = useState('');
  const [items, setItems] = useState<GRNItemForm[]>([]);
  const [overReceiptWarnings, setOverReceiptWarnings] = useState<string[]>([]);

  const createGRN = useCreateGRN();
  const { data: matchingSettings } = useMatchingSettings();

  // Fetch POs that can receive goods
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['pos-for-grn'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          final_amount,
          currency,
          delivery_status,
          vendor:vendor_registrations(company_name)
        `)
        .in('status', ['approved', 'sent', 'acknowledged', 'in_progress'])
        .neq('delivery_status', 'fully_received')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  // Fetch PO items when PO is selected
  const { data: poItems = [], isLoading: loadingItems } = usePOItemsForGRN(selectedPoId);

  // Initialize items when PO items are loaded
  useEffect(() => {
    if (poItems.length > 0) {
      const formItems: GRNItemForm[] = poItems.map((item: any) => ({
        po_item_id: item.id,
        product_id: item.product_id,
        quantity_ordered: item.quantity_ordered,
        quantity_received: 0,
        quantity_accepted: 0,
        quantity_rejected: 0,
        unit_price: item.unit_price,
        description: item.description,
        product_name: item.product?.name,
        pending_qty: item.quantity_pending,
        batch_number: '',
        condition_remarks: '',
        rejection_reason: '',
      }));
      setItems(formItems);
    } else {
      setItems([]);
    }
  }, [poItems]);

  // Check for over-receipt warnings
  useEffect(() => {
    const warnings: string[] = [];
    items.forEach((item, index) => {
      if (item.quantity_accepted > (item.pending_qty || 0)) {
        warnings.push(`Item ${index + 1}: Quantity exceeds pending (${item.pending_qty})`);
      }
    });
    setOverReceiptWarnings(warnings);
  }, [items]);

  const handleQuantityChange = (index: number, field: 'quantity_received' | 'quantity_accepted' | 'quantity_rejected', value: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-calculate if received changed
    if (field === 'quantity_received') {
      newItems[index].quantity_accepted = value;
      newItems[index].quantity_rejected = 0;
    }
    
    // Ensure accepted + rejected = received
    if (field === 'quantity_accepted') {
      newItems[index].quantity_rejected = newItems[index].quantity_received - value;
    }
    if (field === 'quantity_rejected') {
      newItems[index].quantity_accepted = newItems[index].quantity_received - value;
    }
    
    setItems(newItems);
  };

  const handleItemFieldChange = (index: number, field: keyof GRNItemForm, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!selectedPoId || !warehouseId) return;

    const validItems = items.filter(item => item.quantity_received > 0);
    if (validItems.length === 0) {
      return;
    }

    // Check for over-receipt without authorization
    if (overReceiptWarnings.length > 0 && !matchingSettings?.allow_over_receipt) {
      return;
    }

    await createGRN.mutateAsync({
      purchase_order_id: selectedPoId,
      warehouse_id: warehouseId,
      receipt_date: receiptDate,
      remarks,
      discrepancies,
      items: validItems,
    });

    navigate('/grn');
  };

  const selectedPO = purchaseOrders.find((po: any) => po.id === selectedPoId);
  const totalValue = items.reduce((sum, item) => sum + (item.quantity_accepted * item.unit_price), 0);
  const hasReceivedItems = items.some(item => item.quantity_received > 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <PageHeader
          title="Create Goods Received Note"
          description="Record receipt of goods against a purchase order"
        />
      </div>

      {/* PO Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Purchase Order *</Label>
              <Select value={selectedPoId} onValueChange={setSelectedPoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Purchase Order" />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrders.map((po: any) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.po_number} - {po.vendor?.company_name}
                      <Badge className="ml-2" variant="outline">
                        {po.delivery_status || 'pending'}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Receiving Warehouse *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh: any) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {wh.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Receipt Date *</Label>
              <Input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
              />
            </div>
          </div>

          {selectedPO && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Vendor:</span>
                  <span className="ml-2 font-medium">{selectedPO.vendor?.company_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">PO Value:</span>
                  <span className="ml-2 font-medium">
                    {formatCurrency(selectedPO.final_amount, selectedPO.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Delivery Status:</span>
                  <Badge className="ml-2" variant="outline">
                    {selectedPO.delivery_status || 'pending'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      {selectedPoId && (
        <Card>
          <CardHeader>
            <CardTitle>Items to Receive</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingItems ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending items to receive for this PO
              </div>
            ) : (
              <>
                {overReceiptWarnings.length > 0 && (
                  <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-800">Over-Receipt Warning</p>
                        <ul className="text-sm text-orange-700 mt-1 list-disc list-inside">
                          {overReceiptWarnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                        {!matchingSettings?.allow_over_receipt && (
                          <p className="text-sm text-orange-600 mt-2">
                            Over-receipt is not allowed. Reduce quantities or contact admin.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Ordered</TableHead>
                      <TableHead className="text-center">Pending</TableHead>
                      <TableHead className="text-center">Received</TableHead>
                      <TableHead className="text-center">Accepted</TableHead>
                      <TableHead className="text-center">Rejected</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Batch #</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.po_item_id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.description}</p>
                            {item.product_name && (
                              <p className="text-sm text-muted-foreground">{item.product_name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity_ordered}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{item.pending_qty}</Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={item.quantity_ordered}
                            value={item.quantity_received}
                            onChange={(e) => handleQuantityChange(index, 'quantity_received', parseInt(e.target.value) || 0)}
                            className="w-20 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={item.quantity_received}
                            value={item.quantity_accepted}
                            onChange={(e) => handleQuantityChange(index, 'quantity_accepted', parseInt(e.target.value) || 0)}
                            className="w-20 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={item.quantity_received}
                            value={item.quantity_rejected}
                            onChange={(e) => handleQuantityChange(index, 'quantity_rejected', parseInt(e.target.value) || 0)}
                            className="w-20 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unit_price, selectedPO?.currency || 'USD')}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.quantity_accepted * item.unit_price, selectedPO?.currency || 'USD')}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.batch_number || ''}
                            onChange={(e) => handleItemFieldChange(index, 'batch_number', e.target.value)}
                            placeholder="Batch #"
                            className="w-24"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4 flex justify-end">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Accepted Value</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(totalValue, selectedPO?.currency || 'USD')}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Remarks */}
      {selectedPoId && items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="General remarks about this receipt..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Discrepancies</Label>
                <Textarea
                  value={discrepancies}
                  onChange={(e) => setDiscrepancies(e.target.value)}
                  placeholder="Note any discrepancies found..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            !selectedPoId ||
            !warehouseId ||
            !hasReceivedItems ||
            createGRN.isPending ||
            (overReceiptWarnings.length > 0 && !matchingSettings?.allow_over_receipt)
          }
        >
          {createGRN.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Create GRN
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CreateGRN;
