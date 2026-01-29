import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePOActions } from '@/hooks/usePOActions';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Download, 
  Mail, 
  Edit,
  Building2,
  Calendar,
  DollarSign,
  Package,
  FileText,
  Loader2,
  Send,
  AlertTriangle
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import POApprovalStatus from '@/components/purchase-orders/POApprovalStatus';
import POGRNSection from '@/components/grn/POGRNSection';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const PurchaseOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { generatePDF, sendEmail, isGeneratingPDF, isSendingEmail } = usePOActions();
  const [isSubmittingApproval, setIsSubmittingApproval] = React.useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  const { data: po, isLoading, error, refetch } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendor:vendor_registrations(company_name, primary_email),
          items:purchase_order_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: approvalLevels } = useQuery({
    queryKey: ["po-approval-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("po_approval_levels")
        .select("id")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const hasApprovalLevels = approvalLevels && approvalLevels.length > 0;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      sent: 'bg-blue-100 text-blue-800',
      acknowledged: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return <Badge className={variants[status] || 'bg-gray-100'}>{status.replace('_', ' ').toUpperCase()}</Badge>;
  };

  const handleSubmitForApproval = async () => {
    if (!id) return;

    // Check if approval levels are configured
    if (!hasApprovalLevels) {
      toast({
        title: "Configuration Required",
        description: "Please configure PO approval levels in Settings before submitting for approval.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingApproval(true);
    try {
      const { data, error } = await supabase.rpc('initiate_po_approval', {
        p_po_id: id,
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string };
      if (result?.success) {
        toast({
          title: "Success",
          description: "Purchase order submitted for approval",
        });
        setShowApprovalDialog(false);
        refetch();
      } else {
        throw new Error(result?.message || "Failed to submit for approval");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit for approval",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Purchase order not found</p>
            <Button onClick={() => navigate('/purchase-orders/pending')} className="mt-4">
              Back to Purchase Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Purchase Order {po.po_number}</h1>
            <p className="text-muted-foreground">Created on {format(new Date(po.created_at), 'PPP')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {po.status === 'draft' && (
            <>
              {!hasApprovalLevels ? (
                <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
                  <DialogTrigger asChild>
                    <Button disabled={isSubmittingApproval}>
                      <Send className="h-4 w-4 mr-2" />
                      {isSubmittingApproval ? 'Submitting...' : 'Submit for Approval'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Approval Levels Not Configured</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-medium text-yellow-900">
                            No PO Approval Levels Found
                          </p>
                          <p className="text-sm text-yellow-700">
                            You need to configure at least one purchase order approval level before submitting POs for approval.
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => navigate("/settings#po-approvals")}
                        className="w-full"
                      >
                        Go to PO Approval Settings
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
                  <DialogTrigger asChild>
                    <Button disabled={isSubmittingApproval}>
                      <Send className="h-4 w-4 mr-2" />
                      {isSubmittingApproval ? 'Submitting...' : 'Submit for Approval'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Submit Purchase Order for Approval</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-sm text-muted-foreground">
                        This will initiate the approval workflow for this purchase order.
                      </p>
                      <Button
                        onClick={handleSubmitForApproval}
                        disabled={isSubmittingApproval}
                        className="w-full"
                      >
                        {isSubmittingApproval ? 'Submitting...' : 'Submit for Approval'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Button variant="outline" onClick={() => navigate(`/purchase-orders/edit/${po.id}`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </>
          )}
          <Button 
            variant="outline"
            onClick={() => generatePDF(po.id)}
            disabled={isGeneratingPDF}
          >
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
          </Button>
          <Button 
            onClick={() => sendEmail(po.id)}
            disabled={isSendingEmail || po.status === 'draft'}
          >
            <Mail className="h-4 w-4 mr-2" />
            {isSendingEmail ? 'Sending...' : 'Send to Vendor'}
          </Button>
        </div>
      </div>

      {/* Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(po.status)}</div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">{po.currency} {po.final_amount?.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Status */}
      {(po.status === 'pending_approval' || po.approval_status === 'approved' || po.approval_status === 'rejected') && (
        <POApprovalStatus 
          purchaseOrderId={po.id} 
          onApprovalComplete={() => refetch()}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vendor Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Vendor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Company Name</p>
              <p className="font-medium">{po.vendor?.company_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{po.vendor?.primary_email || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Order Details
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
            {po.payment_terms && (
              <div>
                <p className="text-sm text-muted-foreground">Payment Terms</p>
                <p className="font-medium">{po.payment_terms}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">#</th>
                  <th className="text-left py-3 px-4">Description</th>
                  <th className="text-center py-3 px-4">Quantity</th>
                  <th className="text-right py-3 px-4">Unit Price</th>
                  <th className="text-right py-3 px-4">Tax</th>
                  <th className="text-right py-3 px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {po.items?.map((item: any, index: number) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 px-4">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        {item.specifications && (
                          <p className="text-sm text-muted-foreground">{item.specifications}</p>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">{item.quantity}</td>
                    <td className="text-right py-3 px-4">{po.currency} {item.unit_price?.toFixed(2)}</td>
                    <td className="text-right py-3 px-4">{po.currency} {item.tax_amount?.toFixed(2)}</td>
                    <td className="text-right py-3 px-4 font-medium">
                      {po.currency} {item.final_amount?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2">
                  <td colSpan={5} className="text-right py-3 px-4 font-medium">Subtotal:</td>
                  <td className="text-right py-3 px-4 font-medium">
                    {po.currency} {po.total_amount?.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="text-right py-3 px-4">Tax:</td>
                  <td className="text-right py-3 px-4">{po.currency} {po.tax_amount?.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={5} className="text-right py-3 px-4">Discount:</td>
                  <td className="text-right py-3 px-4">{po.currency} {po.discount_amount?.toFixed(2)}</td>
                </tr>
                <tr className="border-t-2">
                  <td colSpan={5} className="text-right py-3 px-4 font-bold text-lg">Grand Total:</td>
                  <td className="text-right py-3 px-4 font-bold text-lg">
                    {po.currency} {po.final_amount?.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Terms and Instructions */}
      {(po.terms_and_conditions || po.specific_instructions) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {po.terms_and_conditions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Terms and Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{po.terms_and_conditions}</p>
              </CardContent>
            </Card>
          )}
          {po.specific_instructions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Specific Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{po.specific_instructions}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* GRN Section - Show for approved/sent POs */}
      {['approved', 'sent', 'acknowledged', 'in_progress', 'delivered', 'completed'].includes(po.status) && (
        <POGRNSection poId={po.id} currency={po.currency} />
      )}
    </div>
  );
};

export default PurchaseOrderDetail;
