
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Download, Filter, Calendar } from "lucide-react";

const BudgetReports = () => {
  const [reportType, setReportType] = useState("variance");
  const [dateRange, setDateRange] = useState("current-year");
  const [department, setDepartment] = useState("all");

  // Mock data for reports
  const varianceData = [
    { department: "IT", budgeted: 500000, actual: 520000, variance: 20000, variancePercent: 4 },
    { department: "HR", budgeted: 300000, actual: 280000, variance: -20000, variancePercent: -6.7 },
    { department: "Operations", budgeted: 800000, actual: 850000, variance: 50000, variancePercent: 6.3 },
    { department: "Marketing", budgeted: 400000, actual: 380000, variance: -20000, variancePercent: -5 },
    { department: "Finance", budgeted: 250000, actual: 240000, variance: -10000, variancePercent: -4 },
  ];

  const trendData = [
    { month: "Jan", budget: 400000, actual: 380000, forecast: 390000 },
    { month: "Feb", budget: 400000, actual: 420000, forecast: 410000 },
    { month: "Mar", budget: 400000, actual: 390000, forecast: 395000 },
    { month: "Apr", budget: 400000, actual: 450000, forecast: 425000 },
    { month: "May", budget: 400000, actual: 410000, forecast: 415000 },
    { month: "Jun", budget: 400000, actual: 430000, forecast: 420000 },
  ];

  const utilizationData = [
    { category: "Personnel", allocated: 2000000, utilized: 1800000, rate: 90 },
    { category: "Equipment", allocated: 1000000, utilized: 650000, rate: 65 },
    { category: "Services", allocated: 800000, utilized: 600000, rate: 75 },
    { category: "Travel", allocated: 300000, utilized: 180000, rate: 60 },
    { category: "Utilities", allocated: 200000, utilized: 190000, rate: 95 },
  ];

  const handleExportReport = () => {
    console.log("Exporting report...");
    // Implement export functionality
  };

  const handleGenerateReport = () => {
    console.log("Generating report with filters:", { reportType, dateRange, department });
    // Implement report generation
  };

  return (
    <div className="space-y-6">
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
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="it">IT</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
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

      {/* Report Content */}
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
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="budgeted" fill="#8884d8" name="Budgeted" />
                  <Bar dataKey="actual" fill="#82ca9d" name="Actual" />
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
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 p-3 text-left">Department</th>
                      <th className="border border-gray-200 p-3 text-right">Budgeted</th>
                      <th className="border border-gray-200 p-3 text-right">Actual</th>
                      <th className="border border-gray-200 p-3 text-right">Variance</th>
                      <th className="border border-gray-200 p-3 text-right">Variance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {varianceData.map((row) => (
                      <tr key={row.department}>
                        <td className="border border-gray-200 p-3">{row.department}</td>
                        <td className="border border-gray-200 p-3 text-right">${row.budgeted.toLocaleString()}</td>
                        <td className="border border-gray-200 p-3 text-right">${row.actual.toLocaleString()}</td>
                        <td className={`border border-gray-200 p-3 text-right ${row.variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${Math.abs(row.variance).toLocaleString()}
                        </td>
                        <td className={`border border-gray-200 p-3 text-right ${row.variancePercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {row.variancePercent > 0 ? '+' : ''}{row.variancePercent}%
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
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="allocated" fill="#8884d8" name="Allocated" />
                  <Bar dataKey="utilized" fill="#82ca9d" name="Utilized" />
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
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="budget" stroke="#8884d8" name="Budget" />
                  <Line type="monotone" dataKey="actual" stroke="#82ca9d" name="Actual" />
                  <Line type="monotone" dataKey="forecast" stroke="#ffc658" name="Forecast" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="actual" stroke="#82ca9d" name="Actual" />
                  <Line type="monotone" dataKey="forecast" stroke="#ffc658" name="Forecast" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BudgetReports;
