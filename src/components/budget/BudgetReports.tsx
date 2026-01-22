
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Download, Filter, Building2, AlertTriangle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

const BudgetReports = () => {
  const [reportType, setReportType] = useState("variance");
  const [dateRange, setDateRange] = useState("current-year");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  const { user, isLoading: authLoading } = useAuth();

  // Check if user is admin and get their department
  const { data: userContext, isLoading: userContextLoading } = useQuery({
    queryKey: ['budget-reports-user-context', user?.id],
    queryFn: async () => {
      if (!user) return { isAdmin: false, departmentId: null, departmentName: null };
      
      // Get user profile to find their department
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('department_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Fetch department name separately (no FK relationship)
      let departmentName = null;
      if (profile?.department_id) {
        const { data: dept } = await supabase
          .from('departments')
          .select('name')
          .eq('id', profile.department_id)
          .maybeSingle();
        departmentName = dept?.name || null;
      }
      
      // Get user roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role_id, custom_roles(name)')
        .eq('user_id', user.id);
      
      const isAdmin = roles?.some(r => ((r.custom_roles as any)?.name || '').toLowerCase() === 'admin');
      
      return {
        isAdmin: isAdmin || false,
        departmentId: profile?.department_id || null,
        departmentName
      };
    },
    enabled: !!user && !authLoading,
  });

  const isAdmin = userContext?.isAdmin ?? false;
  const userDepartmentId = userContext?.departmentId;
  const userDepartmentName = userContext?.departmentName;
  const userContextReady = !!userContext && !userContextLoading;

  // Fetch departments for filter dropdown (admin only sees all, managers see only their own)
  const { data: departments } = useQuery({
    queryKey: ['budget-reports-departments', userDepartmentId, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('departments')
        .select('id, name')
        .eq('is_active', true);
      
      if (!isAdmin && userDepartmentId) {
        query = query.eq('id', userDepartmentId);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: userContextReady && (isAdmin || !!userDepartmentId),
  });

  // Fetch real budget data filtered by department
  const { data: budgetData, isLoading: budgetDataLoading } = useQuery({
    queryKey: ['budget-reports-data', selectedDepartment, userDepartmentId, isAdmin],
    queryFn: async () => {
      const effectiveDepartmentId = isAdmin 
        ? (selectedDepartment === 'all' ? null : selectedDepartment)
        : userDepartmentId;

      let query = supabase
        .from('budget_allocations')
        .select(`
          *,
          departments(id, name),
          budget_heads(id, name, type)
        `);
      
      if (effectiveDepartmentId) {
        query = query.eq('department_id', effectiveDepartmentId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: userContextReady && (isAdmin || !!userDepartmentId),
  });

  // Process data for variance report
  const varianceData = React.useMemo(() => {
    if (!budgetData || budgetData.length === 0) return [];
    
    const deptMap = new Map<string, { department: string; budgeted: number; actual: number; variance: number; variancePercent: number }>();
    
    budgetData.forEach((allocation: any) => {
      const deptName = allocation.departments?.name || 'Unassigned';
      const existing = deptMap.get(deptName) || { department: deptName, budgeted: 0, actual: 0, variance: 0, variancePercent: 0 };
      
      existing.budgeted += allocation.allocated_amount || 0;
      existing.actual += allocation.approved_amount || 0;
      
      deptMap.set(deptName, existing);
    });
    
    return Array.from(deptMap.values()).map(item => ({
      ...item,
      variance: item.actual - item.budgeted,
      variancePercent: item.budgeted > 0 ? ((item.actual - item.budgeted) / item.budgeted) * 100 : 0
    }));
  }, [budgetData]);

  // Process data for utilization report
  const utilizationData = React.useMemo(() => {
    if (!budgetData || budgetData.length === 0) return [];
    
    const headMap = new Map<string, { category: string; allocated: number; utilized: number; rate: number }>();
    
    budgetData.forEach((allocation: any) => {
      const headName = allocation.budget_heads?.name || 'Unassigned';
      const existing = headMap.get(headName) || { category: headName, allocated: 0, utilized: 0, rate: 0 };
      
      existing.allocated += allocation.allocated_amount || 0;
      existing.utilized += allocation.approved_amount || 0;
      
      headMap.set(headName, existing);
    });
    
    return Array.from(headMap.values()).map(item => ({
      ...item,
      rate: item.allocated > 0 ? (item.utilized / item.allocated) * 100 : 0
    }));
  }, [budgetData]);

  const isLoading = authLoading || userContextLoading || budgetDataLoading;

  const handleExportReport = () => {
    console.log("Exporting report...");
    // Implement export functionality
  };

  const handleGenerateReport = () => {
    console.log("Generating report with filters:", { reportType, dateRange, selectedDepartment });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Non-admin without department assignment
  if (!isAdmin && !userDepartmentId && userContextReady) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Department Assigned</AlertTitle>
          <AlertDescription>
            You don't have a department assigned to your profile. Please contact an administrator to assign you to a department before viewing reports.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Department Context Banner for non-admin users */}
      {!isAdmin && userContextReady && userDepartmentName && (
        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertTitle>Department View</AlertTitle>
          <AlertDescription>
            You are viewing budget reports for <strong>{userDepartmentName}</strong>. Contact an administrator to view organization-wide reports.
          </AlertDescription>
        </Alert>
      )}

      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="variance">Budget Variance</SelectItem>
                  <SelectItem value="utilization">Budget Utilization</SelectItem>
                  <SelectItem value="trend">Trend Analysis</SelectItem>
                  <SelectItem value="forecast">Budget Forecast</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-year">Current Year</SelectItem>
                  <SelectItem value="previous-year">Previous Year</SelectItem>
                  <SelectItem value="quarter">Current Quarter</SelectItem>
                  <SelectItem value="month">Current Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select 
                value={isAdmin ? selectedDepartment : (userDepartmentId || 'all')} 
                onValueChange={setSelectedDepartment}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value="all">All Departments</SelectItem>}
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end space-x-2">
              <Button onClick={handleGenerateReport} className="flex-1">
                Generate Report
              </Button>
              <Button variant="outline" onClick={handleExportReport}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Data Message */}
      {varianceData.length === 0 && utilizationData.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Budget Data Available</h3>
            <p className="text-muted-foreground">
              {isAdmin 
                ? "No budget allocations found for the selected filters."
                : `No budget allocations found for ${userDepartmentName || 'your department'}.`
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Report Content */}
      {(varianceData.length > 0 || utilizationData.length > 0) && (
        <Tabs value={reportType} onValueChange={setReportType} className="w-full">
          <TabsList>
            <TabsTrigger value="variance">Budget Variance</TabsTrigger>
            <TabsTrigger value="utilization">Budget Utilization</TabsTrigger>
            <TabsTrigger value="trend">Trend Analysis</TabsTrigger>
            <TabsTrigger value="forecast">Budget Forecast</TabsTrigger>
          </TabsList>

          <TabsContent value="variance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget vs Actual Variance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={varianceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="budgeted" fill="hsl(var(--chart-1))" name="Budgeted" />
                    <Bar dataKey="actual" fill="hsl(var(--chart-2))" name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Variance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border p-3 text-left">Department</th>
                        <th className="border border-border p-3 text-right">Budgeted</th>
                        <th className="border border-border p-3 text-right">Actual</th>
                        <th className="border border-border p-3 text-right">Variance</th>
                        <th className="border border-border p-3 text-right">Variance %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {varianceData.map((row) => (
                        <tr key={row.department}>
                          <td className="border border-border p-3">{row.department}</td>
                          <td className="border border-border p-3 text-right">${row.budgeted.toLocaleString()}</td>
                          <td className="border border-border p-3 text-right">${row.actual.toLocaleString()}</td>
                          <td className={`border border-border p-3 text-right ${row.variance >= 0 ? 'text-destructive' : 'text-primary'}`}>
                            ${Math.abs(row.variance).toLocaleString()}
                          </td>
                          <td className={`border border-border p-3 text-right ${row.variancePercent >= 0 ? 'text-destructive' : 'text-primary'}`}>
                            {row.variancePercent > 0 ? '+' : ''}{row.variancePercent.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="utilization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget Utilization by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={utilizationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="allocated" fill="hsl(var(--chart-1))" name="Allocated" />
                    <Bar dataKey="utilized" fill="hsl(var(--chart-2))" name="Utilized" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trend" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget Trend Analysis</CardTitle>
              </CardHeader>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Trend analysis requires historical data. Coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecast" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget Forecast</CardTitle>
              </CardHeader>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Forecast analysis requires historical data. Coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default BudgetReports;
