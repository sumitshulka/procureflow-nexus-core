
import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { VendorRegistration } from '@/types/vendor';
import { CheckCircle, XCircle } from 'lucide-react';

interface VendorApprovalDialogProps {
  vendor: VendorRegistration;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (vendorId: string, comments?: string) => void;
  onReject: (vendorId: string, reason: string) => void;
  action: 'approve' | 'reject' | null;
}

const VendorApprovalDialog: React.FC<VendorApprovalDialogProps> = ({
  vendor,
  isOpen,
  onClose,
  onApprove,
  onReject,
  action,
}) => {
  const [comments, setComments] = useState('');
  const [reason, setReason] = useState('');

  const handleApprove = () => {
    onApprove(vendor.id!, comments);
    setComments('');
    onClose();
  };

  const handleReject = () => {
    if (!reason.trim()) {
      return; // Don't allow rejection without reason
    }
    onReject(vendor.id!, reason);
    setReason('');
    onClose();
  };

  if (action === 'approve') {
    return (
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Approve Vendor Registration
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve the registration for <strong>{vendor.company_name}</strong>?
              This will allow them to register for products and participate in RFPs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="approval-comments">Comments (Optional)</Label>
            <Textarea
              id="approval-comments"
              placeholder="Add any comments for the vendor..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              Approve Vendor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (action === 'reject') {
    return (
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Reject Vendor Registration
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a detailed reason for rejecting <strong>{vendor.company_name}</strong>'s registration.
              This will help them understand what needs to be corrected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Please provide a detailed reason for rejection (e.g., incomplete documents, invalid registration details, etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className={!reason.trim() ? 'border-red-300' : ''}
            />
            {!reason.trim() && (
              <p className="text-sm text-red-600">Rejection reason is required</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button 
              onClick={handleReject} 
              variant="destructive"
              disabled={!reason.trim()}
            >
              Reject Vendor
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return null;
};

export default VendorApprovalDialog;
