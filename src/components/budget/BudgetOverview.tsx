import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Download, Calendar, CheckCircle2, Clock, FileText, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrencySymbol } from "@/utils/currencyUtils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useBudgetUserContext } from "@/hooks/useBudgetUserContext";

// Colorblind-accessible palettes using Wong's palette with distinct hues and luminance
const INCOME_COLORS = ["#009E73", "#56B4E9", "#0072B2", "#F0E442", "#CC79A7"];
const EXPENSE_COLORS = ["#D55E00", "#E69F00", "#882255", "#332288", "#AA4499"];
const BudgetOverview = () => {
  const currentYear = new Date().getFullYear();
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(currentYear.toString());
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");

  const { 
    isAdmin, 
    departments: userDepartments, 
    primaryDepartmentId,
    primaryDepartmentName,
    hasMultipleDepartments,
    isLoading: userContextLoading 
  } = useBudgetUserContext();

  // Set initial selected department to "all" for multi-department users
  React.useEffect(() => {
    if (!selectedDeptId && userDepartments.length > 0) {
      // Default to "all" for multi-department users, or single department id for single department
      setSelectedDeptId(hasMultipleDepartments ? "all" : userDepartments[0].id);
    }
  }, [userDepartments, selectedDeptId, hasMultipleDepartments]);

  // For filtering, determine which department IDs to query
  // Memoize the effective department IDs to ensure stable query keys
  const effectiveDeptIds = useMemo(() => {
    if (isAdmin) return null; // Admin sees all
    if (selectedDeptId === "all" || !selectedDeptId) {
      return userDepartments.map(d => d.id); // All assigned departments
    }
    return [selectedDeptId]; // Single selected department
  }, [isAdmin, selectedDeptId, userDepartments]);
  
  const selectedDeptName = selectedDeptId === "all" 
    ? "All Departments" 
    : userDepartments.find(d => d.id === selectedDeptId)?.name || userDepartments[0]?.name;

  // Fetch organization settings for currency - get the latest record
  const { data: orgSettings, isLoading: orgSettingsLoading } = useQuery({
    queryKey: ["organization-settings-budget-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("base_currency")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const currencySymbol = getCurrencySymbol(orgSettings?.base_currency || 'USD');
  const baseCurrency = orgSettings?.base_currency || 'USD';

  // Helper function to format currency with org settings
  const formatAmount = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString()}`;
  };

  // Fetch budget cycles
  const { data: budgetCycles, isLoading: cyclesLoading } = useQuery({
    queryKey: ["budget-cycles-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_cycles")
        .select("*")
        .order("fiscal_year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const userContextReady = !userContextLoading && (isAdmin || userDepartments.length > 0);

  const canLoadDepartmentScopedData = isAdmin || (effectiveDeptIds && effectiveDeptIds.length > 0);

  // Fetch budget allocations with related data - filter by departments for non-admin users
  const { data: allocations, isLoading: allocationsLoading } = useQuery({
    queryKey: ["budget-allocations-overview", selectedFiscalYear, effectiveDeptIds, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from("budget_allocations")
        .select(`
          *,
          budget_cycles!inner(fiscal_year, name, status),
          departments(id, name),
          budget_heads(id, name, type)
        `)
        .eq("budget_cycles.fiscal_year", parseInt(selectedFiscalYear));
      
      // Filter by user's assigned departments for non-admin users
      if (!isAdmin && effectiveDeptIds && effectiveDeptIds.length > 0) {
        query = query.in("department_id", effectiveDeptIds);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFiscalYear && userContextReady && canLoadDepartmentScopedData,
  });

  // Fetch departments - for non-admin, show all their assigned departments
  const { data: departments } = useQuery({
    queryKey: ["departments-overview", effectiveDeptIds, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from("departments")
        .select("*")
        .eq("is_active", true);
      
      // Filter by user's assigned departments for non-admin users
      if (!isAdmin && effectiveDeptIds && effectiveDeptIds.length > 0) {
        query = query.in("id", effectiveDeptIds);
      }
      
      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
    enabled: userContextReady && canLoadDepartmentScopedData,
  });

  // Get available fiscal years from cycles or generate range
  const fiscalYears = useMemo(() => {
    const years = new Set<number>();
    budgetCycles?.forEach(cycle => years.add(cycle.fiscal_year));
    // Add current year and next year if not present
    years.add(currentYear);
    years.add(currentYear + 1);
    return Array.from(years).sort((a, b) => b - a);
  }, [budgetCycles, currentYear]);

  // Get selected cycle info
  const selectedCycle = useMemo(() => {
    return budgetCycles?.find(c => c.fiscal_year === parseInt(selectedFiscalYear));
  }, [budgetCycles, selectedFiscalYear]);

  // Calculate summary data - separate income and expense
  const budgetSummary = useMemo(() => {
    if (!allocations || allocations.length === 0) {
      return {
        totalIncomeAllocated: 0,
        totalExpenseAllocated: 0,
        totalIncomeApproved: 0,
        totalExpenseApproved: 0,
        hasBudget: false,
        allocationsByStatus: { draft: 0, submitted: 0, approved: 0, rejected: 0 },
      };
    }

    let totalIncomeAllocated = 0;
    let totalExpenseAllocated = 0;
    let totalIncomeApproved = 0;
    let totalExpenseApproved = 0;

    allocations.forEach(a => {
      const headType = a.budget_heads?.type;
      if (headType === 'income') {
        totalIncomeAllocated += a.allocated_amount || 0;
        totalIncomeApproved += a.approved_amount || 0;
      } else {
        totalExpenseAllocated += a.allocated_amount || 0;
        totalExpenseApproved += a.approved_amount || 0;
      }
    });
    
    const statusCounts = allocations.reduce((acc, a) => {
      const status = a.status || 'draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalIncomeAllocated,
      totalExpenseAllocated,
      totalIncomeApproved,
      totalExpenseApproved,
      hasBudget: allocations.length > 0,
      allocationsByStatus: statusCounts,
    };
  }, [allocations]);

  // Calculate department-wise data
  const departmentBudgets = useMemo(() => {
    if (!allocations || !departments) return [];

    const deptMap = new Map<string, { 
      department: string; 
      allocated: number; 
      approved: number; 
      pending: number;
      status: string;
    }>();

    allocations.forEach(a => {
      const deptName = a.departments?.name || 'Unassigned';
      const existing = deptMap.get(deptName) || { 
        department: deptName, 
        allocated: 0, 
        approved: 0, 
        pending: 0,
        status: 'no_budget'
      };
      
      existing.allocated += a.allocated_amount || 0;
      existing.approved += a.approved_amount || 0;
      if (a.status === 'submitted') existing.pending += 1;
      
      // Set status based on allocation status
      if (a.status === 'approved') existing.status = 'approved';
      else if (a.status === 'submitted' && existing.status !== 'approved') existing.status = 'pending';
      else if (existing.status === 'no_budget') existing.status = a.status || 'draft';
      
      deptMap.set(deptName, existing);
    });

    // Add departments without allocations
    departments.forEach(d => {
      if (!deptMap.has(d.name)) {
        deptMap.set(d.name, {
          department: d.name,
          allocated: 0,
          approved: 0,
          pending: 0,
          status: 'no_budget'
        });
      }
    });

    return Array.from(deptMap.values()).sort((a, b) => a.department.localeCompare(b.department));
  }, [allocations, departments]);

  // Calculate budget head-wise data for pie charts - separate income and expense
  const incomeHeadSpending = useMemo(() => {
    if (!allocations) return [];

    const headMap = new Map<string, { name: string; value: number }>();
    
    allocations.forEach(a => {
      if (a.budget_heads?.type !== 'income') return;
      const headName = a.budget_heads?.name || 'Unassigned';
      const existing = headMap.get(headName) || { name: headName, value: 0 };
      existing.value += a.allocated_amount || 0;
      headMap.set(headName, existing);
    });

    return Array.from(headMap.values())
      .filter(h => h.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [allocations]);

  const expenseHeadSpending = useMemo(() => {
    if (!allocations) return [];

    const headMap = new Map<string, { name: string; value: number }>();
    
    allocations.forEach(a => {
      if (a.budget_heads?.type !== 'expenditure') return;
      const headName = a.budget_heads?.name || 'Unassigned';
      const existing = headMap.get(headName) || { name: headName, value: 0 };
      existing.value += a.allocated_amount || 0;
      headMap.set(headName, existing);
    });

    return Array.from(headMap.values())
      .filter(h => h.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [allocations]);

  // Combined for total count
  const budgetHeadSpending = useMemo(() => {
    return [...incomeHeadSpending, ...expenseHeadSpending];
  }, [incomeHeadSpending, expenseHeadSpending]);

  const isLoading = cyclesLoading || allocationsLoading || userContextLoading || orgSettingsLoading;

  const getCycleStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'open':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Open for Submissions</Badge>;
      case 'closed':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Closed</Badge>;
      case 'draft':
        return <Badge variant="outline"><FileText className="h-3 w-3 mr-1" /> Draft</Badge>;
      default:
        return <Badge variant="outline">No Cycle</Badge>;
    }
  };

  const getAllocationStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500">Approved</Badge>;
      case 'submitted':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Pending Approval</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'no_budget':
        return <Badge variant="outline" className="text-muted-foreground">No Budget</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Department Context Banner for non-admin users */}
      {!isAdmin && userContextReady && userDepartments.length > 0 && !hasMultipleDepartments && (
        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertTitle>Department View</AlertTitle>
          <AlertDescription>
            You are viewing budget data for <strong>{userDepartments[0]?.name}</strong>. Contact an administrator to view organization-wide budget data.
          </AlertDescription>
        </Alert>
      )}

      {/* No Department Warning for non-admin users without department */}
      {!isAdmin && userContextReady && userDepartments.length === 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Department Assigned</AlertTitle>
          <AlertDescription>
            You don't have a department assigned to your profile. Please contact an administrator to assign you to a department.
          </AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedFiscalYear} onValueChange={setSelectedFiscalYear}>
            <SelectTrigger className="w-48">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select fiscal year" />
            </SelectTrigger>
            <SelectContent>
              {fiscalYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  FY {year}-{(year + 1).toString().slice(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Department filter for non-admin users with multiple departments */}
          {!isAdmin && hasMultipleDepartments && (
            <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
              <SelectTrigger className="w-56">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments ({userDepartments.length})</SelectItem>
                {userDepartments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {getCycleStatusBadge(selectedCycle?.status)}
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Budget Cycle Status Alert */}
      {!selectedCycle && (
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Budget Cycle Found</h3>
            <p className="text-muted-foreground">
              No budget cycle has been created for FY {selectedFiscalYear}-{(parseInt(selectedFiscalYear) + 1).toString().slice(2)}.
              Create a budget cycle in Budget Allocation to start collecting budget submissions.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedCycle && !budgetSummary.hasBudget && (
        <Card className="border-dashed border-2 border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div>
                <h3 className="font-medium">No Budget Allocations Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Budget cycle "{selectedCycle.name}" exists but no departments have submitted budget allocations yet.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income Allocated</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatAmount(budgetSummary.totalIncomeAllocated)}</div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "Across all departments" : `For ${selectedDeptName}`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expense Allocated</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{formatAmount(budgetSummary.totalExpenseAllocated)}</div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "Across all departments" : `For ${selectedDeptName}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{budgetSummary.allocationsByStatus.submitted || 0}</div>
            <p className="text-xs text-muted-foreground">
              Submissions awaiting review
            </p>
          </CardContent>
        </Card>

        {isAdmin ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {departmentBudgets.filter(d => d.status !== 'no_budget').length} / {departments?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Have submitted budgets
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${budgetSummary.totalIncomeAllocated - budgetSummary.totalExpenseAllocated >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatAmount(budgetSummary.totalIncomeAllocated - budgetSummary.totalExpenseAllocated)}
              </div>
              <p className="text-xs text-muted-foreground">
                Income - Expenses
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue={isAdmin ? "departments" : "heads"} className="w-full">
        <TabsList>
          {isAdmin && <TabsTrigger value="departments">Department View</TabsTrigger>}
          <TabsTrigger value="heads">Budget by Category</TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="departments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Department Budget Status</CardTitle>
                <CardDescription>Budget allocation status by department for the selected fiscal year</CardDescription>
              </CardHeader>
              <CardContent>
              {departmentBudgets.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No departments found</p>
              ) : (
                <div className="space-y-4">
                  {departmentBudgets.map((dept) => (
                    <div key={dept.department} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{dept.department}</span>
                        <div className="flex items-center space-x-2">
                          {getAllocationStatusBadge(dept.status)}
                          <span className="text-sm text-muted-foreground">
                            {dept.allocated > 0 ? (
                              <>
                                {formatAmount(dept.approved)} / {formatAmount(dept.allocated)}
                              </>
                            ) : (
                              "No allocation"
                            )}
                          </span>
                        </div>
                      </div>
                      {dept.allocated > 0 && (
                        <Progress 
                          value={dept.allocated > 0 ? (dept.approved / dept.allocated) * 100 : 0} 
                          className="w-full h-2" 
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="heads" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Chart */}
            <Card className="border-t-4 border-t-emerald-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  Income by Category
                </CardTitle>
                <CardDescription>Distribution of income allocations across budget heads</CardDescription>
              </CardHeader>
              <CardContent>
                {incomeHeadSpending.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mb-2 opacity-30" />
                    <p>No income data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={incomeHeadSpending}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {incomeHeadSpending.map((entry, index) => (
                            <Cell key={`income-cell-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatAmount(value)}
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {incomeHeadSpending.map((entry, index) => {
                        const total = incomeHeadSpending.reduce((sum, e) => sum + e.value, 0);
                        const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;
                        return (
                          <div key={`income-legend-${index}`} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: INCOME_COLORS[index % INCOME_COLORS.length] }} 
                              />
                              <span className="truncate max-w-[120px]" title={entry.name}>{entry.name}</span>
                              <span className="text-muted-foreground">({percent}%)</span>
                            </div>
                            <span className="font-medium text-emerald-600">{formatAmount(entry.value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {incomeHeadSpending.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Total Income</span>
                      <span className="text-lg font-bold text-emerald-600">{formatAmount(budgetSummary.totalIncomeAllocated)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense Chart */}
            <Card className="border-t-4 border-t-rose-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-rose-500" />
                  Expenses by Category
                </CardTitle>
                <CardDescription>Distribution of expense allocations across budget heads</CardDescription>
              </CardHeader>
              <CardContent>
                {expenseHeadSpending.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <TrendingDown className="h-12 w-12 mb-2 opacity-30" />
                    <p>No expense data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={expenseHeadSpending}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {expenseHeadSpending.map((entry, index) => (
                            <Cell key={`expense-cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatAmount(value)}
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {expenseHeadSpending.map((entry, index) => {
                        const total = expenseHeadSpending.reduce((sum, e) => sum + e.value, 0);
                        const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;
                        return (
                          <div key={`expense-legend-${index}`} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }} 
                              />
                              <span className="truncate max-w-[120px]" title={entry.name}>{entry.name}</span>
                              <span className="text-muted-foreground">({percent}%)</span>
                            </div>
                            <span className="font-medium text-rose-600">{formatAmount(entry.value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {expenseHeadSpending.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Total Expenses</span>
                      <span className="text-lg font-bold text-rose-600">{formatAmount(budgetSummary.totalExpenseAllocated)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BudgetOverview;
