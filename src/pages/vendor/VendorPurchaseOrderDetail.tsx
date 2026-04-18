import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Download,
  Building2,
  Calendar,
  Package,
  FileText,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { usePOActions } from '@/hooks/usePOActions';
import { formatCurrency } from '@/utils/currencyUtils';
import VendorApprovalGuard from '@/components/vendor/VendorApprovalGuard';
import VendorPOGRNList from '@/components/vendor/VendorPOGRNList';

const VendorPurchaseOrderDetail = () => (
  <VendorApprovalGuard>
    <Content />
  </VendorApprovalGuard>
);

const Content = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { generatePDF, isGeneratingPDF } = usePOActions();

  // Resolve vendor for the logged-in user
  const { data: vendorReg } = useQuery({
    queryKey: ['vendor-reg-by-user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('vendor_registrations')
        .select('id, company_name, primary_email')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: po, isLoading, error } = useQuery({
    queryKey: ['vendor-po-detail', id, vendorReg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendor:vendor_registrations(company_name, primary_email),
          items:purchase_order_items(*)
        `)
        .eq('id', id)
        .eq('vendor_id', vendorReg!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!vendorReg?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !po) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-medium">Purchase Order not found</h3>
          <p className="text-sm text-muted-foreground">
            This purchase order is not available or does not belong to your account.
          </p>
          <Button variant="outline" onClick={() => navigate('/vendor/purchase-orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Purchase Orders
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currency = po.currency || 'USD';

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      sent: 'bg-blue-100 text-blue-800',
      acknowledged: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={variants[status] || 'bg-muted'}>
        {status.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/vendor/purchase-orders')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{po.po_number}</h1>
            <p className="text-sm text-muted-foreground">Purchase Order Details</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => generatePDF(po.id)} disabled={isGeneratingPDF}>
          <Download className="h-4 w-4 mr-2" />
          {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
        </Button>
      </div>

      {/* Status & Total */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(po.status)}</div>
            </div>
            <div className="sm:text-right">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-xl md:text-2xl font-bold break-all">
                {formatCurrency(po.final_amount || po.total_amount || 0, currency)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vendor / Buyer info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Vendor (You)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-medium">{po.vendor?.company_name || vendorReg?.company_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{po.vendor?.primary_email || vendorReg?.primary_email || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">PO Number</p>
              <p className="font-medium">{po.po_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">PO Date</p>
              <p className="font-medium">{format(new Date(po.po_date), 'PPP')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expected Delivery</p>
              <p className="font-medium">
                {po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'PPP') : 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="font-medium">{currency}</p>
            </div>
            {po.payment_terms && (
              <div>
                <p className="text-sm text-muted-foreground">Payment Terms</p>
                <p className="font-medium">{po.payment_terms}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items + Totals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Order Items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 sm:px-4">#</th>
                  <th className="text-left py-3 px-2 sm:px-4">Description</th>
                  <th className="text-center py-3 px-2 sm:px-4">Qty</th>
                  <th className="text-right py-3 px-2 sm:px-4">Unit Price</th>
                  <th className="text-right py-3 px-2 sm:px-4">Tax</th>
                  <th className="text-right py-3 px-2 sm:px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {po.items?.map((item: any, index: number) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 px-2 sm:px-4">{index + 1}</td>
                    <td className="py-3 px-2 sm:px-4">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        {item.specifications && (
                          <p className="text-xs text-muted-foreground">{item.specifications}</p>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-3 px-2 sm:px-4">{item.quantity}</td>
                    <td className="text-right py-3 px-2 sm:px-4 whitespace-nowrap">
                      {formatCurrency(item.unit_price || 0, currency)}
                    </td>
                    <td className="text-right py-3 px-2 sm:px-4 whitespace-nowrap">
                      {formatCurrency(item.tax_amount || 0, currency)}
                    </td>
                    <td className="text-right py-3 px-2 sm:px-4 font-medium whitespace-nowrap">
                      {formatCurrency(item.final_amount || item.total_price || 0, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2">
                  <td colSpan={5} className="text-right py-3 px-2 sm:px-4 font-medium">Subtotal:</td>
                  <td className="text-right py-3 px-2 sm:px-4 font-medium whitespace-nowrap">
                    {formatCurrency(po.total_amount || 0, currency)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="text-right py-3 px-2 sm:px-4">Tax:</td>
                  <td className="text-right py-3 px-2 sm:px-4 whitespace-nowrap">
                    {formatCurrency(po.tax_amount || 0, currency)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="text-right py-3 px-2 sm:px-4">Discount:</td>
                  <td className="text-right py-3 px-2 sm:px-4 whitespace-nowrap">
                    {formatCurrency(po.discount_amount || 0, currency)}
                  </td>
                </tr>
                <tr className="border-t-2">
                  <td colSpan={5} className="text-right py-3 px-2 sm:px-4 font-bold text-base md:text-lg">
                    Grand Total:
                  </td>
                  <td className="text-right py-3 px-2 sm:px-4 font-bold text-base md:text-lg whitespace-nowrap">
                    {formatCurrency(po.final_amount || po.total_amount || 0, currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Terms / Instructions */}
      {(po.terms_and_conditions || po.specific_instructions || po.special_instructions) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {po.terms_and_conditions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Terms and Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{po.terms_and_conditions}</p>
              </CardContent>
            </Card>
          )}
          {(po.specific_instructions || po.special_instructions) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Specific Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">
                  {po.specific_instructions || po.special_instructions}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default VendorPurchaseOrderDetail;
