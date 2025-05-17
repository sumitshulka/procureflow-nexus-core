
import React, { useState } from 'react';
import { MoreVertical, Check, X, HelpCircle } from 'lucide-react';
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
        })
        .eq('id', approval.id);

      if (approvalError) throw approvalError;

      // For procurement requests, update the request status too
      if (approval.entity_type === 'procurement_request') {
        const newStatus = action === 'approve' ? 'approved' : 
                         action === 'reject' ? 'rejected' : 'in_review';
        
        const { error: requestError } = await supabase
          .from('procurement_requests')
          .update({ status: newStatus })
          .eq('id', approval.entity_id);

        if (requestError) throw requestError;
      }

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
              variant="approve" 
              onClick={() => handleAction('approve')}
              isLoading={loading === 'approve'}
              disabled={!!loading}
            >
              <Check className="mr-1 h-4 w-4" />
              Approve
            </Button>
            
            <Button 
              size="sm" 
              variant="reject" 
              onClick={() => handleAction('reject')}
              isLoading={loading === 'reject'}
              disabled={!!loading}
            >
              <X className="mr-1 h-4 w-4" />
              Reject
            </Button>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleAction('more_info')}
              isLoading={loading === 'more_info'}
              disabled={!!loading}
            >
              <HelpCircle className="mr-1 h-4 w-4" />
              Need More Info
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleAction('approve')}>
          <Check className="mr-2 h-4 w-4 text-green-500" /> Approve
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('reject')}>
          <X className="mr-2 h-4 w-4 text-red-500" /> Reject
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('more_info')}>
          <HelpCircle className="mr-2 h-4 w-4 text-amber-500" /> Need More Info
        </DropdownMenuItem>
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
