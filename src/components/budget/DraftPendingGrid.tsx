import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, FileEdit, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

interface DraftPendingGridProps {
  submissions: any[];
  currencySymbol: string;
  departmentName?: string;
  onEditCycle: (cycle: any, cycleId: string) => void;
}

interface BudgetHeadInfo {
  id: string;
  name: string;
  code: string;
  type: string;
}

const DraftPendingGrid = ({ submissions, currencySymbol, departmentName, onEditCycle }: DraftPendingGridProps) => {
  // Group submissions by cycle
  const groupedByCycle = useMemo(() => {
    const groups: Record<string, {
      cycle: any;
      periodType: string;
      periodCount: number;
      submissions: any[];
      incomeHeads: Map<string, BudgetHeadInfo>;
      expenditureHeads: Map<string, BudgetHeadInfo>;
    }> = {};

    submissions.forEach(sub => {
      const cycleId = sub.cycle_id;
      if (!groups[cycleId]) {
        const periodType = sub.cycle?.period_type || 'quarterly';
        groups[cycleId] = {
          cycle: sub.cycle,
          periodType,
          periodCount: periodType === 'monthly' ? 12 : 4,
          submissions: [],
          incomeHeads: new Map(),
          expenditureHeads: new Map()
        };
      }
      groups[cycleId].submissions.push(sub);
      
      // Collect unique budget heads by type
      if (sub.head) {
        const headInfo: BudgetHeadInfo = {
          id: sub.head_id,
          name: sub.head.name,
          code: sub.head.code,
          type: sub.head.type
        };
        
        if (sub.head.type === 'income') {
          groups[cycleId].incomeHeads.set(sub.head_id, headInfo);
        } else {
          groups[cycleId].expenditureHeads.set(sub.head_id, headInfo);
        }
      }
    });

    return groups;
  }, [submissions]);

  const getPeriodLabels = (periodType: string) => {
    if (periodType === 'monthly') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }
    return ['Q1', 'Q2', 'Q3', 'Q4'];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="text-xs">Draft</Badge>;
      case 'submitted':
        return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">Pending</Badge>;
      case 'under_review':
        return <Badge variant="secondary" className="text-xs bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">Review</Badge>;
      default:
        return null;
    }
  };

  // Get the overall status for a cycle (draft if any draft, else submitted)
  const getCycleStatus = (subs: any[]) => {
    const hasDraft = subs.some(s => s.status === 'draft');
    const hasSubmitted = subs.some(s => s.status === 'submitted' || s.status === 'under_review');
    if (hasDraft && hasSubmitted) return 'mixed';
    if (hasDraft) return 'draft';
    return 'submitted';
  };

  const renderTypeSection = (
    type: 'income' | 'expenditure',
    heads: BudgetHeadInfo[],
    submissionLookup: Map<string, any>,
    periodLabels: string[],
    periodCount: number
  ) => {
    if (heads.length === 0) return null;

    const getRowTotal = (headId: string) => {
      let total = 0;
      for (let p = 1; p <= periodCount; p++) {
        const sub = submissionLookup.get(`${headId}-${p}`);
        total += sub?.allocated_amount || 0;
      }
      return total;
    };

    const getColumnTotal = (periodNumber: number) => {
      let total = 0;
      heads.forEach(head => {
        const sub = submissionLookup.get(`${head.id}-${periodNumber}`);
        total += sub?.allocated_amount || 0;
      });
      return total;
    };

    const sectionTotal = heads.reduce((sum, head) => sum + getRowTotal(head.id), 0);

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-2 px-1">
          {type === 'income' ? (
            <>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-700 dark:text-emerald-400">Income</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-4 w-4 text-rose-600" />
              <span className="text-rose-700 dark:text-rose-400">Expenditure</span>
            </>
          )}
        </h4>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className={type === 'income' ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "bg-rose-50/50 dark:bg-rose-950/20"}>
                  <TableHead className={`sticky left-0 z-20 min-w-[200px] font-semibold border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${type === 'income' ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-rose-50 dark:bg-rose-950/30'}`}>
                    Budget Head
                  </TableHead>
                  {periodLabels.map((label, idx) => (
                    <TableHead key={idx} className="text-center min-w-[100px] font-semibold">
                      {label}
                    </TableHead>
                  ))}
                  <TableHead className="text-right min-w-[120px] font-semibold bg-muted/50">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {heads.map((head) => (
                  <TableRow key={head.id} className="hover:bg-muted/30">
                    <TableCell className="sticky left-0 bg-card z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div>
                        <div className="font-medium">{head.name}</div>
                        <div className="text-xs text-muted-foreground">{head.code}</div>
                      </div>
                    </TableCell>
                    {Array.from({ length: periodCount }, (_, i) => i + 1).map(periodNumber => {
                      const sub = submissionLookup.get(`${head.id}-${periodNumber}`);
                      const amount = sub?.allocated_amount || 0;
                      
                      return (
                        <TableCell key={periodNumber} className="text-center p-2">
                          {amount > 0 ? (
                            <span className="font-medium">
                              {currencySymbol}{amount.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-semibold bg-muted/30 border-l">
                      {currencySymbol}{getRowTotal(head.id).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Section Totals Row */}
                <TableRow className={`font-semibold ${type === 'income' ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>
                  <TableCell className={`sticky left-0 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${type === 'income' ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-rose-50 dark:bg-rose-950/30'}`}>
                    {type === 'income' ? 'Total Income' : 'Total Expenditure'}
                  </TableCell>
                  {Array.from({ length: periodCount }, (_, i) => i + 1).map(periodNumber => (
                    <TableCell key={periodNumber} className="text-center">
                      {currencySymbol}{getColumnTotal(periodNumber).toLocaleString()}
                    </TableCell>
                  ))}
                  <TableCell className={`text-right border-l ${type === 'income' ? 'bg-emerald-100/50 dark:bg-emerald-900/30' : 'bg-rose-100/50 dark:bg-rose-900/30'}`}>
                    {currencySymbol}{sectionTotal.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {Object.entries(groupedByCycle).map(([cycleId, group]) => {
        const periodLabels = getPeriodLabels(group.periodType);
        const incomeHeadsArray = Array.from(group.incomeHeads.values())
          .sort((a, b) => a.code.localeCompare(b.code));
        const expenditureHeadsArray = Array.from(group.expenditureHeads.values())
          .sort((a, b) => a.code.localeCompare(b.code));
        
        // Create a lookup for quick access: headId-periodNumber -> submission
        const submissionLookup = new Map<string, any>();
        group.submissions.forEach(sub => {
          submissionLookup.set(`${sub.head_id}-${sub.period_number}`, sub);
        });

        const cycleStatus = getCycleStatus(group.submissions);
        const lastUpdated = group.submissions.reduce((latest, sub) => {
          const subDate = new Date(sub.updated_at || sub.created_at);
          return subDate > latest ? subDate : latest;
        }, new Date(0));

        const totalHeads = incomeHeadsArray.length + expenditureHeadsArray.length;

        return (
          <Card key={cycleId} className="border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-5 w-5 text-amber-600" />
                    {group.cycle?.name} (FY {group.cycle?.fiscal_year})
                  </CardTitle>
                  {cycleStatus === 'draft' && (
                    <Badge variant="outline" className="bg-muted">Draft</Badge>
                  )}
                  {cycleStatus === 'submitted' && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">Pending Approval</Badge>
                  )}
                  {cycleStatus === 'mixed' && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200">Partially Submitted</Badge>
                  )}
                  {departmentName && (
                    <Badge variant="outline">{departmentName}</Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditCycle(group.cycle, cycleId)}
                >
                  <FileEdit className="h-4 w-4 mr-2" />
                  Edit Budget
                </Button>
              </div>
              <CardDescription>
                Last updated: {format(lastUpdated, 'MMM dd, yyyy HH:mm')} • {totalHeads} budget head(s) • {group.submissions.length} entries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderTypeSection('income', incomeHeadsArray, submissionLookup, periodLabels, group.periodCount)}
              {renderTypeSection('expenditure', expenditureHeadsArray, submissionLookup, periodLabels, group.periodCount)}
            </CardContent>
          </Card>
        );
      })}
    </>
  );
};

export default DraftPendingGrid;
