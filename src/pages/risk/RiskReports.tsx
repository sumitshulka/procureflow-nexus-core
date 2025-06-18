
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Download, FileText, TrendingUp, AlertTriangle, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RiskReports = () => {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("last-3-months");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Mock data for reports
  const riskTrendData = [
    { month: "Oct", critical: 1, high: 3, medium: 5, low: 2 },
    { month: "Nov", critical: 2, high: 4, medium: 6, low: 3 },
    { month: "Dec", critical: 1, high: 2, medium: 7, low: 4 },
    { month: "Jan", critical: 0, high: 3, medium: 5, low: 5 },
  ];

  const riskCategoryData = [
    { name: "Vendor", value: 35, color: "#0088FE" },
    { name: "Financial", value: 25, color: "#00C49F" },
    { name: "Operational", value: 20, color: "#FFBB28" },
    { name: "Compliance", value: 12, color: "#FF8042" },
    { name: "Technology", value: 8, color: "#8884D8" },
  ];

  const mitigationEffectivenessData = [
    { category: "Vendor", planned: 10, completed: 8, effectiveness: 80 },
    { category: "Financial", planned: 8, completed: 6, effectiveness: 75 },
    { category: "Operational", planned: 12, completed: 10, effectiveness: 83 },
    { category: "Compliance", planned: 6, completed: 5, effectiveness: 83 },
    { category: "Technology", planned: 4, completed: 3, effectiveness: 75 },
  ];

  const handleExportReport = (reportType: string) => {
    toast({
      title: "Report Export",
      description: `${reportType} report will be downloaded shortly`,
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Risk Reports</h1>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="last-3-months">Last 3 Months</SelectItem>
              <SelectItem value="last-6-months">Last 6 Months</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleExportReport("Executive Summary")}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Risks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <div className="text-xs text-muted-foreground">+3 from last period</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High/Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">5</div>
            <div className="text-xs text-muted-foreground">-2 from last period</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mitigation Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">78%</div>
            <div className="text-xs text-muted-foreground">+5% from last period</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Resolution Time</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18 days</div>
            <div className="text-xs text-muted-foreground">-3 days from last period</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Risk Trends</TabsTrigger>
          <TabsTrigger value="mitigation">Mitigation Effectiveness</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={riskCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {riskCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Severity Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={riskTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="critical" stroke="#dc2626" name="Critical" />
                    <Line type="monotone" dataKey="high" stroke="#ea580c" name="High" />
                    <Line type="monotone" dataKey="medium" stroke="#ca8a04" name="Medium" />
                    <Line type="monotone" dataKey="low" stroke="#16a34a" name="Low" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={riskTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="critical" stackId="a" fill="#dc2626" name="Critical" />
                  <Bar dataKey="high" stackId="a" fill="#ea580c" name="High" />
                  <Bar dataKey="medium" stackId="a" fill="#ca8a04" name="Medium" />
                  <Bar dataKey="low" stackId="a" fill="#16a34a" name="Low" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mitigation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mitigation Effectiveness by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={mitigationEffectivenessData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="planned" fill="#94a3b8" name="Planned" />
                  <Bar dataKey="completed" fill="#3b82f6" name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <FileText className="h-8 w-8 text-blue-500 mb-3" />
                <h3 className="font-semibold mb-2">Executive Summary</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  High-level overview of risk landscape and key metrics
                </p>
                <Button size="sm" onClick={() => handleExportReport("Executive Summary")}>
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <FileText className="h-8 w-8 text-green-500 mb-3" />
                <h3 className="font-semibold mb-2">Risk Register</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Detailed listing of all identified risks and their status
                </p>
                <Button size="sm" onClick={() => handleExportReport("Risk Register")}>
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <FileText className="h-8 w-8 text-orange-500 mb-3" />
                <h3 className="font-semibold mb-2">Mitigation Status</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Progress report on risk mitigation activities
                </p>
                <Button size="sm" onClick={() => handleExportReport("Mitigation Status")}>
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <FileText className="h-8 w-8 text-purple-500 mb-3" />
                <h3 className="font-semibold mb-2">Trend Analysis</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Historical analysis of risk patterns and trends
                </p>
                <Button size="sm" onClick={() => handleExportReport("Trend Analysis")}>
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <FileText className="h-8 w-8 text-red-500 mb-3" />
                <h3 className="font-semibold mb-2">Critical Risks</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Focus report on high and critical risk items
                </p>
                <Button size="sm" onClick={() => handleExportReport("Critical Risks")}>
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <FileText className="h-8 w-8 text-teal-500 mb-3" />
                <h3 className="font-semibold mb-2">Compliance Report</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Risk management compliance and audit report
                </p>
                <Button size="sm" onClick={() => handleExportReport("Compliance Report")}>
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskReports;
