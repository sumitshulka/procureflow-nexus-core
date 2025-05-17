
import React, { useState } from 'react';
import { MoreVertical, Check, X, HelpCircle, History } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/contexts/AuthContext';
import { logApprovalAction } from './ApprovalWorkflow';

interface ApprovalRequest {
  id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  requester_id: string;
  requester_name?: string;
  created_at: string;
  request_title?: string;
  entity_status?: string;
}

interface ApprovalActionMenuProps {
  approval: ApprovalRequest;
  onActionComplete?: () => void;
  displayAsButtons?: boolean;
}

type ActionType = 'approve' | 'reject' | 'more_info';

const ApprovalActionMenu = ({ 
  approval, 
  onActionComplete, 
  displayAsButtons = false 
}: ApprovalActionMenuProps) => {
  const [loading, setLoading] = useState<ActionType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [comments, setComments] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const isPending = approval.status === 'pending';

  const handleAction = (action: ActionType) => {
    if (action === 'approve') {
      processAction(action);
    } else {
      // For reject and more_info, we need comments
      setActionType(action);
      setIsDialogOpen(true);
    }
  };

  const processAction = async (action: ActionType, commentText?: string) => {
    if (!isPending) {
      toast({
        title: "Cannot update request",
        description: "This request is already processed",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to perform this action",
        variant: "destructive",
      });
      return;
    }

    setLoading(action);
    try {
      // Update the approval
      const { error: approvalError } = await supabase
        .from('approvals')
        .update({
          status: action,
          approval_date: new Date().toISOString(),
          comments: commentText || null,
          updated_at: new Date().toISOString(),
          approver_id: user.id // Make sure we record who approved it
        })
        .eq('id', approval.id);

      if (approvalError) throw approvalError;

      // For procurement requests, update the request status too
      if (approval.entity_type === 'procurement_request') {
        const newStatus = action === 'approve' ? 'approved' : 
                         action === 'reject' ? 'rejected' : 'in_review';
        
        const { error: requestError } = await supabase
          .from('procurement_requests')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', approval.entity_id);

        if (requestError) throw requestError;
      } 
      // For inventory checkout requests
      else if (approval.entity_type === 'inventory_checkout') {
        const { error: checkoutError } = await supabase
          .from('inventory_transactions')
          .update({ 
            approval_status: action === 'approve' ? 'approved' : 
                            action === 'reject' ? 'rejected' : 'more_info'
          })
          .eq('id', approval.entity_id);

        if (checkoutError) throw checkoutError;
        
        // If approved, we need to update inventory levels
        if (action === 'approve') {
          // Get the transaction details
          const { data: transaction, error: transactionError } = await supabase
            .from('inventory_transactions')
            .select('*')
            .eq('id', approval.entity_id)
            .single();
            
          if (transactionError) throw transactionError;
          
          // Get current inventory level
          const { data: inventoryData, error: inventoryError } = await supabase
            .from('inventory_items')
            .select('quantity')
            .eq('product_id', transaction.product_id)
            .eq('warehouse_id', transaction.source_warehouse_id)
            .single();
            
          if (inventoryError) throw inventoryError;
          
          // Update inventory level
          const { error: updateError } = await supabase
            .from('inventory_items')
            .update({
              quantity: inventoryData.quantity - transaction.quantity,
              last_updated: new Date().toISOString()
            })
            .eq('product_id', transaction.product_id)
            .eq('warehouse_id', transaction.source_warehouse_id);
            
          if (updateError) throw updateError;
        }
      }

      // Log this action in the activity log
      await logApprovalAction(
        approval.entity_type, 
        approval.entity_id,
        user.id,
        `${action}_request`,
        { 
          approval_id: approval.id,
          comments: commentText
        }
      );

      toast({
        title: "Success",
        description: `Request ${action === 'more_info' ? 'updated' : action + 'd'} successfully`,
      });
      
      if (onActionComplete) onActionComplete();
    } catch (error) {
      console.error(`Error processing ${action} action:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} the request. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
      setIsDialogOpen(false);
      setComments('');
    }
  };

  if (!isPending && !displayAsButtons) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <MoreVertical className="h-4 w-4" />
      </Button>
    );
  }

  if (displayAsButtons) {
    return (
      <div className="flex flex-wrap gap-2">
        {isPending && (
          <>
            <Button 
              size="sm" 
              variant="outline"
              className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
              onClick={() => handleAction('approve')}
              disabled={!!loading}
            >
              <Check className="mr-1 h-4 w-4" />
              {loading === 'approve' ? 'Processing...' : 'Approve'}
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
              onClick={() => handleAction('reject')}
              disabled={!!loading}
            >
              <X className="mr-1 h-4 w-4" />
              {loading === 'reject' ? 'Processing...' : 'Reject'}
            </Button>
            
            <Button 
              size="sm" 
              variant="outline" 
              className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
              onClick={() => handleAction('more_info')}
              disabled={!!loading}
            >
              <HelpCircle className="mr-1 h-4 w-4" />
              {loading === 'more_info' ? 'Processing...' : 'Need More Info'}
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {actionType === 'reject' ? 'Reject Request' : 'Request More Information'}
                  </DialogTitle>
                  <DialogDescription>
                    {actionType === 'reject' 
                      ? 'Please provide a reason for rejecting this request.'
                      : 'Please specify what additional information you need.'}
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Enter your comments here..."
                  className="min-h-[100px]"
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleDialogConfirm}>Submit</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    );
  }

  const handleDialogConfirm = () => {
    if (!actionType) return;
    
    // Validation for comments
    if (!comments.trim()) {
      toast({
        title: "Comments required",
        description: "Please provide a reason for this action",
        variant: "destructive",
      });
      return;
    }
    
    processAction(actionType, comments);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isPending && (
          <>
            <DropdownMenuItem onClick={() => handleAction('approve')}>
              <Check className="mr-2 h-4 w-4 text-green-500" /> Approve
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('reject')}>
              <X className="mr-2 h-4 w-4 text-red-500" /> Reject
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('more_info')}>
              <HelpCircle className="mr-2 h-4 w-4 text-amber-500" /> Need More Info
            </DropdownMenuItem>
          </>
        )}
        {!isPending && (
          <DropdownMenuItem disabled>
            <History className="mr-2 h-4 w-4" /> {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'reject' ? 'Reject Request' : 'Request More Information'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'reject' 
                ? 'Please provide a reason for rejecting this request.'
                : 'Please specify what additional information you need.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Enter your comments here..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDialogConfirm}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
};

export default ApprovalActionMenu;
