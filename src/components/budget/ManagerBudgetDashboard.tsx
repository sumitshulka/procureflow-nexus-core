import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardEdit, CheckCircle2, Clock, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import DataTable from "@/components/common/DataTable";
import { useState } from "react";
import BudgetEntryGrid from "./BudgetEntryGrid";

interface ManagerBudgetDashboardProps {
  departmentId: string;
  departmentName?: string;
}

const ManagerBudgetDashboard = ({ departmentId, departmentName }: ManagerBudgetDashboardProps) => {
  const [selectedCycle, setSelectedCycle] = useState<any>(null);

  // Fetch open budget cycles for the manager's department
  const { data: openCycles, isLoading: cyclesLoading } = useQuery({
    queryKey: ['manager-open-cycles', departmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_cycles')
        .select('*')
        .eq('status', 'open')
        .order('fiscal_year', { ascending: false });

      if (error) throw error;

      // Filter cycles that allow this department
      return (data || []).filter((cycle: any) => {
        if (!cycle.allowed_department_ids) return true; // null means all departments
        return cycle.allowed_department_ids.includes(departmentId);
      });
    },
    enabled: !!departmentId
  });

  // Fetch approved budget submissions for the department
  const { data: approvedSubmissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ['manager-approved-submissions', departmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_allocations')
        .select(`
          *,
          cycle:budget_cycles(name, fiscal_year, period_type),
          head:budget_heads(name, code, type)
        `)
        .eq('department_id', departmentId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!departmentId
  });

  // Fetch in-progress/pending submissions for status display
  const { data: pendingSubmissions } = useQuery({
    queryKey: ['manager-pending-submissions', departmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_allocations')
        .select(`
          *,
          cycle:budget_cycles(name, fiscal_year)
        `)
        .eq('department_id', departmentId)
        .in('status', ['submitted', 'under_review', 'draft'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!departmentId
  });

  // Calculate summary stats
  const totalApprovedBudget = approvedSubmissions?.reduce(
    (sum, item) => sum + (item.approved_amount || 0), 0
  ) || 0;

  const pendingCount = pendingSubmissions?.filter(s => s.status === 'submitted' || s.status === 'under_review').length || 0;
  const draftCount = pendingSubmissions?.filter(s => s.status === 'draft').length || 0;

  const getPeriodLabel = (periodNumber: number, periodType: string) => {
    if (periodType === 'monthly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[periodNumber - 1];
    }
    return `Q${periodNumber}`;
  };

  const submissionColumns = [
    {
      id: 'cycle',
      header: 'Budget Cycle',
      cell: (row: any) => `${row.cycle?.name} (FY ${row.cycle?.fiscal_year})`
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
      id: 'approved_amount',
      header: 'Approved Amount',
      cell: (row: any) => (
        <span className="font-semibold text-primary">
          ${row.approved_amount?.toLocaleString() || '0'}
        </span>
      )
    }
  ];

  if (cyclesLoading || submissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If a cycle is selected for budget entry, show the grid
  if (selectedCycle) {
    return (
      <BudgetEntryGrid
        cycle={selectedCycle}
        departmentId={departmentId}
        onBack={() => setSelectedCycle(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Approved Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalApprovedBudget.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current fiscal year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Entries</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedSubmissions?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Budget line items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Entries</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
            <p className="text-xs text-muted-foreground">Not yet submitted</p>
          </CardContent>
        </Card>
      </div>

      {/* Open Budget Cycles - Action Items */}
      {openCycles && openCycles.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardEdit className="h-5 w-5 text-primary" />
              Open Budget Cycles - Action Required
            </CardTitle>
            <CardDescription>
              The following budget cycles are open for submission. Click to start entering your department's budget.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {openCycles.map((cycle: any) => (
                <div
                  key={cycle.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                >
                  <div>
                    <h4 className="font-semibold">{cycle.name}</h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>FY {cycle.fiscal_year}</span>
                      <span>•</span>
                      <span className="capitalize">{cycle.period_type}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(cycle.start_date), 'MMM dd, yyyy')} - {format(new Date(cycle.end_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                  <Button onClick={() => setSelectedCycle(cycle)}>
                    <ClipboardEdit className="h-4 w-4 mr-2" />
                    Enter Budget
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Open Cycles Message */}
      {(!openCycles || openCycles.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Open Budget Cycles</h3>
            <p className="text-muted-foreground text-center max-w-md">
              There are no budget cycles currently open for your department. 
              You will be notified when a new cycle opens.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Approved Submissions Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Approved Budget Summary</CardTitle>
          <CardDescription>
            Your department's approved budget allocations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={submissionColumns}
            data={approvedSubmissions || []}
            emptyMessage="No approved budget submissions yet"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerBudgetDashboard;
