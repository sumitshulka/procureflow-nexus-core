import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Save, Send, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface BudgetEntryGridProps {
  cycle: any;
  departmentId: string;
  onBack: () => void;
}

interface BudgetHead {
  id: string;
  name: string;
  code: string;
  type: string;
  parent_id: string | null;
  is_subhead: boolean;
  display_order: number;
  allow_department_subitems: boolean;
}

interface BudgetEntry {
  headId: string;
  periodNumber: number;
  amount: number;
  allocationId?: string;
  status?: string;
}

const BudgetEntryGrid = ({ cycle, departmentId, onBack }: BudgetEntryGridProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<Record<string, number>>({});
  const [expandedHeads, setExpandedHeads] = useState<Set<string>>(new Set());
  const [isAddSubheadDialogOpen, setIsAddSubheadDialogOpen] = useState(false);
  const [selectedParentHead, setSelectedParentHead] = useState<BudgetHead | null>(null);
  const [newSubheadName, setNewSubheadName] = useState("");

  const periodCount = cycle.period_type === 'monthly' ? 12 : 4;
  const periodLabels = useMemo(() => {
    if (cycle.period_type === 'monthly') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }
    return ['Q1', 'Q2', 'Q3', 'Q4'];
  }, [cycle.period_type]);

  // Fetch budget heads
  const { data: budgetHeads, isLoading: headsLoading } = useQuery({
    queryKey: ['budget-heads-grid', cycle.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_heads')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as BudgetHead[];
    }
  });

  // Fetch existing allocations for this cycle and department
  const { data: existingAllocations, isLoading: allocationsLoading } = useQuery({
    queryKey: ['budget-allocations-grid', cycle.id, departmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_allocations')
        .select('*')
        .eq('cycle_id', cycle.id)
        .eq('department_id', departmentId);

      if (error) throw error;
      return data || [];
    }
  });

  // Initialize entries from existing allocations
  useEffect(() => {
    if (existingAllocations) {
      const initialEntries: Record<string, number> = {};
      existingAllocations.forEach((allocation: any) => {
        const key = `${allocation.head_id}-${allocation.period_number}`;
        initialEntries[key] = allocation.allocated_amount || 0;
      });
      setEntries(initialEntries);
    }
  }, [existingAllocations]);

  // Organize heads hierarchically
  const organizedHeads = useMemo(() => {
    if (!budgetHeads) return { income: [], expenditure: [] };

    const incomeHeads = budgetHeads.filter(h => h.type === 'income');
    const expenditureHeads = budgetHeads.filter(h => h.type === 'expenditure');

    const organize = (heads: BudgetHead[]) => {
      const mainHeads = heads.filter(h => !h.parent_id);
      return mainHeads.map(main => ({
        ...main,
        subheads: heads.filter(h => h.parent_id === main.id)
      }));
    };

    return {
      income: organize(incomeHeads),
      expenditure: organize(expenditureHeads)
    };
  }, [budgetHeads]);

  const getEntryKey = (headId: string, periodNumber: number) => `${headId}-${periodNumber}`;

  const handleValueChange = (headId: string, periodNumber: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEntries(prev => ({
      ...prev,
      [getEntryKey(headId, periodNumber)]: numValue
    }));
  };

  const getHeadTotal = (headId: string) => {
    let total = 0;
    for (let i = 1; i <= periodCount; i++) {
      total += entries[getEntryKey(headId, i)] || 0;
    }
    return total;
  };

  const getParentTotal = (head: any) => {
    let total = getHeadTotal(head.id);
    if (head.subheads) {
      head.subheads.forEach((subhead: BudgetHead) => {
        total += getHeadTotal(subhead.id);
      });
    }
    return total;
  };

  const getPeriodTotal = (periodNumber: number, type: string) => {
    const heads = type === 'income' ? organizedHeads.income : organizedHeads.expenditure;
    let total = 0;
    heads.forEach(head => {
      total += entries[getEntryKey(head.id, periodNumber)] || 0;
      if (head.subheads) {
        head.subheads.forEach((subhead: BudgetHead) => {
          total += entries[getEntryKey(subhead.id, periodNumber)] || 0;
        });
      }
    });
    return total;
  };

  const getGrandTotal = (type: string) => {
    let total = 0;
    for (let i = 1; i <= periodCount; i++) {
      total += getPeriodTotal(i, type);
    }
    return total;
  };

  const toggleHeadExpansion = (headId: string) => {
    setExpandedHeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(headId)) {
        newSet.delete(headId);
      } else {
        newSet.add(headId);
      }
      return newSet;
    });
  };

  const handleAddSubhead = (parentHead: BudgetHead) => {
    setSelectedParentHead(parentHead);
    setNewSubheadName("");
    setIsAddSubheadDialogOpen(true);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (submitAfterSave: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const allocationsToUpsert: any[] = [];

      Object.entries(entries).forEach(([key, amount]) => {
        const [headId, periodStr] = key.split('-');
        const periodNumber = parseInt(periodStr);

        if (amount > 0) {
          const existing = existingAllocations?.find(
            (a: any) => a.head_id === headId && a.period_number === periodNumber
          );

          allocationsToUpsert.push({
            id: existing?.id,
            cycle_id: cycle.id,
            head_id: headId,
            department_id: departmentId,
            period_number: periodNumber,
            allocated_amount: amount,
            status: submitAfterSave ? 'submitted' : (existing?.status || 'draft'),
            submitted_by: user.id,
            submitted_at: submitAfterSave ? new Date().toISOString() : existing?.submitted_at
          });
        }
      });

      if (allocationsToUpsert.length === 0) {
        throw new Error("No budget entries to save");
      }

      const { error } = await supabase
        .from('budget_allocations')
        .upsert(allocationsToUpsert, { onConflict: 'id' });

      if (error) throw error;
      return submitAfterSave;
    },
    onSuccess: (wasSubmitted) => {
      queryClient.invalidateQueries({ queryKey: ['budget-allocations-grid'] });
      queryClient.invalidateQueries({ queryKey: ['manager-approved-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['manager-pending-submissions'] });
      
      toast({
        title: wasSubmitted ? "Budget Submitted" : "Budget Saved",
        description: wasSubmitted 
          ? "Your budget has been submitted for approval." 
          : "Your budget entries have been saved as draft."
      });

      if (wasSubmitted) {
        onBack();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Add subhead mutation
  const addSubheadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedParentHead || !newSubheadName.trim()) {
        throw new Error("Please enter a subhead name");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate code and display order for the new subhead
      const parentDisplayOrder = selectedParentHead.display_order;
      const existingSubheads = budgetHeads?.filter(h => h.parent_id === selectedParentHead.id) || [];
      const nextSubOrder = existingSubheads.length + 1;
      const displayOrder = Math.floor(parentDisplayOrder) + (nextSubOrder * 0.1);
      const code = `${selectedParentHead.code}-${String(nextSubOrder).padStart(2, '0')}`;

      const { error } = await supabase
        .from('budget_heads')
        .insert({
          name: newSubheadName.trim(),
          code,
          type: selectedParentHead.type,
          parent_id: selectedParentHead.id,
          is_subhead: true,
          display_order: displayOrder,
          is_active: true,
          created_by: user.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-heads-grid'] });
      setIsAddSubheadDialogOpen(false);
      setNewSubheadName("");
      setSelectedParentHead(null);
      toast({ title: "Sub-head added successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding sub-head",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const renderHeadRow = (head: any, isSubhead: boolean = false, parentExpanded: boolean = true) => {
    const hasSubheads = head.subheads && head.subheads.length > 0;
    const isExpanded = expandedHeads.has(head.id);
    const canAddSubheads = head.allow_department_subitems && !isSubhead;
    const isParentHead = !isSubhead && hasSubheads;

    if (!parentExpanded) return null;

    return (
      <React.Fragment key={head.id}>
        <TableRow className={isSubhead ? "bg-muted/30" : "bg-muted/10 font-medium"}>
          <TableCell className="sticky left-0 bg-inherit border-r min-w-[200px]">
            <div className={`flex items-center gap-2 ${isSubhead ? 'pl-6' : ''}`}>
              {hasSubheads && (
                <button
                  onClick={() => toggleHeadExpansion(head.id)}
                  className="p-0.5 hover:bg-muted rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              <div>
                <div className="font-medium">{head.name}</div>
                <div className="text-xs text-muted-foreground">{head.code}</div>
              </div>
              {canAddSubheads && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 ml-2"
                  onClick={() => handleAddSubhead(head)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          </TableCell>

          {/* Period columns */}
          {Array.from({ length: periodCount }, (_, i) => i + 1).map(periodNumber => (
            <TableCell key={periodNumber} className="p-1 min-w-[100px]">
              {isParentHead ? (
                // Parent heads show calculated sum from subheads
                <div className="text-right font-medium text-muted-foreground px-2">
                  ${(head.subheads.reduce((sum: number, sub: BudgetHead) => 
                    sum + (entries[getEntryKey(sub.id, periodNumber)] || 0), 0
                  ) + (entries[getEntryKey(head.id, periodNumber)] || 0)).toLocaleString()}
                </div>
              ) : (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entries[getEntryKey(head.id, periodNumber)] || ''}
                  onChange={(e) => handleValueChange(head.id, periodNumber, e.target.value)}
                  className="h-8 text-right"
                  placeholder="0"
                />
              )}
            </TableCell>
          ))}

          {/* Row total */}
          <TableCell className="text-right font-semibold bg-muted/20 sticky right-0 min-w-[120px]">
            ${(isParentHead ? getParentTotal(head) : getHeadTotal(head.id)).toLocaleString()}
          </TableCell>
        </TableRow>

        {/* Render subheads */}
        {hasSubheads && isExpanded && head.subheads.map((subhead: BudgetHead) => 
          renderHeadRow(subhead, true, isExpanded)
        )}
      </React.Fragment>
    );
  };

  const renderTypeSection = (type: 'income' | 'expenditure', heads: any[]) => {
    if (heads.length === 0) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
          <Badge variant={type === 'income' ? 'default' : 'secondary'}>
            {type}
          </Badge>
        </h3>
        
        <div className="border rounded-lg overflow-hidden">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="sticky left-0 bg-muted border-r min-w-[200px]">
                    Budget Head
                  </TableHead>
                  {periodLabels.map((label, i) => (
                    <TableHead key={i} className="text-center min-w-[100px]">
                      {label}
                    </TableHead>
                  ))}
                  <TableHead className="text-right sticky right-0 bg-muted min-w-[120px]">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Period Totals Row */}
                <TableRow className="bg-primary/10 font-bold">
                  <TableCell className="sticky left-0 bg-primary/10 border-r">
                    Total {type === 'income' ? 'Income' : 'Expenditure'}
                  </TableCell>
                  {Array.from({ length: periodCount }, (_, i) => i + 1).map(periodNumber => (
                    <TableCell key={periodNumber} className="text-right">
                      ${getPeriodTotal(periodNumber, type).toLocaleString()}
                    </TableCell>
                  ))}
                  <TableCell className="text-right sticky right-0 bg-primary/10">
                    ${getGrandTotal(type).toLocaleString()}
                  </TableCell>
                </TableRow>

                {/* Budget Head Rows */}
                {heads.map(head => renderHeadRow(head))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    );
  };

  if (headsLoading || allocationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{cycle.name}</h2>
            <p className="text-muted-foreground">
              FY {cycle.fiscal_year} • {cycle.period_type === 'monthly' ? 'Monthly' : 'Quarterly'} Budget
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate(false)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Draft
          </Button>
          <Button
            onClick={() => saveMutation.mutate(true)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Submit for Approval
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            Enter budget amounts for each budget head and period. Parent heads will automatically 
            calculate totals from their sub-heads. Click <Plus className="h-3 w-3 inline" /> to add 
            sub-heads where allowed. Save as draft to continue later, or submit when complete.
          </p>
        </CardContent>
      </Card>

      {/* Income Section */}
      {renderTypeSection('income', organizedHeads.income)}

      {/* Expenditure Section */}
      {renderTypeSection('expenditure', organizedHeads.expenditure)}

      {/* Add Subhead Dialog */}
      <Dialog open={isAddSubheadDialogOpen} onOpenChange={setIsAddSubheadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sub-head</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-muted-foreground">Parent Head</Label>
              <p className="font-medium">{selectedParentHead?.name} ({selectedParentHead?.code})</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subhead-name">Sub-head Name</Label>
              <Input
                id="subhead-name"
                value={newSubheadName}
                onChange={(e) => setNewSubheadName(e.target.value)}
                placeholder="Enter sub-head name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSubheadDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => addSubheadMutation.mutate()}
              disabled={addSubheadMutation.isPending || !newSubheadName.trim()}
            >
              {addSubheadMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Sub-head
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetEntryGrid;
