
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Calendar } from "lucide-react";

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

const RiskMonitoring = () => {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRiskMetrics();
  }, []);

  const fetchRiskMetrics = async () => {
    // Mock data - replace with actual database queries
    const mockMetrics: RiskMetric[] = [
      {
        id: "1",
        risk_id: "risk-1",
        risk_title: "Vendor Dependency Risk",
        metric_date: "2024-01-15",
        probability: 3,
        impact: 4,
        risk_score: 12,
        status: "Active",
        mitigation_progress: 65
      },
      {
        id: "2",
        risk_id: "risk-2",
        risk_title: "Price Volatility Risk",
        metric_date: "2024-01-15",
        probability: 4,
        impact: 3,
        risk_score: 12,
        status: "Under Review",
        mitigation_progress: 40
      },
      {
        id: "3",
        risk_id: "risk-3",
        risk_title: "Supply Chain Disruption",
        metric_date: "2024-01-15",
        probability: 2,
        impact: 5,
        risk_score: 10,
        status: "Mitigated",
        mitigation_progress: 85
      }
    ];

    setRiskMetrics(mockMetrics);
    setIsLoading(false);
  };

  const riskTrendData = [
    { month: "Jul", high: 3, medium: 5, low: 2 },
    { month: "Aug", high: 4, medium: 4, low: 3 },
    { month: "Sep", high: 2, medium: 6, low: 3 },
    { month: "Oct", high: 3, medium: 5, low: 4 },
    { month: "Nov", high: 2, medium: 7, low: 3 },
    { month: "Dec", high: 1, medium: 6, low: 5 },
  ];

  const riskCategoryData = [
    { name: "Vendor", value: 35, color: "#0088FE" },
    { name: "Financial", value: 25, color: "#00C49F" },
    { name: "Operational", value: 20, color: "#FFBB28" },
    { name: "Compliance", value: 12, color: "#FF8042" },
    { name: "Technology", value: 8, color: "#8884D8" },
  ];

  const mitigationProgressData = riskMetrics.map(metric => ({
    name: metric.risk_title,
    progress: metric.mitigation_progress,
    score: metric.risk_score
  }));

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
            <div className="text-2xl font-bold">12</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
              -2 from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">3</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-red-500" />
              +1 from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mitigation Progress</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68%</div>
            <Progress value={68} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Actions</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">5</div>
            <div className="flex items-center text-xs text-muted-foreground">
              Requires attention
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
                <CardTitle>Current Risk Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {riskMetrics.map((metric) => (
                    <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{metric.risk_title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={metric.risk_score >= 15 ? "destructive" : metric.risk_score >= 10 ? "secondary" : "outline"}>
                            Score: {metric.risk_score}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{metric.status}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{metric.mitigation_progress}%</div>
                        <Progress value={metric.mitigation_progress} className="w-20 mt-1" />
                      </div>
                    </div>
                  ))}
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
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={riskTrendData}>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mitigation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mitigation Progress by Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={mitigationProgressData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={200} />
                  <Tooltip formatter={(value) => [`${value}%`, "Progress"]} />
                  <Bar dataKey="progress" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <div className="grid gap-4">
            <Card className="border-red-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900">High Risk Alert</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Vendor Dependency Risk has increased from medium to high level. Immediate action required.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="destructive">Critical</Badge>
                      <span className="text-xs text-red-600">2 hours ago</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-orange-900">Mitigation Overdue</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      Price Volatility Risk mitigation action is 5 days overdue. Please update status.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">Overdue</Badge>
                      <span className="text-xs text-orange-600">5 days ago</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">Progress Update</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Supply Chain Disruption risk mitigation is 85% complete. Expected completion next week.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">In Progress</Badge>
                      <span className="text-xs text-blue-600">1 day ago</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskMonitoring;
