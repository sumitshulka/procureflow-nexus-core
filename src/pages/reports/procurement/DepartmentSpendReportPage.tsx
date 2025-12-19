import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/ui/date-picker";
import { Download, ArrowLeft, Building2, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { formatCurrency } from "@/utils/currencyUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const DepartmentSpendReportPage = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(subMonths(new Date(), 6)));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  const { data: departments = [], isLoading: deptLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: requests = [], isLoading: reqLoading } = useQuery({
    queryKey: ["procurement-requests-for-dept-spend", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procurement_requests")
        .select("*")
        .gte("created_at", format(startDate, "yyyy-MM-dd"))
        .lte("created_at", format(endDate, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
  });

  const { data: budgetAllocations = [], isLoading: budgetLoading } = useQuery({
    queryKey: ["budget-allocations-for-dept"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_allocations")
        .select("*, departments:department_id (name)");
      if (error) throw error;
      return data || [];
    },
  });

  // Aggregate spend by department
  const departmentSpend = departments.map((dept: any) => {
    const deptRequests = requests.filter((req: any) => req.department === dept.name);
    const totalSpend = deptRequests.reduce((sum: number, req: any) => sum + (req.estimated_value || 0), 0);
    const requestCount = deptRequests.length;
    
    // Get budget for department
    const deptBudget = budgetAllocations
      .filter((ba: any) => ba.department_id === dept.id)
      .reduce((sum: number, ba: any) => sum + (ba.allocated_amount || 0), 0);
    
    const budgetUtilization = deptBudget > 0 ? (totalSpend / deptBudget) * 100 : 0;
    const variance = deptBudget - totalSpend;

    return {
      id: dept.id,
      name: dept.name,
      totalSpend,
      requestCount,
      budget: deptBudget,
      budgetUtilization: Math.min(100, budgetUtilization),
      variance,
      isOverBudget: variance < 0,
    };
  }).sort((a, b) => b.totalSpend - a.totalSpend);

  const totalSpend = departmentSpend.reduce((sum, d) => sum + d.totalSpend, 0);
  const totalBudget = departmentSpend.reduce((sum, d) => sum + d.budget, 0);
  const overBudgetDepts = departmentSpend.filter((d) => d.isOverBudget).length;

  const chartData = departmentSpend.slice(0, 8).map((d) => ({
    name: d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name,
    spend: d.totalSpend,
    budget: d.budget,
  }));

  const pieData = departmentSpend.slice(0, 6).map((d) => ({
    name: d.name,
    value: d.totalSpend,
  }));

  const isLoading = deptLoading || reqLoading || budgetLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Department Spend Report"
          description="Spending analysis by department with budget comparisons"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Over Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overBudgetDepts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <DatePicker date={startDate} onDateChange={(d) => d && setStartDate(d)} placeholder="Start Date" />
            <DatePicker date={endDate} onDateChange={(d) => d && setEndDate(d)} placeholder="End Date" />
            <Button variant="outline" className="ml-auto">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spend vs Budget by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="spend" name="Actual Spend" fill="#0088FE" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="budget" name="Budget" fill="#00C49F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spend Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name.substring(0, 10)}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Department Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departmentSpend.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-right">{dept.requestCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(dept.totalSpend)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(dept.budget)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={dept.budgetUtilization} 
                          className={`w-20 ${dept.isOverBudget ? "[&>div]:bg-destructive" : ""}`}
                        />
                        <span className="text-sm">{dept.budgetUtilization.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${dept.isOverBudget ? "text-destructive" : "text-green-600"}`}>
                      {dept.isOverBudget ? (
                        <span className="flex items-center justify-end gap-1">
                          <TrendingDown className="h-4 w-4" />
                          {formatCurrency(Math.abs(dept.variance))}
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-1">
                          <TrendingUp className="h-4 w-4" />
                          {formatCurrency(dept.variance)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {dept.isOverBudget ? (
                        <span className="text-destructive font-medium">Over Budget</span>
                      ) : (
                        <span className="text-green-600">Within Budget</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DepartmentSpendReportPage;
