import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";
import DataTable from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";

const BudgetReview = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; allocation: any }>({
    open: false,
    allocation: null
  });
  const [approvedAmount, setApprovedAmount] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: pendingSubmissions, isLoading } = useQuery({
    queryKey: ['pending-budget-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_allocations')
        .select(`
          *,
          cycle:budget_cycles(name, fiscal_year, period_type),
          head:budget_heads(name, code),
          department:departments(name),
          submitter:profiles(full_name),
          line_items:budget_line_items(*)
        `)
        .in('status', ['submitted', 'under_review'])
        .order('submitted_at', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, approved_amount, notes }: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('budget_allocations')
        .update({
          status,
          approved_amount,
          notes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-budget-submissions'] });
      toast({ 
        title: `Budget ${variables.status === 'approved' ? 'approved' : 'rejected'}`,
        description: "Department has been notified"
      });
      setReviewDialog({ open: false, allocation: null });
      setApprovedAmount("");
      setReviewNotes("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error reviewing budget", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleApprove = (allocation: any) => {
    setReviewDialog({ open: true, allocation });
    setApprovedAmount(allocation.allocated_amount.toString());
  };

  const handleReject = (allocation: any) => {
    setReviewDialog({ open: true, allocation });
  };

  const submitReview = (approved: boolean) => {
    if (!reviewDialog.allocation) return;

    reviewMutation.mutate({
      id: reviewDialog.allocation.id,
      status: approved ? 'approved' : 'rejected',
      approved_amount: approved ? parseFloat(approvedAmount) : null,
      notes: reviewNotes
    });
  };

  const getPeriodLabel = (periodNumber: number, periodType: string) => {
    if (periodType === 'monthly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[periodNumber - 1];
    }
    return `Q${periodNumber}`;
  };

  const columns = [
    { 
      id: 'cycle', 
      header: 'Budget Cycle',
      cell: (row: any) => `${row.cycle?.name}`
    },
    { 
      id: 'department', 
      header: 'Department',
      cell: (row: any) => row.department?.name || '-'
    },
    { 
      id: 'head', 
      header: 'Budget Head',
      cell: (row: any) => (
        <div>
          <div className="font-medium">{row.head?.name}</div>
          <div className="text-xs text-muted-foreground">{row.head?.code}</div>
        </div>
      )
    },
    { 
      id: 'period', 
      header: 'Period',
      cell: (row: any) => getPeriodLabel(row.period_number, row.cycle?.period_type)
    },
    { 
      id: 'allocated_amount', 
      header: 'Requested Amount',
      cell: (row: any) => `$${row.allocated_amount?.toLocaleString() || '0'}`
    },
    { 
      id: 'line_items', 
      header: 'Line Items',
      cell: (row: any) => row.line_items?.length || 0
    },
    { 
      id: 'status', 
      header: 'Status',
      cell: (row: any) => (
        <Badge variant={row.status === 'submitted' ? 'default' : 'outline'}>
          {row.status.replace('_', ' ')}
        </Badge>
      )
    },
    { 
      id: 'actions', 
      header: 'Actions',
      cell: (row: any) => (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="default"
            onClick={() => handleApprove(row)}
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button 
            size="sm" 
            variant="destructive"
            onClick={() => handleReject(row)}
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Review Submissions</h2>
        <p className="text-sm text-muted-foreground">
          Review and approve department budget submissions
        </p>
      </div>

      <DataTable
        columns={columns}
        data={pendingSubmissions || []}
        emptyMessage="No pending budget submissions to review"
      />

      <Dialog open={reviewDialog.open} onOpenChange={(open) => setReviewDialog({ open, allocation: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Budget Submission</DialogTitle>
          </DialogHeader>
          {reviewDialog.allocation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Department:</div>
                <div className="font-medium">{reviewDialog.allocation.department?.name}</div>
                
                <div className="text-muted-foreground">Budget Head:</div>
                <div className="font-medium">{reviewDialog.allocation.head?.name}</div>
                
                <div className="text-muted-foreground">Requested Amount:</div>
                <div className="font-medium">${reviewDialog.allocation.allocated_amount?.toLocaleString()}</div>

                <div className="text-muted-foreground">Line Items:</div>
                <div className="font-medium">{reviewDialog.allocation.line_items?.length || 0}</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approved-amount">Approved Amount</Label>
                <Input
                  id="approved-amount"
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  placeholder="Enter approved amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Review Notes</Label>
                <Textarea
                  id="notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add comments or notes"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReviewDialog({ open: false, allocation: null })}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => submitReview(false)}
                  disabled={reviewMutation.isPending}
                >
                  Reject
                </Button>
                <Button 
                  onClick={() => submitReview(true)}
                  disabled={reviewMutation.isPending || !approvedAmount}
                >
                  {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetReview;