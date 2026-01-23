import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, ChevronDown, ChevronRight, FileText, Users, TrendingUp, Calendar, Filter } from "lucide-react";
import { getCurrencySymbol } from "@/utils/currencyUtils";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from "recharts";

interface BudgetCycleDashboardViewProps {
  cycleId: string;
}

interface BudgetHead {
  id: string;
  name: string;
  code: string;
  type: string;
  parent_id: string | null;
  display_order: number;
}

const STATUS_COLORS = {
  draft: "hsl(var(--muted-foreground))",
  submitted: "hsl(45, 93%, 47%)",       // Amber
  under_review: "hsl(45, 93%, 47%)",    // Amber
  approved: "hsl(142, 71%, 45%)",       // Emerald
  rejected: "hsl(0, 84%, 60%)",         // Rose
  revision_requested: "hsl(25, 95%, 53%)" // Orange
};

const BudgetCycleDashboardView: React.FC<BudgetCycleDashboardViewProps> = ({ cycleId }) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['income', 'expenditure']));

  // Fetch organization settings for currency
  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings-dashboard'],
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

  // Fetch cycle details
  const { data: cycle, isLoading: cycleLoading } = useQuery({
    queryKey: ['budget-cycle-detail', cycleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_cycles')
        .select('*')
        .eq('id', cycleId)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // Fetch all departments
  const { data: departments } = useQuery({
    queryKey: ['departments-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch all budget heads
  const { data: budgetHeads } = useQuery({
    queryKey: ['budget-heads-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_heads')
        .select('id, name, code, type, parent_id, display_order')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as BudgetHead[];
    }
  });

  // Fetch all allocations for this cycle
  const { data: allocations, isLoading: allocationsLoading } = useQuery({
    queryKey: ['budget-allocations-dashboard', cycleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_allocations')
        .select(`
          *,
          head:budget_heads(id, name, code, type, parent_id, display_order),
          department:departments(id, name)
        `)
        .eq('cycle_id', cycleId)
        .limit(2000);
      if (error) throw error;
      return data;
    }
  });

  // Calculate department status summary
  const departmentStatusSummary = useMemo(() => {
    if (!allocations) return { draft: 0, pending: 0, approved: 0, rejected: 0, revision: 0, total: 0 };

    const deptStatusMap: Record<string, Set<string>> = {};
    allocations.forEach(a => {
      if (!deptStatusMap[a.department_id]) {
        deptStatusMap[a.department_id] = new Set();
      }
      deptStatusMap[a.department_id].add(a.status);
    });

    let draft = 0, pending = 0, approved = 0, rejected = 0, revision = 0;
    
    Object.values(deptStatusMap).forEach(statuses => {
      // Determine primary status for department
      if (statuses.has('draft') && !statuses.has('submitted') && !statuses.has('approved')) {
        draft++;
      } else if (statuses.has('submitted') || statuses.has('under_review')) {
        pending++;
      } else if (statuses.has('approved') && !statuses.has('submitted') && !statuses.has('under_review')) {
        approved++;
      } else if (statuses.has('rejected') && !statuses.has('submitted')) {
        rejected++;
      } else if (statuses.has('revision_requested') && !statuses.has('submitted')) {
        revision++;
      }
    });

    return { draft, pending, approved, rejected, revision, total: Object.keys(deptStatusMap).length };
  }, [allocations]);

  // Calculate budget totals
  const budgetTotals = useMemo(() => {
    if (!allocations) return { income: 0, expense: 0, approvedIncome: 0, approvedExpense: 0 };

    let income = 0, expense = 0, approvedIncome = 0, approvedExpense = 0;
    
    const filteredAllocations = selectedDepartment === 'all' 
      ? allocations 
      : allocations.filter(a => a.department_id === selectedDepartment);

    filteredAllocations.forEach(a => {
      const amount = a.allocated_amount || 0;
      const approvedAmount = a.status === 'approved' ? (a.approved_amount || a.allocated_amount || 0) : 0;
      
      if (a.head?.type === 'income') {
        income += amount;
        approvedIncome += approvedAmount;
      } else {
        expense += amount;
        approvedExpense += approvedAmount;
      }
    });

    return { income, expense, approvedIncome, approvedExpense };
  }, [allocations, selectedDepartment]);

  // Calculate period breakdown
  const periodBreakdown = useMemo(() => {
    if (!allocations || !cycle) return [];

    const periodLabels = cycle.period_type === 'monthly' 
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['Q1', 'Q2', 'Q3', 'Q4'];

    const periodCount = cycle.period_type === 'monthly' ? 12 : 4;
    const periods: { period: string; income: number; expense: number }[] = [];

    const filteredAllocations = selectedDepartment === 'all' 
      ? allocations 
      : allocations.filter(a => a.department_id === selectedDepartment);

    for (let i = 1; i <= periodCount; i++) {
      let income = 0, expense = 0;
      filteredAllocations.filter(a => a.period_number === i).forEach(a => {
        if (a.head?.type === 'income') {
          income += a.allocated_amount || 0;
        } else {
          expense += a.allocated_amount || 0;
        }
      });
      periods.push({ period: periodLabels[i - 1], income, expense });
    }

    return periods;
  }, [allocations, cycle, selectedDepartment]);

  // Calculate head-wise totals
  const headWiseTotals = useMemo(() => {
    if (!allocations || !budgetHeads) return { income: [], expenditure: [] };

    const filteredAllocations = selectedDepartment === 'all' 
      ? allocations 
      : allocations.filter(a => a.department_id === selectedDepartment);

    const headTotals: Record<string, number> = {};
    filteredAllocations.forEach(a => {
      headTotals[a.head_id] = (headTotals[a.head_id] || 0) + (a.allocated_amount || 0);
    });

    const mainHeads = budgetHeads.filter(h => !h.parent_id);
    
    const buildHeadData = (type: string) => {
      return mainHeads
        .filter(h => h.type === type)
        .map(head => {
          const subheads = budgetHeads.filter(h => h.parent_id === head.id);
          const subTotal = subheads.reduce((sum, sh) => sum + (headTotals[sh.id] || 0), 0);
          const directTotal = headTotals[head.id] || 0;
          return {
            ...head,
            total: directTotal + subTotal,
            subheads: subheads.map(sh => ({
              ...sh,
              total: headTotals[sh.id] || 0
            }))
          };
        })
        .filter(h => h.total > 0 || h.subheads.some(sh => sh.total > 0));
    };

    return {
      income: buildHeadData('income'),
      expenditure: buildHeadData('expenditure')
    };
  }, [allocations, budgetHeads, selectedDepartment]);

  // Group allocations for grid view
  const gridData = useMemo(() => {
    if (!allocations || !budgetHeads || !cycle) return null;

    const filteredAllocations = selectedDepartment === 'all' 
      ? allocations 
      : allocations.filter(a => a.department_id === selectedDepartment);

    const periodCount = cycle.period_type === 'monthly' ? 12 : 4;
    const periodLabels = cycle.period_type === 'monthly' 
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['Q1', 'Q2', 'Q3', 'Q4'];

    // Group by head
    const headData: Record<string, Record<number, number>> = {};
    filteredAllocations.forEach(a => {
      if (!headData[a.head_id]) headData[a.head_id] = {};
      headData[a.head_id][a.period_number] = (headData[a.head_id][a.period_number] || 0) + (a.allocated_amount || 0);
    });

    return { headData, periodCount, periodLabels };
  }, [allocations, budgetHeads, cycle, selectedDepartment]);

  const formatAmount = (amount: number) => `${currencySymbol}${amount.toLocaleString()}`;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  // Status pie chart data
  const statusPieData = [
    { name: 'Draft', value: departmentStatusSummary.draft, color: STATUS_COLORS.draft },
    { name: 'Pending', value: departmentStatusSummary.pending, color: STATUS_COLORS.submitted },
    { name: 'Approved', value: departmentStatusSummary.approved, color: STATUS_COLORS.approved },
    { name: 'Rejected', value: departmentStatusSummary.rejected, color: STATUS_COLORS.rejected },
    { name: 'Revision', value: departmentStatusSummary.revision, color: STATUS_COLORS.revision_requested },
  ].filter(d => d.value > 0);

  if (cycleLoading || allocationsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Budget cycle not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{cycle.name}</h1>
            <Badge variant={cycle.status === 'open' ? 'default' : 'outline'} className="capitalize">
              {cycle.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            FY {cycle.fiscal_year} • {cycle.period_type === 'monthly' ? 'Monthly' : 'Quarterly'} Budget
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select department" />
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

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-muted-foreground">{departmentStatusSummary.draft}</div>
            <p className="text-xs text-muted-foreground">Draft</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">{departmentStatusSummary.pending}</div>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-600">{departmentStatusSummary.approved}</div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-rose-600">{departmentStatusSummary.rejected}</div>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{departmentStatusSummary.revision}</div>
            <p className="text-xs text-muted-foreground">Needs Revision</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-600">{formatAmount(budgetTotals.income)}</div>
            <p className="text-xs text-muted-foreground">Total Budgeted Income</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-rose-600">{formatAmount(budgetTotals.expense)}</div>
            <p className="text-xs text-muted-foreground">Total Budgeted Expense</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold ${budgetTotals.income - budgetTotals.expense >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatAmount(budgetTotals.income - budgetTotals.expense)}
            </div>
            <p className="text-xs text-muted-foreground">Net Budget</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{formatAmount(budgetTotals.approvedIncome - budgetTotals.approvedExpense)}</div>
            <p className="text-xs text-muted-foreground">Approved Net</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="period" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Period Breakdown
          </TabsTrigger>
          <TabsTrigger value="heads" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Head-wise Totals
          </TabsTrigger>
          <TabsTrigger value="grid" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Detailed Grid
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department Status Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Department Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {statusPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Income vs Expense Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Budgeted vs Approved</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { name: 'Income', budgeted: budgetTotals.income, approved: budgetTotals.approvedIncome },
                    { name: 'Expense', budgeted: budgetTotals.expense, approved: budgetTotals.approvedExpense },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => `${currencySymbol}${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value: number) => formatAmount(value)} />
                    <Legend />
                    <Bar dataKey="budgeted" fill="hsl(var(--primary))" name="Budgeted" />
                    <Bar dataKey="approved" fill="hsl(142, 71%, 45%)" name="Approved" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Period Breakdown Tab */}
        <TabsContent value="period">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Period-wise Budget Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={periodBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(v) => `${currencySymbol}${(v/1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value: number) => formatAmount(value)} />
                  <Legend />
                  <Bar dataKey="income" fill="hsl(142, 71%, 45%)" name="Income" />
                  <Bar dataKey="expense" fill="hsl(0, 84%, 60%)" name="Expense" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Head-wise Totals Tab */}
        <TabsContent value="heads" className="space-y-4">
          {/* Income Heads */}
          {headWiseTotals.income.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-emerald-700">Income Budget Heads</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Budget Head</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {headWiseTotals.income.map(head => (
                      <React.Fragment key={head.id}>
                        <TableRow className="font-medium bg-muted/30">
                          <TableCell>{head.code} - {head.name}</TableCell>
                          <TableCell className="text-right">{formatAmount(head.total)}</TableCell>
                        </TableRow>
                        {head.subheads.map(sub => (
                          <TableRow key={sub.id} className="text-sm">
                            <TableCell className="pl-8">{sub.code} - {sub.name}</TableCell>
                            <TableCell className="text-right">{formatAmount(sub.total)}</TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Expenditure Heads */}
          {headWiseTotals.expenditure.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-rose-700">Expenditure Budget Heads</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Budget Head</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {headWiseTotals.expenditure.map(head => (
                      <React.Fragment key={head.id}>
                        <TableRow className="font-medium bg-muted/30">
                          <TableCell>{head.code} - {head.name}</TableCell>
                          <TableCell className="text-right">{formatAmount(head.total)}</TableCell>
                        </TableRow>
                        {head.subheads.map(sub => (
                          <TableRow key={sub.id} className="text-sm">
                            <TableCell className="pl-8">{sub.code} - {sub.name}</TableCell>
                            <TableCell className="text-right">{formatAmount(sub.total)}</TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Detailed Grid Tab */}
        <TabsContent value="grid" className="space-y-4">
          {gridData && budgetHeads && (
            <>
              {/* Income Section */}
              <Collapsible open={expandedSections.has('income')} onOpenChange={() => toggleSection('income')}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 flex flex-row items-center justify-between">
                      <CardTitle className="text-base text-emerald-700 flex items-center gap-2">
                        {expandedSections.has('income') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        Income Budget
                      </CardTitle>
                      <span className="text-emerald-600 font-semibold">{formatAmount(budgetTotals.income)}</span>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="sticky left-0 bg-card z-10 min-w-[200px]">Budget Head</TableHead>
                              {gridData.periodLabels.map((label, idx) => (
                                <TableHead key={idx} className="text-right min-w-[100px]">{label}</TableHead>
                              ))}
                              <TableHead className="text-right min-w-[120px] bg-muted">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {budgetHeads
                              .filter(h => h.type === 'income' && !h.parent_id)
                              .map(head => {
                                const subheads = budgetHeads.filter(h => h.parent_id === head.id);
                                const getAllTotal = (headId: string) => {
                                  let total = 0;
                                  for (let p = 1; p <= gridData.periodCount; p++) {
                                    total += gridData.headData[headId]?.[p] || 0;
                                  }
                                  return total;
                                };
                                const headTotal = getAllTotal(head.id) + subheads.reduce((sum, sh) => sum + getAllTotal(sh.id), 0);

                                return (
                                  <React.Fragment key={head.id}>
                                    <TableRow className="font-medium bg-muted/30">
                                      <TableCell className="sticky left-0 bg-muted/30 z-10">{head.code} - {head.name}</TableCell>
                                      {Array.from({ length: gridData.periodCount }, (_, i) => {
                                        const periodTotal = (gridData.headData[head.id]?.[i + 1] || 0) + 
                                          subheads.reduce((sum, sh) => sum + (gridData.headData[sh.id]?.[i + 1] || 0), 0);
                                        return (
                                          <TableCell key={i} className="text-right">
                                            {periodTotal > 0 ? formatAmount(periodTotal) : '-'}
                                          </TableCell>
                                        );
                                      })}
                                      <TableCell className="text-right bg-muted font-semibold">
                                        {formatAmount(headTotal)}
                                      </TableCell>
                                    </TableRow>
                                    {subheads.map(sub => (
                                      <TableRow key={sub.id} className="text-sm">
                                        <TableCell className="sticky left-0 bg-card z-10 pl-6">{sub.code} - {sub.name}</TableCell>
                                        {Array.from({ length: gridData.periodCount }, (_, i) => (
                                          <TableCell key={i} className="text-right">
                                            {gridData.headData[sub.id]?.[i + 1] ? formatAmount(gridData.headData[sub.id][i + 1]) : '-'}
                                          </TableCell>
                                        ))}
                                        <TableCell className="text-right bg-muted">
                                          {formatAmount(getAllTotal(sub.id))}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </React.Fragment>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Expenditure Section */}
              <Collapsible open={expandedSections.has('expenditure')} onOpenChange={() => toggleSection('expenditure')}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 flex flex-row items-center justify-between">
                      <CardTitle className="text-base text-rose-700 flex items-center gap-2">
                        {expandedSections.has('expenditure') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        Expenditure Budget
                      </CardTitle>
                      <span className="text-rose-600 font-semibold">{formatAmount(budgetTotals.expense)}</span>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="sticky left-0 bg-card z-10 min-w-[200px]">Budget Head</TableHead>
                              {gridData.periodLabels.map((label, idx) => (
                                <TableHead key={idx} className="text-right min-w-[100px]">{label}</TableHead>
                              ))}
                              <TableHead className="text-right min-w-[120px] bg-muted">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {budgetHeads
                              .filter(h => h.type === 'expenditure' && !h.parent_id)
                              .map(head => {
                                const subheads = budgetHeads.filter(h => h.parent_id === head.id);
                                const getAllTotal = (headId: string) => {
                                  let total = 0;
                                  for (let p = 1; p <= gridData.periodCount; p++) {
                                    total += gridData.headData[headId]?.[p] || 0;
                                  }
                                  return total;
                                };
                                const headTotal = getAllTotal(head.id) + subheads.reduce((sum, sh) => sum + getAllTotal(sh.id), 0);

                                return (
                                  <React.Fragment key={head.id}>
                                    <TableRow className="font-medium bg-muted/30">
                                      <TableCell className="sticky left-0 bg-muted/30 z-10">{head.code} - {head.name}</TableCell>
                                      {Array.from({ length: gridData.periodCount }, (_, i) => {
                                        const periodTotal = (gridData.headData[head.id]?.[i + 1] || 0) + 
                                          subheads.reduce((sum, sh) => sum + (gridData.headData[sh.id]?.[i + 1] || 0), 0);
                                        return (
                                          <TableCell key={i} className="text-right">
                                            {periodTotal > 0 ? formatAmount(periodTotal) : '-'}
                                          </TableCell>
                                        );
                                      })}
                                      <TableCell className="text-right bg-muted font-semibold">
                                        {formatAmount(headTotal)}
                                      </TableCell>
                                    </TableRow>
                                    {subheads.map(sub => (
                                      <TableRow key={sub.id} className="text-sm">
                                        <TableCell className="sticky left-0 bg-card z-10 pl-6">{sub.code} - {sub.name}</TableCell>
                                        {Array.from({ length: gridData.periodCount }, (_, i) => (
                                          <TableCell key={i} className="text-right">
                                            {gridData.headData[sub.id]?.[i + 1] ? formatAmount(gridData.headData[sub.id][i + 1]) : '-'}
                                          </TableCell>
                                        ))}
                                        <TableCell className="text-right bg-muted">
                                          {formatAmount(getAllTotal(sub.id))}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </React.Fragment>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BudgetCycleDashboardView;
