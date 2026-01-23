import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, RotateCcw, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getCurrencySymbol } from "@/utils/currencyUtils";

interface BudgetAllocation {
  id: string;
  cycle_id: string;
  head_id: string;
  department_id: string;
  period_number: number;
  allocated_amount: number;
  approved_amount: number | null;
  status: string;
  notes: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  cycle: { name: string; fiscal_year: number; period_type: string } | null;
  head: { name: string; code: string; type: string } | null;
  department: { name: string } | null;
}

interface ReviewDialogState {
  open: boolean;
  allocation: BudgetAllocation | null;
  mode: 'approve' | 'reject' | 'revision' | null;
}

const BudgetReview = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [expandedHeads, setExpandedHeads] = useState<Set<string>>(new Set());
  const [reviewDialog, setReviewDialog] = useState<ReviewDialogState>({
    open: false,
    allocation: null,
    mode: null
  });
  const [approvedAmount, setApprovedAmount] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  // Fetch organization settings for currency
  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings-budget'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('base_currency')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  const currencySymbol = getCurrencySymbol(orgSettings?.base_currency || 'USD');

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['departments-for-review'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch pending submissions
  const { data: pendingSubmissions, isLoading } = useQuery({
    queryKey: ['pending-budget-submissions', selectedDepartment],
    queryFn: async () => {
      let query = supabase
        .from('budget_allocations')
        .select(`
          *,
          cycle:budget_cycles(name, fiscal_year, period_type),
          head:budget_heads(name, code, type),
          department:departments(name)
        `)
        .in('status', ['submitted', 'under_review'])
        .order('submitted_at', { ascending: true })
        .limit(500);

      if (selectedDepartment !== 'all') {
        query = query.eq('department_id', selectedDepartment);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BudgetAllocation[];
    }
  });

  // Group submissions by department and budget head type
  const groupedData = useMemo(() => {
    if (!pendingSubmissions) return {};
    
    const grouped: Record<string, {
      departmentName: string;
      income: BudgetAllocation[];
      expense: BudgetAllocation[];
      totals: {
        incomeTotal: number;
        expenseTotal: number;
        netTotal: number;
      };
    }> = {};

    pendingSubmissions.forEach(allocation => {
      const deptId = allocation.department_id;
      const deptName = allocation.department?.name || 'Unknown';
      
      if (!grouped[deptId]) {
        grouped[deptId] = {
          departmentName: deptName,
          income: [],
          expense: [],
          totals: { incomeTotal: 0, expenseTotal: 0, netTotal: 0 }
        };
      }

      const headType = allocation.head?.type || 'expense';
      if (headType === 'income') {
        grouped[deptId].income.push(allocation);
        grouped[deptId].totals.incomeTotal += allocation.allocated_amount || 0;
      } else {
        grouped[deptId].expense.push(allocation);
        grouped[deptId].totals.expenseTotal += allocation.allocated_amount || 0;
      }
    });

    // Calculate net totals
    Object.values(grouped).forEach(dept => {
      dept.totals.netTotal = dept.totals.incomeTotal - dept.totals.expenseTotal;
    });

    return grouped;
  }, [pendingSubmissions]);

  // Calculate overall summary
  const overallSummary = useMemo(() => {
    const deptValues = Object.values(groupedData);
    return {
      totalDepartments: deptValues.length,
      totalAllocations: pendingSubmissions?.length || 0,
      totalIncome: deptValues.reduce((sum, d) => sum + d.totals.incomeTotal, 0),
      totalExpense: deptValues.reduce((sum, d) => sum + d.totals.expenseTotal, 0),
      netBudget: deptValues.reduce((sum, d) => sum + d.totals.netTotal, 0)
    };
  }, [groupedData, pendingSubmissions]);

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, approved_amount, notes }: { 
      id: string; 
      status: 'approved' | 'rejected' | 'revision_requested'; 
      approved_amount: number | null; 
      notes: string 
    }) => {
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
      const actionLabel = 
        variables.status === 'approved' ? 'approved' : 
        variables.status === 'rejected' ? 'rejected' : 
        'sent back for revision';
      toast({ 
        title: `Budget ${actionLabel}`,
        description: "Department manager has been notified"
      });
      closeDialog();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error reviewing budget", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleAction = (allocation: BudgetAllocation, mode: 'approve' | 'reject' | 'revision') => {
    setReviewDialog({ open: true, allocation, mode });
    setApprovedAmount(allocation.allocated_amount?.toString() || "");
    setReviewNotes("");
  };

  const closeDialog = () => {
    setReviewDialog({ open: false, allocation: null, mode: null });
    setApprovedAmount("");
    setReviewNotes("");
  };

  const submitReview = () => {
    if (!reviewDialog.allocation || !reviewDialog.mode) return;

    const statusMap: Record<'approve' | 'reject' | 'revision', 'approved' | 'rejected' | 'revision_requested'> = {
      approve: 'approved',
      reject: 'rejected',
      revision: 'revision_requested'
    };

    reviewMutation.mutate({
      id: reviewDialog.allocation.id,
      status: statusMap[reviewDialog.mode],
      approved_amount: reviewDialog.mode === 'approve' ? parseFloat(approvedAmount) : null,
      notes: reviewNotes
    });
  };

  const toggleHeadExpansion = (headId: string) => {
    setExpandedHeads(prev => {
      const next = new Set(prev);
      if (next.has(headId)) {
        next.delete(headId);
      } else {
        next.add(headId);
      }
      return next;
    });
  };

  const getPeriodLabel = (periodNumber: number, periodType: string) => {
    if (periodType === 'monthly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[periodNumber - 1] || `P${periodNumber}`;
    }
    return `Q${periodNumber}`;
  };

  const formatAmount = (amount: number) => `${currencySymbol}${amount.toLocaleString()}`;

  const getDialogTitle = () => {
    switch (reviewDialog.mode) {
      case 'approve': return 'Approve Budget';
      case 'reject': return 'Reject Budget';
      case 'revision': return 'Request Modifications';
      default: return 'Review Budget';
    }
  };

  const getDialogDescription = () => {
    switch (reviewDialog.mode) {
      case 'approve': return 'Approve this budget allocation. You can adjust the approved amount if needed.';
      case 'reject': return 'Reject this budget allocation. Please provide a reason.';
      case 'revision': return 'Send this budget back to the manager for modifications. Please provide detailed comments on what needs to be changed.';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Review Submissions</h2>
          <p className="text-sm text-muted-foreground">
            Review and approve department budget submissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments?.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{overallSummary.totalDepartments}</div>
            <p className="text-xs text-muted-foreground">Departments Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{overallSummary.totalAllocations}</div>
            <p className="text-xs text-muted-foreground">Total Line Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-600">{formatAmount(overallSummary.totalIncome)}</div>
            <p className="text-xs text-muted-foreground">Total Income</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-rose-600">{formatAmount(overallSummary.totalExpense)}</div>
            <p className="text-xs text-muted-foreground">Total Expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold ${overallSummary.netBudget >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatAmount(overallSummary.netBudget)}
            </div>
            <p className="text-xs text-muted-foreground">Net Budget</p>
          </CardContent>
        </Card>
      </div>

      {/* No submissions message */}
      {Object.keys(groupedData).length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No pending budget submissions to review
          </CardContent>
        </Card>
      )}

      {/* Department-wise grouped view */}
      {Object.entries(groupedData).map(([deptId, deptData]) => (
        <Card key={deptId}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{deptData.departmentName}</CardTitle>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-emerald-600">Income: {formatAmount(deptData.totals.incomeTotal)}</span>
                <span className="text-rose-600">Expense: {formatAmount(deptData.totals.expenseTotal)}</span>
                <Badge variant={deptData.totals.netTotal >= 0 ? "default" : "destructive"}>
                  Net: {formatAmount(deptData.totals.netTotal)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Income Section */}
            {deptData.income.length > 0 && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-950/30">
                  <ChevronDown className="h-4 w-4" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">Income ({deptData.income.length} items)</span>
                  <span className="ml-auto font-semibold text-emerald-600">{formatAmount(deptData.totals.incomeTotal)}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Budget Head</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deptData.income.map(allocation => (
                        <TableRow key={allocation.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{allocation.head?.name}</div>
                              <div className="text-xs text-muted-foreground">{allocation.head?.code}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {allocation.cycle?.name} - {getPeriodLabel(allocation.period_number, allocation.cycle?.period_type || 'monthly')}
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">
                            {formatAmount(allocation.allocated_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{allocation.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleAction(allocation, 'approve')} title="Approve">
                                <Check className="h-4 w-4 text-emerald-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleAction(allocation, 'revision')} title="Request Modifications">
                                <RotateCcw className="h-4 w-4 text-amber-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleAction(allocation, 'reject')} title="Reject">
                                <X className="h-4 w-4 text-rose-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Expense Section */}
            {deptData.expense.length > 0 && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-2 bg-rose-50 dark:bg-rose-950/20 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950/30">
                  <ChevronDown className="h-4 w-4" />
                  <span className="font-medium text-rose-700 dark:text-rose-400">Expenses ({deptData.expense.length} items)</span>
                  <span className="ml-auto font-semibold text-rose-600">{formatAmount(deptData.totals.expenseTotal)}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Budget Head</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deptData.expense.map(allocation => (
                        <TableRow key={allocation.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{allocation.head?.name}</div>
                              <div className="text-xs text-muted-foreground">{allocation.head?.code}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {allocation.cycle?.name} - {getPeriodLabel(allocation.period_number, allocation.cycle?.period_type || 'monthly')}
                          </TableCell>
                          <TableCell className="text-right font-medium text-rose-600">
                            {formatAmount(allocation.allocated_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{allocation.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleAction(allocation, 'approve')} title="Approve">
                                <Check className="h-4 w-4 text-emerald-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleAction(allocation, 'revision')} title="Request Modifications">
                                <RotateCcw className="h-4 w-4 text-amber-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleAction(allocation, 'reject')} title="Reject">
                                <X className="h-4 w-4 text-rose-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>{getDialogDescription()}</DialogDescription>
          </DialogHeader>
          {reviewDialog.allocation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                <div className="text-muted-foreground">Department:</div>
                <div className="font-medium">{reviewDialog.allocation.department?.name}</div>
                
                <div className="text-muted-foreground">Budget Head:</div>
                <div className="font-medium">{reviewDialog.allocation.head?.name}</div>
                
                <div className="text-muted-foreground">Requested Amount:</div>
                <div className="font-medium">{formatAmount(reviewDialog.allocation.allocated_amount)}</div>

                <div className="text-muted-foreground">Period:</div>
                <div className="font-medium">
                  {reviewDialog.allocation.cycle?.name} - {getPeriodLabel(reviewDialog.allocation.period_number, reviewDialog.allocation.cycle?.period_type || 'monthly')}
                </div>
              </div>

              {reviewDialog.mode === 'approve' && (
                <div className="space-y-2">
                  <Label htmlFor="approved-amount">Approved Amount</Label>
                  <Input
                    id="approved-amount"
                    type="number"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    placeholder="Enter approved amount"
                  />
                  <p className="text-xs text-muted-foreground">
                    You can adjust the amount if different from requested
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">
                  {reviewDialog.mode === 'revision' ? 'Modification Comments (Required)' : 'Notes'}
                </Label>
                <Textarea
                  id="notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewDialog.mode === 'revision' 
                      ? "Please describe what changes are needed..."
                      : "Add comments or notes (optional)"
                  }
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                {reviewDialog.mode === 'approve' && (
                  <Button 
                    onClick={submitReview}
                    disabled={reviewMutation.isPending || !approvedAmount}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Approve
                  </Button>
                )}
                {reviewDialog.mode === 'revision' && (
                  <Button 
                    onClick={submitReview}
                    disabled={reviewMutation.isPending || !reviewNotes.trim()}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Request Modifications
                  </Button>
                )}
                {reviewDialog.mode === 'reject' && (
                  <Button 
                    variant="destructive"
                    onClick={submitReview}
                    disabled={reviewMutation.isPending}
                  >
                    {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reject
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetReview;
