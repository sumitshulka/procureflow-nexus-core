
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Plus, Play, Save, Download, Edit, Trash2, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportConfig {
  id?: string;
  name: string;
  description: string;
  dataSource: string;
  fields: string[];
  filters: Record<string, any>;
  groupBy?: string;
  chartType: string;
  dateRange: {
    from: string;
    to: string;
  };
}

const CustomReports = () => {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null);
  const [reportResults, setReportResults] = useState<any[]>([]);
  
  // Form state for report configuration
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    name: "",
    description: "",
    dataSource: "procurement_requests",
    fields: [],
    filters: {},
    chartType: "bar",
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0]
    }
  });

  // Available data sources and their fields
  const dataSources = {
    procurement_requests: {
      name: "Procurement Requests",
      fields: ["id", "title", "status", "department", "estimated_value", "created_at", "date_needed", "priority"]
    },
    purchase_orders: {
      name: "Purchase Orders",
      fields: ["id", "po_number", "final_amount", "status", "po_date", "expected_delivery_date", "currency"]
    },
    inventory_transactions: {
      name: "Inventory Transactions",
      fields: ["id", "type", "quantity", "transaction_date", "approval_status", "delivery_status"]
    },
    vendor_registrations: {
      name: "Vendors",
      fields: ["id", "company_name", "status", "created_at", "primary_email", "annual_turnover"]
    }
  };

  // Execute custom report
  const executeReport = async (config: ReportConfig) => {
    try {
      let query = supabase.from(config.dataSource);
      
      // Select specified fields
      if (config.fields.length > 0) {
        query = query.select(config.fields.join(", "));
      } else {
        query = query.select("*");
      }

      // Apply date filters
      if (config.dateRange.from && config.dateRange.to) {
        const dateField = config.dataSource === "procurement_requests" ? "created_at" : 
                         config.dataSource === "purchase_orders" ? "po_date" :
                         config.dataSource === "inventory_transactions" ? "transaction_date" : "created_at";
        
        query = query
          .gte(dateField, config.dateRange.from)
          .lte(dateField, config.dateRange.to);
      }

      // Apply additional filters
      Object.entries(config.filters).forEach(([field, value]) => {
        if (value) {
          query = query.eq(field, value);
        }
      });

      const { data, error } = await query;
      if (error) throw error;

      // Process data for charts
      let processedData = data || [];
      
      if (config.groupBy) {
        const grouped = processedData.reduce((acc, item) => {
          const key = item[config.groupBy];
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {});

        processedData = Object.entries(grouped).map(([key, items]: [string, any[]]) => ({
          name: key,
          value: items.length,
          total: items.reduce((sum, item) => {
            const numericField = config.fields.find(f => 
              f.includes('amount') || f.includes('value') || f.includes('price')
            );
            return sum + (numericField ? (item[numericField] || 0) : 0);
          }, 0)
        }));
      }

      setReportResults(processedData);
      setSelectedReport(config);
      
      toast({
        title: "Report executed successfully",
        description: `Generated ${processedData.length} records`
      });

    } catch (error) {
      console.error("Error executing report:", error);
      toast({
        title: "Error executing report",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleFieldToggle = (field: string, checked: boolean) => {
    setReportConfig(prev => ({
      ...prev,
      fields: checked 
        ? [...prev.fields, field]
        : prev.fields.filter(f => f !== field)
    }));
  };

  const handleFilterChange = (field: string, value: string) => {
    setReportConfig(prev => ({
      ...prev,
      filters: { ...prev.filters, [field]: value }
    }));
  };

  const renderChart = () => {
    if (!reportResults.length) return null;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

    switch (selectedReport?.chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportResults}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportResults}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportResults}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {reportResults.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Custom Reports</h2>
          <p className="text-muted-foreground">Create and run dynamic reports with flexible configurations</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create Custom Report</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Basic Configuration */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Report Name</Label>
                  <Input
                    id="name"
                    value={reportConfig.name}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter report name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={reportConfig.description}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your report"
                  />
                </div>

                <div>
                  <Label>Data Source</Label>
                  <Select 
                    value={reportConfig.dataSource} 
                    onValueChange={(value) => setReportConfig(prev => ({ ...prev, dataSource: value, fields: [] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(dataSources).map(([key, source]) => (
                        <SelectItem key={key} value={key}>{source.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Chart Type</Label>
                  <Select 
                    value={reportConfig.chartType} 
                    onValueChange={(value) => setReportConfig(prev => ({ ...prev, chartType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="pie">Pie Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Field Selection */}
              <div className="space-y-4">
                <div>
                  <Label>Select Fields</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                    {dataSources[reportConfig.dataSource]?.fields.map(field => (
                      <div key={field} className="flex items-center space-x-2">
                        <Checkbox
                          id={field}
                          checked={reportConfig.fields.includes(field)}
                          onCheckedChange={(checked) => handleFieldToggle(field, checked)}
                        />
                        <Label htmlFor={field} className="text-sm">{field}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={reportConfig.dateRange.from}
                      onChange={(e) => setReportConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, from: e.target.value }
                      }))}
                    />
                    <Input
                      type="date"
                      value={reportConfig.dateRange.to}
                      onChange={(e) => setReportConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, to: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                {reportConfig.dataSource && (
                  <div>
                    <Label>Group By (for charts)</Label>
                    <Select 
                      value={reportConfig.groupBy || ""} 
                      onValueChange={(value) => setReportConfig(prev => ({ ...prev, groupBy: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field to group by" />
                      </SelectTrigger>
                      <SelectContent>
                        {dataSources[reportConfig.dataSource]?.fields.map(field => (
                          <SelectItem key={field} value={field}>{field}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => executeReport(reportConfig)}>
                <Play className="h-4 w-4 mr-2" />
                Run Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Report Results */}
      {selectedReport && reportResults.length > 0 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{selectedReport.name}</CardTitle>
                  <p className="text-muted-foreground">{selectedReport.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {/* Chart */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Visualization</h3>
                  {renderChart()}
                </div>

                {/* Data Table */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Raw Data ({reportResults.length} records)</h3>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(reportResults[0] || {}).map(key => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportResults.slice(0, 50).map((row, index) => (
                          <TableRow key={index}>
                            {Object.values(row).map((value, cellIndex) => (
                              <TableCell key={cellIndex}>
                                {typeof value === 'number' ? value.toLocaleString() : String(value)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {reportResults.length > 50 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Showing first 50 records. Export to see all data.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Reports</CardTitle>
          <p className="text-muted-foreground">Pre-configured reports for common use cases</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                name: "Monthly Procurement Trends",
                description: "Track procurement request volumes by month",
                config: {
                  name: "Monthly Procurement Trends",
                  description: "Procurement requests grouped by month",
                  dataSource: "procurement_requests",
                  fields: ["id", "created_at", "status"],
                  filters: {},
                  groupBy: "status",
                  chartType: "line",
                  dateRange: {
                    from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    to: new Date().toISOString().split('T')[0]
                  }
                }
              },
              {
                name: "Department Spending",
                description: "Analyze spending patterns by department",
                config: {
                  name: "Department Spending Analysis",
                  description: "Purchase orders grouped by department",
                  dataSource: "purchase_orders",
                  fields: ["id", "final_amount", "po_date"],
                  filters: {},
                  groupBy: "status",
                  chartType: "pie",
                  dateRange: {
                    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    to: new Date().toISOString().split('T')[0]
                  }
                }
              },
              {
                name: "Vendor Status Overview",
                description: "Current status of all registered vendors",
                config: {
                  name: "Vendor Status Report",
                  description: "Overview of vendor registration statuses",
                  dataSource: "vendor_registrations",
                  fields: ["id", "company_name", "status", "created_at"],
                  filters: {},
                  groupBy: "status",
                  chartType: "bar",
                  dateRange: {
                    from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    to: new Date().toISOString().split('T')[0]
                  }
                }
              }
            ].map((quickReport, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{quickReport.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {quickReport.description}
                      </p>
                    </div>
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => executeReport(quickReport.config)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run Report
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomReports;
