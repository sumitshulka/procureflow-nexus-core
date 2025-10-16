import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth } from "date-fns";

interface RiskMetric {
  id: string;
  risk_id: string;
  risk_title: string;
  metric_date: string;
  probability: number;
  impact: number;
  risk_score: number;
  status: string;
  mitigation_progress: number;
}

interface RiskAlert {
  id: string;
  type: "high_risk" | "overdue" | "progress";
  title: string;
  message: string;
  created_at: string;
  badge_text: string;
  badge_variant: "destructive" | "secondary" | "outline";
}

const RiskMonitoring = () => {
  const [risks, setRisks] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<RiskMetric[]>([]);
  const [mitigationActions, setMitigationActions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch risk assessments
      const { data: risksData, error: risksError } = await supabase
        .from("risk_assessments")
        .select(`
          *,
          category:risk_categories(id, name, color)
        `)
        .order("risk_score", { ascending: false });

      if (risksError) throw risksError;
      setRisks(risksData || []);

      // Fetch risk metrics (last 6 months)
      const sixMonthsAgo = subMonths(new Date(), 6);
      const { data: metricsData, error: metricsError } = await supabase
        .from("risk_metrics")
        .select(`
          *,
          risk:risk_assessments(title, status)
        `)
        .gte("metric_date", sixMonthsAgo.toISOString())
        .order("metric_date", { ascending: true });

      if (metricsError) throw metricsError;
      
      const transformedMetrics = (metricsData || []).map(m => ({
        id: m.id,
        risk_id: m.risk_id,
        risk_title: m.risk?.title || "Unknown",
        metric_date: m.metric_date,
        probability: m.probability,
        impact: m.impact,
        risk_score: m.risk_score,
        status: m.risk?.status || "Unknown",
        mitigation_progress: m.mitigation_progress || 0
      }));
      
      setMetrics(transformedMetrics);

      // Fetch mitigation actions
      const { data: actionsData, error: actionsError } = await supabase
        .from("risk_mitigation_actions")
        .select("*")
        .order("due_date", { ascending: true });

      if (actionsError) throw actionsError;
      setMitigationActions(actionsData || []);

      // Fetch categories for pie chart
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("risk_categories")
        .select("*");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

    } catch (error: any) {
      console.error("Error fetching risk data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate trend data
  const getRiskTrendData = () => {
    const monthlyData: any = {};
    
    metrics.forEach(metric => {
      const monthKey = format(new Date(metric.metric_date), "MMM");
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, high: 0, medium: 0, low: 0 };
      }
      
      if (metric.risk_score >= 10) {
        monthlyData[monthKey].high++;
      } else if (metric.risk_score >= 5) {
        monthlyData[monthKey].medium++;
      } else {
        monthlyData[monthKey].low++;
      }
    });

    return Object.values(monthlyData);
  };

  // Calculate category distribution
  const getCategoryData = () => {
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

  // Calculate mitigation progress
  const getMitigationProgressData = () => {
    // Get latest metric for each risk
    const latestMetrics = new Map();
    
    metrics.forEach(metric => {
      if (!latestMetrics.has(metric.risk_id) || 
          new Date(metric.metric_date) > new Date(latestMetrics.get(metric.risk_id).metric_date)) {
        latestMetrics.set(metric.risk_id, metric);
      }
    });

    return Array.from(latestMetrics.values()).map(metric => ({
      name: metric.risk_title,
      progress: metric.mitigation_progress,
      score: metric.risk_score
    }));
  };

  // Generate alerts
  const getAlerts = (): RiskAlert[] => {
    const alerts: RiskAlert[] = [];
    const now = new Date();

    // High/Critical risk alerts
    const highRisks = risks.filter(r => r.risk_level === "High" || r.risk_level === "Critical");
    if (highRisks.length > 0) {
      alerts.push({
        id: "high-risks",
        type: "high_risk",
        title: "High Risk Alert",
        message: `${highRisks.length} high or critical risk(s) require immediate attention.`,
        created_at: now.toISOString(),
        badge_text: "Critical",
        badge_variant: "destructive"
      });
    }

    // Overdue mitigation actions
    const overdueActions = mitigationActions.filter(
      action => action.due_date && new Date(action.due_date) < now && action.status !== "Completed"
    );
    if (overdueActions.length > 0) {
      alerts.push({
        id: "overdue-actions",
        type: "overdue",
        title: "Mitigation Overdue",
        message: `${overdueActions.length} mitigation action(s) are overdue. Please update status.`,
        created_at: now.toISOString(),
        badge_text: "Overdue",
        badge_variant: "secondary"
      });
    }

    // Progress updates
    const progressData = getMitigationProgressData();
    const highProgressItems = progressData.filter(p => p.progress >= 80);
    if (highProgressItems.length > 0) {
      alerts.push({
        id: "progress-update",
        type: "progress",
        title: "Progress Update",
        message: `${highProgressItems.length} risk mitigation(s) are nearing completion (>80% progress).`,
        created_at: now.toISOString(),
        badge_text: "In Progress",
        badge_variant: "outline"
      });
    }

    return alerts;
  };

  const activeRisks = risks.filter(r => r.status === "Active").length;
  const highRiskItems = risks.filter(r => r.risk_level === "High" || r.risk_level === "Critical").length;
  const avgMitigationProgress = risks.length > 0 
    ? Math.round(getMitigationProgressData().reduce((sum, item) => sum + item.progress, 0) / risks.length) 
    : 0;
  const overdueActions = mitigationActions.filter(
    action => action.due_date && new Date(action.due_date) < new Date() && action.status !== "Completed"
  ).length;

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Risk Monitoring Dashboard</h1>
        <Button variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Risks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRisks}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {risks.length > 0 && `${risks.length} total risks`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{highRiskItems}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              Requires attention
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mitigation Progress</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMitigationProgress}%</div>
            <Progress value={avgMitigationProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Actions</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{overdueActions}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {overdueActions > 0 ? "Requires attention" : "All on track"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Risk Trends</TabsTrigger>
          <TabsTrigger value="mitigation">Mitigation Progress</TabsTrigger>
          <TabsTrigger value="alerts">Risk Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {getCategoryData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getCategoryData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {getCategoryData().map((entry: any, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Risk Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {risks.slice(0, 5).map((risk) => (
                    <div key={risk.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{risk.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={risk.risk_score >= 15 ? "destructive" : risk.risk_score >= 10 ? "secondary" : "outline"}>
                            Score: {risk.risk_score}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{risk.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {risks.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No risks to display. Create risk assessments to start monitoring.
                    </p>
                  )}
                </div>
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
                    <Bar dataKey="high" stackId="a" fill="#ef4444" name="High Risk" />
                    <Bar dataKey="medium" stackId="a" fill="#f59e0b" name="Medium Risk" />
                    <Bar dataKey="low" stackId="a" fill="#10b981" name="Low Risk" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No trend data available. Risk metrics will appear here over time.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mitigation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mitigation Progress by Risk</CardTitle>
            </CardHeader>
            <CardContent>
              {getMitigationProgressData().length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getMitigationProgressData()} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={200} />
                    <Tooltip formatter={(value) => [`${value}%`, "Progress"]} />
                    <Bar dataKey="progress" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No mitigation data available. Track progress through risk metrics.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <div className="grid gap-4">
            {getAlerts().length > 0 ? (
              getAlerts().map(alert => (
                <Card key={alert.id} className={
                  alert.type === "high_risk" ? "border-red-200" :
                  alert.type === "overdue" ? "border-orange-200" :
                  "border-blue-200"
                }>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {alert.type === "high_risk" && <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />}
                      {alert.type === "overdue" && <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />}
                      {alert.type === "progress" && <Activity className="h-5 w-5 text-blue-500 mt-0.5" />}
                      <div className="flex-1">
                        <h4 className={`font-medium ${
                          alert.type === "high_risk" ? "text-red-900" :
                          alert.type === "overdue" ? "text-orange-900" :
                          "text-blue-900"
                        }`}>{alert.title}</h4>
                        <p className={`text-sm mt-1 ${
                          alert.type === "high_risk" ? "text-red-700" :
                          alert.type === "overdue" ? "text-orange-700" :
                          "text-blue-700"
                        }`}>
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={alert.badge_variant}>{alert.badge_text}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active alerts.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    All risks are being managed within acceptable parameters.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskMonitoring;
