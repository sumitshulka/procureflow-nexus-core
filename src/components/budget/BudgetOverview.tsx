import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Download, Calendar, CheckCircle2, Clock, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/utils/currencyUtils";

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const BudgetOverview = () => {
  const currentYear = new Date().getFullYear();
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(currentYear.toString());

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

  // Fetch budget allocations with related data
  const { data: allocations, isLoading: allocationsLoading } = useQuery({
    queryKey: ["budget-allocations-overview", selectedFiscalYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_allocations")
        .select(`
          *,
          budget_cycles!inner(fiscal_year, name, status),
          departments(id, name),
          budget_heads(id, name, type)
        `)
        .eq("budget_cycles.fiscal_year", parseInt(selectedFiscalYear));
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFiscalYear,
  });

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ["departments-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
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

  // Calculate summary data
  const budgetSummary = useMemo(() => {
    if (!allocations || allocations.length === 0) {
      return {
        totalBudget: 0,
        totalApproved: 0,
        totalPending: 0,
        hasBudget: false,
        allocationsByStatus: { draft: 0, submitted: 0, approved: 0, rejected: 0 },
      };
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + (a.allocated_amount || 0), 0);
    const totalApproved = allocations.reduce((sum, a) => sum + (a.approved_amount || 0), 0);
    
    const statusCounts = allocations.reduce((acc, a) => {
      const status = a.status || 'draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalBudget: totalAllocated,
      totalApproved: totalApproved,
      totalPending: allocations.filter(a => a.status === 'submitted').length,
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

  // Calculate budget head-wise data for pie chart
  const budgetHeadSpending = useMemo(() => {
    if (!allocations) return [];

    const headMap = new Map<string, { name: string; value: number }>();
    
    allocations.forEach(a => {
      const headName = a.budget_heads?.name || 'Unassigned';
      const existing = headMap.get(headName) || { name: headName, value: 0 };
      existing.value += a.allocated_amount || 0;
      headMap.set(headName, existing);
    });

    return Array.from(headMap.values())
      .filter(h => h.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [allocations]);

  const isLoading = cyclesLoading || allocationsLoading;

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
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budgetSummary.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">
              Across all departments for FY {selectedFiscalYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budgetSummary.totalApproved)}</div>
            <p className="text-xs text-muted-foreground">
              {budgetSummary.allocationsByStatus.approved || 0} allocations approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{budgetSummary.allocationsByStatus.submitted || 0}</div>
            <p className="text-xs text-muted-foreground">
              Submissions awaiting review
            </p>
          </CardContent>
        </Card>

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
      </div>

      <Tabs defaultValue="departments" className="w-full">
        <TabsList>
          <TabsTrigger value="departments">Department View</TabsTrigger>
          <TabsTrigger value="heads">Budget Heads</TabsTrigger>
          <TabsTrigger value="details">Allocation Details</TabsTrigger>
        </TabsList>

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
                                {formatCurrency(dept.approved)} / {formatCurrency(dept.allocated)}
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

        <TabsContent value="heads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget by Category</CardTitle>
              <CardDescription>Allocation distribution across budget heads</CardDescription>
            </CardHeader>
            <CardContent>
              {budgetHeadSpending.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No budget data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={budgetHeadSpending}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {budgetHeadSpending.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Allocation Details</CardTitle>
              <CardDescription>Detailed view of all budget allocations</CardDescription>
            </CardHeader>
            <CardContent>
              {!allocations || allocations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No allocations found for the selected year</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Budget Head</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead className="text-right">Approved</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map((allocation) => (
                      <TableRow key={allocation.id}>
                        <TableCell className="font-medium">
                          {allocation.departments?.name || 'Unassigned'}
                        </TableCell>
                        <TableCell>{allocation.budget_heads?.name || '-'}</TableCell>
                        <TableCell>Period {allocation.period_number}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(allocation.allocated_amount || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(allocation.approved_amount || 0)}
                        </TableCell>
                        <TableCell>
                          {getAllocationStatusBadge(allocation.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BudgetOverview;
