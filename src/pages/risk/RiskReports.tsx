import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Download, FileText, TrendingUp, AlertTriangle, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, subYears, format } from "date-fns";

const RiskReports = () => {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("last-3-months");
  const [risks, setRisks] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [mitigationActions, setMitigationActions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const getDateRangeForPeriod = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case "last-month":
        return subMonths(now, 1);
      case "last-3-months":
        return subMonths(now, 3);
      case "last-6-months":
        return subMonths(now, 6);
      case "last-year":
        return subYears(now, 1);
      default:
        return subMonths(now, 3);
    }
  };

  const fetchData = async () => {
    try {
      const startDate = getDateRangeForPeriod();

      // Fetch risk assessments
      const { data: risksData, error: risksError } = await supabase
        .from("risk_assessments")
        .select(`
          *,
          category:risk_categories(id, name, color)
        `)
        .gte("created_at", startDate.toISOString())
        .order("risk_score", { ascending: false });

      if (risksError) throw risksError;
      setRisks(risksData || []);

      // Fetch risk metrics for the period
      const { data: metricsData, error: metricsError } = await supabase
        .from("risk_metrics")
        .select(`
          *,
          risk:risk_assessments(title)
        `)
        .gte("metric_date", startDate.toISOString())
        .order("metric_date", { ascending: true });

      if (metricsError) throw metricsError;
      setMetrics(metricsData || []);

      // Fetch mitigation actions
      const { data: actionsData, error: actionsError } = await supabase
        .from("risk_mitigation_actions")
        .select("*")
        .gte("created_at", startDate.toISOString());

      if (actionsError) throw actionsError;
      setMitigationActions(actionsData || []);

    } catch (error: any) {
      console.error("Error fetching risk data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch risk report data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskTrendData = () => {
    const monthlyData: any = {};
    
    metrics.forEach(metric => {
      const monthKey = format(new Date(metric.metric_date), "MMM");
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, critical: 0, high: 0, medium: 0, low: 0 };
      }
      
      if (metric.risk_score >= 15) {
        monthlyData[monthKey].critical++;
      } else if (metric.risk_score >= 10) {
        monthlyData[monthKey].high++;
      } else if (metric.risk_score >= 5) {
        monthlyData[monthKey].medium++;
      } else {
        monthlyData[monthKey].low++;
      }
    });

    return Object.values(monthlyData);
  };

  const getRiskCategoryData = () => {
    const categoryCount: any = {};
    
    risks.forEach(risk => {
      const categoryName = risk.category?.name || "Uncategorized";
      const categoryColor = risk.category?.color || "#94a3b8";
      
      if (!categoryCount[categoryName]) {
        categoryCount[categoryName] = { name: categoryName, value: 0, color: categoryColor };
      }
      categoryCount[categoryName].value++;
    });

    return Object.values(categoryCount);
  };

  const getMitigationEffectivenessData = () => {
    const categoryData: any = {};
    
    mitigationActions.forEach(action => {
      const categoryName = action.category || "General";
      if (!categoryData[categoryName]) {
        categoryData[categoryName] = {
          category: categoryName,
          planned: 0,
          completed: 0,
          effectiveness: 0
        };
      }
      
      categoryData[categoryName].planned++;
      if (action.status === "Completed") {
        categoryData[categoryName].completed++;
      }
    });

    // Calculate effectiveness percentage
    Object.values(categoryData).forEach((data: any) => {
      data.effectiveness = data.planned > 0 
        ? Math.round((data.completed / data.planned) * 100) 
        : 0;
    });

    return Object.values(categoryData);
  };

  const handleExportReport = (reportType: string) => {
    toast({
      title: "Report Export",
      description: `${reportType} report will be downloaded shortly`,
    });
  };

  const totalRisks = risks.length;
  const highCriticalRisks = risks.filter(r => r.risk_level === "High" || r.risk_level === "Critical").length;
  const completedActions = mitigationActions.filter(a => a.status === "Completed").length;
  const totalActions = mitigationActions.length;
  const mitigationRate = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;
  
  // Calculate average resolution time
  const completedRisks = risks.filter(r => r.status === "Closed" || r.status === "Mitigated");
  const avgResolutionTime = completedRisks.length > 0 
    ? Math.round(completedRisks.reduce((sum, risk) => {
        const created = new Date(risk.created_at);
        const updated = new Date(risk.updated_at);
        return sum + Math.round((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / completedRisks.length)
    : 0;

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

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
            <div className="text-2xl font-bold">{totalRisks}</div>
            <div className="text-xs text-muted-foreground">In selected period</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High/Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{highCriticalRisks}</div>
            <div className="text-xs text-muted-foreground">Requires attention</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mitigation Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{mitigationRate}%</div>
            <div className="text-xs text-muted-foreground">{completedActions} of {totalActions} actions</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Resolution Time</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResolutionTime} days</div>
            <div className="text-xs text-muted-foreground">{completedRisks.length} risks resolved</div>
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
                {getRiskCategoryData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getRiskCategoryData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {getRiskCategoryData().map((entry: any, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data for selected period
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Severity Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {getRiskTrendData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={getRiskTrendData()}>
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
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No trend data for selected period
                  </div>
                )}
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
              {getRiskTrendData().length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getRiskTrendData()}>
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
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No data for selected period. Adjust the time range or create risk assessments.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mitigation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mitigation Effectiveness by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {getMitigationEffectivenessData().length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getMitigationEffectivenessData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="planned" fill="#94a3b8" name="Planned" />
                    <Bar dataKey="completed" fill="#3b82f6" name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No mitigation data for selected period
                </div>
              )}
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
