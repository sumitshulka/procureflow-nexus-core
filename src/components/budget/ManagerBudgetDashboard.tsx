import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ClipboardEdit, CheckCircle2, Clock, TrendingUp, Building2, FileEdit, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import DataTable from "@/components/common/DataTable";
import BudgetEntryGrid from "./BudgetEntryGrid";
import DraftPendingGrid from "./DraftPendingGrid";
import { getCurrencySymbol } from "@/utils/currencyUtils";

interface DepartmentInfo {
  id: string;
  name: string;
}

interface ManagerBudgetDashboardProps {
  departments: DepartmentInfo[];
  hasMultipleDepartments?: boolean;
}

const ManagerBudgetDashboard = ({ departments, hasMultipleDepartments = false }: ManagerBudgetDashboardProps) => {
  const { toast } = useToast();
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(departments[0]?.id || '');
  
  const selectedDepartment = departments.find(d => d.id === selectedDepartmentId);

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

  // Fetch open budget cycles for the manager's departments
  const { data: openCycles, isLoading: cyclesLoading } = useQuery({
    queryKey: ['manager-open-cycles', departments.map(d => d.id)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_cycles')
        .select('*')
        .eq('status', 'open')
        .order('fiscal_year', { ascending: false });

      if (error) throw error;

      // Filter cycles that allow any of the user's departments
      return (data || []).filter((cycle: any) => {
        if (!cycle.allowed_department_ids) return true; // null means all departments
        return departments.some(dept => cycle.allowed_department_ids.includes(dept.id));
      });
    },
    enabled: departments.length > 0
  });

  // Fetch approved budget submissions for selected department
  const { data: approvedSubmissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ['manager-approved-submissions', selectedDepartmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_allocations')
        .select(`
          *,
          cycle:budget_cycles(name, fiscal_year, period_type),
          head:budget_heads(name, code, type)
        `)
        .eq('department_id', selectedDepartmentId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDepartmentId
  });

  // Fetch in-progress/pending/draft submissions for selected department (for DraftPendingGrid)
  const { data: pendingSubmissions } = useQuery({
    queryKey: ['manager-pending-submissions', selectedDepartmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_allocations')
        .select(`
          *,
          cycle:budget_cycles(name, fiscal_year, period_type),
          head:budget_heads(name, code, type)
        `)
        .eq('department_id', selectedDepartmentId)
        .in('status', ['submitted', 'under_review', 'draft'])
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDepartmentId
  });

  // Fetch submitted/pending allocations for ALL user's departments (for Enter Budget button checks)
  const { data: allDeptPendingSubmissions } = useQuery({
    queryKey: ['manager-all-dept-pending', departments.map(d => d.id)],
    queryFn: async () => {
      const deptIds = departments.map(d => d.id);
      const { data, error } = await supabase
        .from('budget_allocations')
        .select('id, cycle_id, department_id, status')
        .in('department_id', deptIds)
        .in('status', ['submitted', 'under_review']);

      if (error) throw error;
      return data || [];
    },
    enabled: departments.length > 0
  });

  // Aggregate stats across all departments for summary cards
  const { data: allDeptStats } = useQuery({
    queryKey: ['manager-all-dept-stats', departments.map(d => d.id)],
    queryFn: async () => {
      const deptIds = departments.map(d => d.id);
      
      const { data, error } = await supabase
        .from('budget_allocations')
        .select('approved_amount, status, department_id')
        .in('department_id', deptIds);

      if (error) throw error;

      let totalApproved = 0;
      let pendingCount = 0;
      let draftCount = 0;

      (data || []).forEach(item => {
        if (item.status === 'approved') {
          totalApproved += item.approved_amount || 0;
        } else if (item.status === 'submitted' || item.status === 'under_review') {
          pendingCount++;
        } else if (item.status === 'draft') {
          draftCount++;
        }
      });

      return { totalApproved, pendingCount, draftCount };
    },
    enabled: departments.length > 0
  });

  const totalApprovedBudget = allDeptStats?.totalApproved || 0;
  const pendingCount = allDeptStats?.pendingCount || 0;
  const draftCount = allDeptStats?.draftCount || 0;

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
          {currencySymbol}{row.approved_amount?.toLocaleString() || '0'}
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
        departmentId={selectedCycle.selectedDepartmentId || selectedDepartmentId}
        onBack={() => setSelectedCycle(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Department Selector for Multi-Department Managers */}
      {hasMultipleDepartments && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Select Department
            </CardTitle>
            <CardDescription>
              You manage {departments.length} departments. Select one to view details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => (
                <Button
                  key={dept.id}
                  variant={selectedDepartmentId === dept.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDepartmentId(dept.id)}
                >
                  {dept.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards - Aggregated across all departments */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Approved Budget</CardTitle>
            <span className="text-sm font-medium text-muted-foreground">{currencySymbol}</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{totalApprovedBudget.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {hasMultipleDepartments ? `Across ${departments.length} departments` : 'Current fiscal year'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Entries</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedSubmissions?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {selectedDepartment?.name || 'Selected department'}
            </p>
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
              The following budget cycles are open for submission. 
              {hasMultipleDepartments && " You can enter budget for each of your departments."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {openCycles.map((cycle: any) => (
                <div
                  key={cycle.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-3">
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
                  </div>
                  
                  {/* Department-specific entry buttons */}
                  <div className="flex flex-wrap gap-2">
                    {departments.map((dept) => {
                      // Check if this department is allowed in the cycle
                      const isAllowed = !cycle.allowed_department_ids || cycle.allowed_department_ids.includes(dept.id);
                      if (!isAllowed) return null;

                      // Check if THIS SPECIFIC department has pending submissions for this cycle
                      const deptPendingSubs = allDeptPendingSubmissions?.filter(
                        (sub: any) => sub.cycle_id === cycle.id && 
                        sub.department_id === dept.id &&
                        (sub.status === 'submitted' || sub.status === 'under_review')
                      ) || [];
                      const hasPendingApproval = deptPendingSubs.length > 0;

                      if (hasPendingApproval) {
                        return (
                          <TooltipProvider key={dept.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  className="opacity-60"
                                  onClick={() => {
                                    toast({
                                      title: "Cannot Enter Budget",
                                      description: "Budget has been sent for approval and cannot be edited now. Please contact your administrator or revoke the submission from the pending section below.",
                                      variant: "destructive"
                                    });
                                  }}
                                >
                                  <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                                  Enter Budget for {dept.name}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Budget is pending approval. See pending submissions below.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      }
                      
                      return (
                        <Button 
                          key={dept.id}
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCycle({ ...cycle, selectedDepartmentId: dept.id })}
                        >
                          <ClipboardEdit className="h-4 w-4 mr-2" />
                          Enter Budget for {dept.name}
                        </Button>
                      );
                    })}
                  </div>
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
              There are no budget cycles currently open for your department(s). 
              You will be notified when a new cycle opens.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Draft & Pending Submissions Grid - Grouped by Cycle */}
      {pendingSubmissions && pendingSubmissions.length > 0 && (
        <DraftPendingGrid 
          submissions={pendingSubmissions} 
          currencySymbol={currencySymbol}
          departmentName={selectedDepartment?.name}
          onEditCycle={(cycle: any, cycleId: string) => setSelectedCycle({ 
            ...cycle, 
            id: cycleId, 
            selectedDepartmentId: selectedDepartmentId 
          })}
        />
      )}

      {/* Approved Submissions Summary for Selected Department */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Approved Budget Summary
            {selectedDepartment && (
              <Badge variant="outline">{selectedDepartment.name}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {hasMultipleDepartments 
              ? `Budget allocations for ${selectedDepartment?.name || 'selected department'}`
              : "Your department's approved budget allocations"
            }
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
