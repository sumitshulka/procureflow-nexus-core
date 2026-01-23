import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, RotateCcw, Filter, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  head: { id: string; name: string; code: string; type: string; parent_id: string | null; display_order: number } | null;
  department: { name: string } | null;
}

interface ReviewDialogState {
  open: boolean;
  headId: string | null;  // null means entire department
  departmentId: string | null;
  mode: 'approve' | 'reject' | 'revision' | null;
  isBulkDepartment?: boolean;  // true when approving entire department
}

interface BudgetHead {
  id: string;
  name: string;
  code: string;
  type: string;
  parent_id: string | null;
  display_order: number;
  is_active?: boolean;
}

const BudgetReview = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedCycle, setSelectedCycle] = useState<string>("all");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['income', 'expenditure']));
  const [expandedHeads, setExpandedHeads] = useState<Set<string>>(new Set());
  const [reviewDialog, setReviewDialog] = useState<ReviewDialogState>({
    open: false,
    headId: null,
    departmentId: null,
    mode: null,
    isBulkDepartment: false
  });
  const [reviewNotes, setReviewNotes] = useState("");
  const [approvalAdjustments, setApprovalAdjustments] = useState<Record<string, number>>({});

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

  // Fetch budget cycles with pending submissions
  const { data: budgetCycles } = useQuery({
    queryKey: ['budget-cycles-for-review'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_cycles')
        .select('id, name, fiscal_year, period_type')
        .order('fiscal_year', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch ALL budget heads (to show complete structure)
  const { data: allBudgetHeads } = useQuery({
    queryKey: ['all-budget-heads-review'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_heads')
        .select('id, name, code, type, parent_id, display_order, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as BudgetHead[];
    }
  });

  // Fetch pending submissions
  const { data: pendingSubmissions, isLoading } = useQuery({
    queryKey: ['pending-budget-submissions', selectedDepartment, selectedCycle],
    queryFn: async () => {
      let query = supabase
        .from('budget_allocations')
        .select(`
          *,
          cycle:budget_cycles(name, fiscal_year, period_type),
          head:budget_heads(id, name, code, type, parent_id, display_order),
          department:departments(name)
        `)
        .in('status', ['submitted', 'under_review'])
        .order('submitted_at', { ascending: true })
        .limit(1000);

      if (selectedDepartment !== 'all') {
        query = query.eq('department_id', selectedDepartment);
      }
      if (selectedCycle !== 'all') {
        query = query.eq('cycle_id', selectedCycle);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BudgetAllocation[];
    }
  });

  // Derive active cycle info
  const activeCycle = useMemo(() => {
    if (!pendingSubmissions || pendingSubmissions.length === 0) return null;
    return pendingSubmissions[0].cycle;
  }, [pendingSubmissions]);

  const periodCount = activeCycle?.period_type === 'monthly' ? 12 : 4;
  const periodLabels = useMemo(() => {
    if (activeCycle?.period_type === 'monthly') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }
    return ['Q1', 'Q2', 'Q3', 'Q4'];
  }, [activeCycle]);

  // Group submissions by department, then organize by budget heads with periods as columns
  const groupedData = useMemo(() => {
    if (!pendingSubmissions) return {};
    
    const grouped: Record<string, {
      departmentId: string;
      departmentName: string;
      cycleName: string;
      allocations: Record<string, Record<number, BudgetAllocation>>; // headId -> periodNumber -> allocation
      heads: BudgetHead[];
      totals: {
        incomeByPeriod: Record<number, number>;
        expenseByPeriod: Record<number, number>;
        incomeTotal: number;
        expenseTotal: number;
      };
    }> = {};

    pendingSubmissions.forEach(allocation => {
      const deptId = allocation.department_id;
      const deptName = allocation.department?.name || 'Unknown';
      const cycleName = allocation.cycle?.name || 'Unknown Cycle';
      
      if (!grouped[deptId]) {
        grouped[deptId] = {
          departmentId: deptId,
          departmentName: deptName,
          cycleName,
          allocations: {},
          heads: [],
          totals: {
            incomeByPeriod: {},
            expenseByPeriod: {},
            incomeTotal: 0,
            expenseTotal: 0
          }
        };
      }

      const headId = allocation.head_id;
      if (!grouped[deptId].allocations[headId]) {
        grouped[deptId].allocations[headId] = {};
        if (allocation.head) {
          grouped[deptId].heads.push(allocation.head);
        }
      }

      grouped[deptId].allocations[headId][allocation.period_number] = allocation;

      // Calculate totals
      const amount = allocation.allocated_amount || 0;
      const period = allocation.period_number;
      const headType = allocation.head?.type || 'expenditure';

      if (headType === 'income') {
        grouped[deptId].totals.incomeByPeriod[period] = (grouped[deptId].totals.incomeByPeriod[period] || 0) + amount;
        grouped[deptId].totals.incomeTotal += amount;
      } else {
        grouped[deptId].totals.expenseByPeriod[period] = (grouped[deptId].totals.expenseByPeriod[period] || 0) + amount;
        grouped[deptId].totals.expenseTotal += amount;
      }
    });

    return grouped;
  }, [pendingSubmissions]);

  // Organize ALL budget heads hierarchically (from master data)
  const organizedAllHeads = useMemo(() => {
    if (!allBudgetHeads) return { income: [], expenditure: [] };

    const incomeHeads = allBudgetHeads.filter(h => h.type === 'income');
    const expenditureHeads = allBudgetHeads.filter(h => h.type === 'expenditure');

    const organize = (headsList: BudgetHead[]) => {
      const mainHeads = headsList.filter(h => !h.parent_id);
      return mainHeads.map(main => ({
        ...main,
        subheads: headsList.filter(h => h.parent_id === main.id)
      }));
    };

    return {
      income: organize(incomeHeads),
      expenditure: organize(expenditureHeads)
    };
  }, [allBudgetHeads]);

  // Calculate overall summary
  const overallSummary = useMemo(() => {
    const deptValues = Object.values(groupedData);
    return {
      totalDepartments: deptValues.length,
      totalAllocations: pendingSubmissions?.length || 0,
      totalIncome: deptValues.reduce((sum, d) => sum + d.totals.incomeTotal, 0),
      totalExpense: deptValues.reduce((sum, d) => sum + d.totals.expenseTotal, 0),
      netBudget: deptValues.reduce((sum, d) => sum + (d.totals.incomeTotal - d.totals.expenseTotal), 0)
    };
  }, [groupedData, pendingSubmissions]);

  const reviewMutation = useMutation({
    mutationFn: async ({ allocationIds, status, notes }: { 
      allocationIds: string[]; 
      status: 'approved' | 'rejected' | 'revision_requested'; 
      notes: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const id of allocationIds) {
        const adjustedAmount = approvalAdjustments[id];
        const { error } = await supabase
          .from('budget_allocations')
          .update({
            status,
            approved_amount: status === 'approved' ? (adjustedAmount ?? null) : null,
            notes,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;
      }

      return { count: allocationIds.length };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-budget-submissions'] });
      const actionLabel = 
        variables.status === 'approved' ? 'approved' : 
        variables.status === 'rejected' ? 'rejected' : 
        'sent back for revision';
      toast({ 
        title: `${result.count} allocation(s) ${actionLabel}`,
        description: "Department manager has been notified"
      });
      closeDialog();
      setApprovalAdjustments({});
    },
    onError: (error: any) => {
      toast({ 
        title: "Error reviewing budget", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleBulkAction = (departmentId: string, headId: string | null, mode: 'approve' | 'reject' | 'revision', isBulkDepartment: boolean = false) => {
    setReviewDialog({ open: true, headId, departmentId, mode, isBulkDepartment });
    setReviewNotes("");
  };

  const closeDialog = () => {
    setReviewDialog({ open: false, headId: null, departmentId: null, mode: null, isBulkDepartment: false });
    setReviewNotes("");
  };

  const submitReview = () => {
    if (!reviewDialog.departmentId || !reviewDialog.mode) return;

    const deptData = groupedData[reviewDialog.departmentId];
    if (!deptData) return;

    let allocationIds: string[] = [];

    if (reviewDialog.isBulkDepartment) {
      // Bulk department action - get ALL allocations for this department
      Object.values(deptData.allocations).forEach(headAllocations => {
        Object.values(headAllocations).forEach(allocation => {
          allocationIds.push(allocation.id);
        });
      });
    } else if (reviewDialog.headId) {
      // Single budget head action
      const allocations = deptData.allocations[reviewDialog.headId];
      if (!allocations) return;
      allocationIds = Object.values(allocations).map(a => a.id);
    }

    if (allocationIds.length === 0) return;

    const statusMap: Record<'approve' | 'reject' | 'revision', 'approved' | 'rejected' | 'revision_requested'> = {
      approve: 'approved',
      reject: 'rejected',
      revision: 'revision_requested'
    };

    reviewMutation.mutate({
      allocationIds,
      status: statusMap[reviewDialog.mode],
      notes: reviewNotes
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
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

  const formatAmount = (amount: number) => `${currencySymbol}${amount.toLocaleString()}`;

  const getDialogTitle = () => {
    if (reviewDialog.isBulkDepartment) {
      switch (reviewDialog.mode) {
        case 'approve': return 'Approve Entire Department Budget';
        case 'reject': return 'Reject Entire Department Budget';
        case 'revision': return 'Request Modifications for Department';
        default: return 'Review Budget';
      }
    }
    switch (reviewDialog.mode) {
      case 'approve': return 'Approve Budget Line';
      case 'reject': return 'Reject Budget Line';
      case 'revision': return 'Request Modifications';
      default: return 'Review Budget';
    }
  };

  const getDialogDescription = () => {
    if (reviewDialog.isBulkDepartment && reviewDialog.departmentId) {
      const deptName = groupedData[reviewDialog.departmentId]?.departmentName || 'this department';
      const totalAllocations = Object.values(groupedData[reviewDialog.departmentId]?.allocations || {})
        .reduce((sum, headAllocs) => sum + Object.keys(headAllocs).length, 0);
      
      switch (reviewDialog.mode) {
        case 'approve': return `Approve all ${totalAllocations} budget allocations for ${deptName}. This will approve the entire submitted budget.`;
        case 'reject': return `Reject all ${totalAllocations} budget allocations for ${deptName}. Please provide a reason.`;
        case 'revision': return `Send all ${totalAllocations} budget allocations for ${deptName} back for modifications. Please provide detailed comments.`;
        default: return '';
      }
    }

    const headName = reviewDialog.headId && reviewDialog.departmentId 
      ? groupedData[reviewDialog.departmentId]?.heads.find(h => h.id === reviewDialog.headId)?.name 
      : '';
    switch (reviewDialog.mode) {
      case 'approve': return `Approve all period allocations for "${headName}".`;
      case 'reject': return `Reject all period allocations for "${headName}". Please provide a reason.`;
      case 'revision': return `Send "${headName}" back to the manager for modifications. Please provide detailed comments.`;
      default: return '';
    }
  };

  const getHeadRowTotal = (allocations: Record<number, BudgetAllocation>) => {
    return Object.values(allocations).reduce((sum, a) => sum + (a.allocated_amount || 0), 0);
  };

  const renderBudgetHeadRow = (
    head: BudgetHead & { subheads?: BudgetHead[] },
    allocations: Record<string, Record<number, BudgetAllocation>>,
    departmentId: string,
    isSubhead: boolean = false
  ) => {
    const headAllocations = allocations[head.id] || {};
    const hasSubheads = head.subheads && head.subheads.length > 0;
    const isExpanded = expandedHeads.has(head.id);
    const rowTotal = getHeadRowTotal(headAllocations);
    const hasData = Object.keys(headAllocations).length > 0;

    // Always show the row (even if no data), but actions only appear when there's data

    return (
      <React.Fragment key={head.id}>
        <TableRow className={isSubhead ? "bg-muted/30" : "bg-muted/10"}>
          <TableCell className={`sticky left-0 z-20 border-r min-w-[220px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${isSubhead ? 'bg-secondary' : 'bg-card'}`}>
            <div className={`flex items-center gap-2 ${isSubhead ? 'pl-6' : ''}`}>
              {hasSubheads && (
                <button
                  onClick={() => toggleHeadExpansion(head.id)}
                  className="p-0.5 hover:bg-muted rounded"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              )}
              <div>
                <div className="font-medium text-sm">{head.name}</div>
                <div className="text-xs text-muted-foreground">{head.code}</div>
              </div>
            </div>
          </TableCell>

          {/* Period columns - show 0 if no allocation */}
          {Array.from({ length: periodCount }, (_, i) => i + 1).map(periodNumber => {
            const allocation = headAllocations[periodNumber];
            const amount = allocation?.allocated_amount || 0;
            return (
              <TableCell key={periodNumber} className="text-right min-w-[100px] p-2">
                <span className={amount > 0 && head.type === 'income' ? 'text-emerald-600' : amount > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                  {formatAmount(amount)}
                </span>
              </TableCell>
            );
          })}

          {/* Row Total */}
          <TableCell className="text-right font-semibold min-w-[120px] bg-muted/20">
            <span className={rowTotal > 0 && head.type === 'income' ? 'text-emerald-600' : rowTotal > 0 ? 'text-foreground' : 'text-muted-foreground'}>
              {formatAmount(rowTotal)}
            </span>
          </TableCell>

          {/* Actions - only show if there's submitted data to review */}
          {/* Actions - only show if viewing single department AND there's submitted data */}
          {selectedDepartment !== 'all' && (
            <TableCell className="sticky right-0 z-20 bg-card border-l min-w-[120px] shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              {hasData ? (
                <div className="flex justify-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleBulkAction(departmentId, head.id, 'approve', false)} title="Approve All Periods">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleBulkAction(departmentId, head.id, 'revision', false)} title="Request Modifications">
                    <RotateCcw className="h-4 w-4 text-amber-600" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleBulkAction(departmentId, head.id, 'reject', false)} title="Reject">
                    <X className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">No entry</span>
              )}
            </TableCell>
          )}
        </TableRow>

        {/* Subheads */}
        {hasSubheads && isExpanded && head.subheads!.map(subhead => 
          renderBudgetHeadRow({ ...subhead, subheads: [] }, allocations, departmentId, true)
        )}
      </React.Fragment>
    );
  };

  const renderCategorySummaryRow = (label: string, totals: Record<number, number>, grandTotal: number, colorClass: string) => (
    <TableRow className="bg-muted/50 font-semibold">
      <TableCell className={`sticky left-0 z-20 bg-muted border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${colorClass}`}>{label}</TableCell>
      {Array.from({ length: periodCount }, (_, i) => i + 1).map(periodNumber => (
        <TableCell key={periodNumber} className={`text-right ${colorClass}`}>
          {formatAmount(totals[periodNumber] || 0)}
        </TableCell>
      ))}
      <TableCell className={`text-right bg-muted/30 ${colorClass}`}>{formatAmount(grandTotal)}</TableCell>
      {selectedDepartment !== 'all' && (
        <TableCell className="sticky right-0 z-20 bg-muted border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]" />
      )}
    </TableRow>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Review Submissions</h2>
          <p className="text-sm text-muted-foreground">
            Review and approve department budget submissions
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedCycle} onValueChange={setSelectedCycle}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cycles</SelectItem>
              {budgetCycles?.map(cycle => (
                <SelectItem key={cycle.id} value={cycle.id}>{cycle.name} ({cycle.fiscal_year})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[180px]">
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

      {/* Summary Cards - 3 key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-600">{formatAmount(overallSummary.totalIncome)}</div>
            <p className="text-xs text-muted-foreground">
              Total Income {selectedDepartment === 'all' ? `(${overallSummary.totalDepartments} Departments)` : ''}
            </p>
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

      {/* Department-wise Grid View - uses ALL budget heads from master data */}
      {Object.entries(groupedData).map(([deptId, deptData]) => {
        const netTotal = deptData.totals.incomeTotal - deptData.totals.expenseTotal;

        return (
          <Card key={deptId}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-lg">{deptData.departmentName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{deptData.cycleName}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-emerald-600 font-medium">Income: {formatAmount(deptData.totals.incomeTotal)}</span>
                    <span className="text-rose-600 font-medium">Expense: {formatAmount(deptData.totals.expenseTotal)}</span>
                    <Badge variant={netTotal >= 0 ? "default" : "destructive"}>
                      Net: {formatAmount(netTotal)}
                    </Badge>
                  </div>
                  {/* Department-level bulk actions */}
                  {selectedDepartment !== 'all' && (
                    <div className="flex items-center gap-1 border-l pl-4 ml-2">
                      <Button 
                        size="sm" 
                        variant="default"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleBulkAction(deptId, null, 'approve', true)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve All
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-amber-500 text-amber-600 hover:bg-amber-50"
                        onClick={() => handleBulkAction(deptId, null, 'revision', true)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Request Revision
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-rose-500 text-rose-600 hover:bg-rose-50"
                        onClick={() => handleBulkAction(deptId, null, 'reject', true)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject All
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
            {/* Income Section - show ALL income heads */}
            {organizedAllHeads.income.length > 0 && (
              <Collapsible open={expandedSections.has('income')} onOpenChange={() => toggleSection('income')}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-950/30">
                    {expandedSections.has('income') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">Income</span>
                    <span className="ml-auto font-semibold text-emerald-600">{formatAmount(deptData.totals.incomeTotal)}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="overflow-x-auto mt-2 border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 z-30 bg-card border-r min-w-[220px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Budget Head</TableHead>
                            {periodLabels.map((label, idx) => (
                              <TableHead key={idx} className="text-right min-w-[100px] bg-card">{label}</TableHead>
                            ))}
                            <TableHead className="text-right min-w-[120px] bg-muted">Total</TableHead>
                            {selectedDepartment !== 'all' && (
                              <TableHead className="sticky right-0 z-30 bg-card border-l text-center min-w-[120px] shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Actions</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {organizedAllHeads.income.map(head => 
                            renderBudgetHeadRow(head, deptData.allocations, deptId)
                          )}
                          {renderCategorySummaryRow(
                            'Total Income',
                            deptData.totals.incomeByPeriod,
                            deptData.totals.incomeTotal,
                            'text-emerald-600'
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

            {/* Expenditure Section - show ALL expenditure heads */}
            {organizedAllHeads.expenditure.length > 0 && (
              <Collapsible open={expandedSections.has('expenditure')} onOpenChange={() => toggleSection('expenditure')}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-2 bg-rose-50 dark:bg-rose-950/20 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950/30">
                    {expandedSections.has('expenditure') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium text-rose-700 dark:text-rose-400">Expenditure</span>
                    <span className="ml-auto font-semibold text-rose-600">{formatAmount(deptData.totals.expenseTotal)}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="overflow-x-auto mt-2 border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 z-30 bg-card border-r min-w-[220px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Budget Head</TableHead>
                            {periodLabels.map((label, idx) => (
                              <TableHead key={idx} className="text-right min-w-[100px] bg-card">{label}</TableHead>
                            ))}
                            <TableHead className="text-right min-w-[120px] bg-muted">Total</TableHead>
                            {selectedDepartment !== 'all' && (
                              <TableHead className="sticky right-0 z-30 bg-card border-l text-center min-w-[120px] shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Actions</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {organizedAllHeads.expenditure.map(head => 
                            renderBudgetHeadRow(head, deptData.allocations, deptId)
                          )}
                          {renderCategorySummaryRow(
                            'Total Expenditure',
                            deptData.totals.expenseByPeriod,
                            deptData.totals.expenseTotal,
                            'text-rose-600'
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Net Summary */}
              <div className="flex justify-end pt-2 border-t">
                <div className="text-right">
                  <span className="text-sm text-muted-foreground mr-4">Net Budget:</span>
                  <span className={`text-lg font-bold ${netTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatAmount(netTotal)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>{getDialogDescription()}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Show bulk department summary when approving entire department */}
            {reviewDialog.isBulkDepartment && reviewDialog.departmentId && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="text-sm font-medium">Budget Summary</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total Income:</div>
                  <div className="text-right text-emerald-600 font-medium">
                    {formatAmount(groupedData[reviewDialog.departmentId]?.totals.incomeTotal || 0)}
                  </div>
                  <div>Total Expense:</div>
                  <div className="text-right text-rose-600 font-medium">
                    {formatAmount(groupedData[reviewDialog.departmentId]?.totals.expenseTotal || 0)}
                  </div>
                  <div className="font-medium">Net Budget:</div>
                  <div className={`text-right font-bold ${
                    (groupedData[reviewDialog.departmentId]?.totals.incomeTotal || 0) - 
                    (groupedData[reviewDialog.departmentId]?.totals.expenseTotal || 0) >= 0 
                      ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {formatAmount(
                      (groupedData[reviewDialog.departmentId]?.totals.incomeTotal || 0) - 
                      (groupedData[reviewDialog.departmentId]?.totals.expenseTotal || 0)
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Show period-by-period adjustments only for single head approval (not bulk) */}
            {reviewDialog.mode === 'approve' && reviewDialog.headId && reviewDialog.departmentId && !reviewDialog.isBulkDepartment && (
              <div className="space-y-2">
                <Label>Review Period Amounts (optional adjustments)</Label>
                <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-md p-2">
                  {Object.entries(groupedData[reviewDialog.departmentId]?.allocations[reviewDialog.headId] || {}).map(([period, allocation]) => (
                    <div key={period} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">{periodLabels[parseInt(period) - 1]}:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{formatAmount(allocation.allocated_amount)}</span>
                        <span className="text-muted-foreground">→</span>
                        <Input
                          type="number"
                          className="w-28 h-8"
                          placeholder="Approved"
                          value={approvalAdjustments[allocation.id] ?? allocation.allocated_amount}
                          onChange={(e) => setApprovalAdjustments(prev => ({
                            ...prev,
                            [allocation.id]: parseFloat(e.target.value) || 0
                          }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>{reviewDialog.mode === 'approve' ? 'Notes (optional)' : 'Comments (required)'}</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  reviewDialog.mode === 'revision' 
                    ? "Describe what modifications are needed..."
                    : reviewDialog.mode === 'reject'
                    ? "Provide reason for rejection..."
                    : "Add any notes..."
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button 
              onClick={submitReview}
              disabled={reviewMutation.isPending || (reviewDialog.mode !== 'approve' && !reviewNotes.trim())}
              variant={reviewDialog.mode === 'reject' ? 'destructive' : 'default'}
            >
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {reviewDialog.mode === 'approve' ? 'Approve' : reviewDialog.mode === 'reject' ? 'Reject' : 'Request Modifications'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetReview;
