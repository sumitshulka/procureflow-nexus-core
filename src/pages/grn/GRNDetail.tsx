import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGRNDetail, useSubmitGRNForApproval, useApproveGRN, useRejectGRN, usePublishGRNToVendor } from '@/hooks/useGRN';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Download, Mail, Send, CheckCircle, XCircle, 
  Package, Calendar, Building2, User, FileText, Loader2,
  Eye, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/currencyUtils';
import { useAuth } from '@/contexts/AuthContext';

const GRNDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userData } = useAuth();
  
  const [rejectReason, setRejectReason] = useState('');
  const [approvalComments, setApprovalComments] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  const { data: grn, isLoading, error } = useGRNDetail(id || '');
  const submitForApproval = useSubmitGRNForApproval();
  const approveGRN = useApproveGRN();
  const rejectGRN = useRejectGRN();
  const publishToVendor = usePublishGRNToVendor();

  const isAdmin = userData?.roles?.some(r => r.toLowerCase() === 'admin' || r.toLowerCase() === 'inventory_manager');

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: any }> = {
      draft: { className: 'bg-gray-100 text-gray-800', icon: FileText },
      pending_approval: { className: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      approved: { className: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { className: 'bg-red-100 text-red-800', icon: XCircle },
      cancelled: { className: 'bg-gray-100 text-gray-600', icon: XCircle },
    };
    const config = variants[status] || variants.draft;
    const Icon = config.icon;
    return (
      <Badge className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const handleSubmitForApproval = async () => {
    if (id) {
      await submitForApproval.mutateAsync(id);
    }
  };

  const handleApprove = async () => {
    if (id) {
      await approveGRN.mutateAsync({ grnId: id, comments: approvalComments });
      setShowApproveDialog(false);
    }
  };

  const handleReject = async () => {
    if (id && rejectReason) {
      await rejectGRN.mutateAsync({ grnId: id, reason: rejectReason });
      setShowRejectDialog(false);
    }
  };

  const handlePublishToVendor = async () => {
    if (id) {
      await publishToVendor.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !grn) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">GRN not found</p>
            <Button onClick={() => navigate('/grn')} className="mt-4">
              Back to GRN List
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAccepted = grn.items?.reduce((sum, item) => sum + item.quantity_accepted, 0) || 0;
  const totalRejected = grn.items?.reduce((sum, item) => sum + item.quantity_rejected, 0) || 0;
  const totalValue = grn.items?.reduce((sum, item) => sum + item.total_value, 0) || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">GRN {grn.grn_number}</h1>
            <p className="text-muted-foreground">
              Against PO: {grn.purchase_order?.po_number}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {grn.status === 'draft' && (
            <Button onClick={handleSubmitForApproval} disabled={submitForApproval.isPending}>
              <Send className="h-4 w-4 mr-2" />
              {submitForApproval.isPending ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          )}
          {grn.status === 'pending_approval' && isAdmin && (
            <>
              <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reject GRN</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Rejection Reason *</Label>
                      <Textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Provide reason for rejection..."
                      />
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={!rejectReason || rejectGRN.isPending}
                      className="w-full"
                    >
                      {rejectGRN.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogTrigger asChild>
                  <Button variant="approve">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Approve GRN</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      Approving this GRN will automatically update inventory quantities.
                    </p>
                    <div className="space-y-2">
                      <Label>Comments (Optional)</Label>
                      <Textarea
                        value={approvalComments}
                        onChange={(e) => setApprovalComments(e.target.value)}
                        placeholder="Add any comments..."
                      />
                    </div>
                    <Button
                      variant="approve"
                      onClick={handleApprove}
                      disabled={approveGRN.isPending}
                      className="w-full"
                    >
                      {approveGRN.isPending ? 'Approving...' : 'Confirm Approval'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          {grn.status === 'approved' && !grn.is_published_to_vendor && (
            <Button variant="outline" onClick={handlePublishToVendor} disabled={publishToVendor.isPending}>
              <Eye className="h-4 w-4 mr-2" />
              {publishToVendor.isPending ? 'Publishing...' : 'Publish to Vendor'}
            </Button>
          )}
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(grn.status)}</div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalValue, grn.purchase_order?.currency || 'USD')}
              </p>
            </div>
          </div>
          {grn.is_published_to_vendor && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Published to vendor portal on {grn.published_at ? format(new Date(grn.published_at), 'PPP') : 'N/A'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              GRN Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">GRN Number</p>
              <p className="font-medium">{grn.grn_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receipt Date</p>
              <p className="font-medium">{format(new Date(grn.receipt_date), 'PPP')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">PO Reference</p>
              <p className="font-medium">{grn.purchase_order?.po_number}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Vendor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-medium">{grn.vendor?.company_name}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Receipt Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Warehouse</p>
              <p className="font-medium">{grn.warehouse?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Received By</p>
              <p className="font-medium">{grn.receiver?.full_name || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Items Received</p>
            <p className="text-3xl font-bold text-primary">{grn.items?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Quantity Accepted</p>
            <p className="text-3xl font-bold text-green-600">{totalAccepted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Quantity Rejected</p>
            <p className="text-3xl font-bold text-red-600">{totalRejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Received Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Ordered</TableHead>
                <TableHead className="text-center">Received</TableHead>
                <TableHead className="text-center">Accepted</TableHead>
                <TableHead className="text-center">Rejected</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grn.items?.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell>{item.product?.name || '-'}</TableCell>
                  <TableCell className="text-center">{item.quantity_ordered}</TableCell>
                  <TableCell className="text-center">{item.quantity_received}</TableCell>
                  <TableCell className="text-center text-green-600 font-medium">
                    {item.quantity_accepted}
                  </TableCell>
                  <TableCell className="text-center text-red-600 font-medium">
                    {item.quantity_rejected}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unit_price, grn.purchase_order?.currency || 'USD')}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.total_value, grn.purchase_order?.currency || 'USD')}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {item.condition_remarks || item.rejection_reason || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Remarks and Discrepancies */}
      {(grn.remarks || grn.discrepancies) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {grn.remarks && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{grn.remarks}</p>
              </CardContent>
            </Card>
          )}
          {grn.discrepancies && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-orange-600">Discrepancies</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{grn.discrepancies}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default GRNDetail;
