
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Download } from "lucide-react";

const BudgetOverview = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("current");

  // Mock data - replace with actual database queries
  const budgetSummary = {
    totalBudget: 5000000,
    totalSpent: 3250000,
    totalCommitted: 750000,
    remainingBudget: 1000000,
    utilizationRate: 65,
  };

  const departmentBudgets = [
    { department: "IT", allocated: 1200000, spent: 780000, committed: 150000, utilization: 65 },
    { department: "HR", allocated: 800000, spent: 520000, committed: 100000, utilization: 65 },
    { department: "Operations", allocated: 1500000, spent: 975000, committed: 225000, utilization: 65 },
    { department: "Marketing", allocated: 700000, spent: 455000, committed: 105000, utilization: 65 },
    { department: "Finance", allocated: 800000, spent: 520000, committed: 120000, utilization: 65 },
  ];

  const categorySpending = [
    { name: "Personnel", value: 1800000, color: "#0088FE" },
    { name: "Equipment", value: 800000, color: "#00C49F" },
    { name: "Services", value: 450000, color: "#FFBB28" },
    { name: "Travel", value: 200000, color: "#FF8042" },
  ];

  const monthlyTrend = [
    { month: "Jan", budgeted: 400000, actual: 380000 },
    { month: "Feb", budgeted: 400000, actual: 420000 },
    { month: "Mar", budgeted: 400000, actual: 390000 },
    { month: "Apr", budgeted: 400000, actual: 450000 },
    { month: "May", budgeted: 400000, actual: 410000 },
    { month: "Jun", budgeted: 400000, actual: 430000 },
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Year</SelectItem>
              <SelectItem value="previous">Previous Year</SelectItem>
              <SelectItem value="quarter">Current Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${budgetSummary.totalBudget.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +5% from last year
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${budgetSummary.totalSpent.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-red-500" />
              +8% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Committed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${budgetSummary.totalCommitted.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
              -12% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${budgetSummary.remainingBudget.toLocaleString()}</div>
            <div className="flex items-center justify-between">
              <Progress value={budgetSummary.utilizationRate} className="w-full mt-2" />
              <span className="text-xs text-muted-foreground ml-2">{budgetSummary.utilizationRate}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="departments" className="w-full">
        <TabsList>
          <TabsTrigger value="departments">Department View</TabsTrigger>
          <TabsTrigger value="categories">Category View</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Department Budget Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departmentBudgets.map((dept) => (
                  <div key={dept.department} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{dept.department}</span>
                      <div className="flex items-center space-x-2">
                        <Badge variant={dept.utilization > 80 ? "destructive" : dept.utilization > 60 ? "secondary" : "default"}>
                          {dept.utilization}%
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          ${dept.spent.toLocaleString()} / ${dept.allocated.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <Progress value={dept.utilization} className="w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categorySpending}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {categorySpending.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual Spending Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="budgeted" fill="#8884d8" name="Budgeted" />
                  <Bar dataKey="actual" fill="#82ca9d" name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BudgetOverview;
