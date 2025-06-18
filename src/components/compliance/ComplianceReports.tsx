
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

const ComplianceReports = () => {
  const [reportPeriod, setReportPeriod] = useState("current-year");
  const [complianceArea, setComplianceArea] = useState("all");

  // Mock compliance data
  const complianceOverview = {
    totalChecks: 150,
    compliant: 135,
    nonCompliant: 12,
    pending: 3,
    complianceRate: 90,
  };

  const complianceByArea = [
    { area: "Procurement", total: 45, compliant: 42, rate: 93.3, status: "good" },
    { area: "Financial", total: 30, compliant: 28, rate: 93.3, status: "good" },
    { area: "Vendor Management", total: 25, compliant: 22, rate: 88, status: "warning" },
    { area: "Data Privacy", total: 20, compliant: 19, rate: 95, status: "excellent" },
    { area: "Security", total: 30, compliant: 24, rate: 80, status: "critical" },
  ];

  const violationTrends = [
    { month: "Jan", violations: 5, resolved: 4 },
    { month: "Feb", violations: 3, resolved: 3 },
    { month: "Mar", violations: 7, resolved: 6 },
    { month: "Apr", violations: 4, resolved: 4 },
    { month: "May", violations: 6, resolved: 5 },
    { month: "Jun", violations: 2, resolved: 2 },
  ];

  const riskDistribution = [
    { name: "Low Risk", value: 60, color: "#00C49F" },
    { name: "Medium Risk", value: 25, color: "#FFBB28" },
    { name: "High Risk", value: 12, color: "#FF8042" },
    { name: "Critical Risk", value: 3, color: "#FF0000" },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: React.ReactNode }> = {
      excellent: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      good: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      warning: { variant: "outline", icon: <AlertTriangle className="h-3 w-3" /> },
      critical: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
    };
    
    const config = variants[status] || variants.warning;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Select value={reportPeriod} onValueChange={setReportPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-year">Current Year</SelectItem>
              <SelectItem value="previous-year">Previous Year</SelectItem>
              <SelectItem value="quarter">Current Quarter</SelectItem>
              <SelectItem value="month">Current Month</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={complianceArea} onValueChange={setComplianceArea}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Areas</SelectItem>
              <SelectItem value="procurement">Procurement</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
              <SelectItem value="vendor">Vendor Management</SelectItem>
              <SelectItem value="security">Security</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Compliance Checks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceOverview.totalChecks}</div>
            <p className="text-xs text-muted-foreground">Across all areas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliant</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{complianceOverview.compliant}</div>
            <p className="text-xs text-muted-foreground">Meeting requirements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non-Compliant</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{complianceOverview.nonCompliant}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceOverview.complianceRate}%</div>
            <Progress value={complianceOverview.complianceRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Compliance Overview</TabsTrigger>
          <TabsTrigger value="violations">Violation Trends</TabsTrigger>
          <TabsTrigger value="risks">Risk Assessment</TabsTrigger>
          <TabsTrigger value="audits">Audit Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance by Area</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceByArea.map((area) => (
                  <div key={area.area} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{area.area}</span>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(area.status)}
                        <span className="text-sm text-muted-foreground">
                          {area.compliant}/{area.total} ({area.rate}%)
                        </span>
                      </div>
                    </div>
                    <Progress value={area.rate} className="w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Rate by Area</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={complianceByArea}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="area" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="rate" fill="#8884d8" name="Compliance Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Violation Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={violationTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="violations" fill="#ff7c7c" name="Violations" />
                  <Bar dataKey="resolved" fill="#82ca9d" name="Resolved" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Audit Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">Procurement Process Audit</h4>
                    <Badge variant="default">Passed</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Comprehensive review of procurement processes and vendor management
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Completed: June 15, 2024 | Auditor: External Audit Firm
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">Data Security Compliance</h4>
                    <Badge variant="outline">Minor Issues</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Security protocols and data handling procedures review
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Completed: June 10, 2024 | Auditor: Internal Security Team
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComplianceReports;
