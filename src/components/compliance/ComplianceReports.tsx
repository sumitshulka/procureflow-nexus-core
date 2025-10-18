import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ComplianceReports = () => {
  const [reportPeriod, setReportPeriod] = useState("current-year");
  const [complianceArea, setComplianceArea] = useState("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // State for database-driven data
  const [complianceOverview, setComplianceOverview] = useState({
    totalChecks: 0,
    compliant: 0,
    nonCompliant: 0,
    pending: 0,
    complianceRate: 0,
  });
  const [complianceByArea, setComplianceByArea] = useState<any[]>([]);
  const [violationTrends, setViolationTrends] = useState<any[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);

  useEffect(() => {
    fetchAreas();
  }, []);

  useEffect(() => {
    fetchComplianceData();
  }, [reportPeriod, complianceArea]);

  const fetchAreas = async () => {
    const { data, error } = await supabase
      .from('compliance_areas')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setAreas(data);
    }
  };

  const fetchComplianceData = async () => {
    try {
      setLoading(true);

      // Calculate date range based on period
      const dateRange = getDateRange(reportPeriod);

      // Fetch compliance checks
      let checksQuery = supabase
        .from('compliance_checks')
        .select(`
          *,
          compliance_rules!inner(
            *,
            compliance_areas(*)
          )
        `)
        .gte('check_date', dateRange.start)
        .lte('check_date', dateRange.end);

      if (complianceArea !== 'all') {
        checksQuery = checksQuery.eq('compliance_rules.area_id', complianceArea);
      }

      const { data: checks, error: checksError } = await checksQuery;
      
      if (checksError) throw checksError;

      // Calculate overview stats
      const totalChecks = checks?.length || 0;
      const compliant = checks?.filter(c => c.status === 'compliant').length || 0;
      const nonCompliant = checks?.filter(c => c.status === 'non_compliant').length || 0;
      const pending = checks?.filter(c => c.status === 'pending').length || 0;
      const complianceRate = totalChecks > 0 ? Math.round((compliant / totalChecks) * 100) : 0;

      setComplianceOverview({
        totalChecks,
        compliant,
        nonCompliant,
        pending,
        complianceRate,
      });

      // Fetch areas and calculate stats
      const { data: areas, error: areasError } = await supabase
        .from('compliance_areas')
        .select('*')
        .eq('is_active', true);

      if (areasError) throw areasError;

      const areaStats = areas?.map(area => {
        const areaChecks = checks?.filter(c => c.compliance_rules?.area_id === area.id) || [];
        const total = areaChecks.length;
        const compliantCount = areaChecks.filter(c => c.status === 'compliant').length;
        const rate = total > 0 ? Math.round((compliantCount / total) * 100) : 0;
        
        let status = 'good';
        if (rate < 70) status = 'critical';
        else if (rate < 85) status = 'warning';
        else if (rate >= 95) status = 'excellent';

        return {
          area: area.name,
          total,
          compliant: compliantCount,
          rate,
          status,
        };
      }) || [];

      setComplianceByArea(areaStats);

      // Fetch violations for trends
      const { data: violations, error: violationsError } = await supabase
        .from('compliance_violations')
        .select('*')
        .gte('identified_date', dateRange.start)
        .lte('identified_date', dateRange.end);

      if (violationsError) throw violationsError;

      // Group violations by month
      const monthlyViolations = groupByMonth(violations || [], dateRange);
      setViolationTrends(monthlyViolations);

      // Calculate risk distribution by severity
      const severityCounts = {
        low: violations?.filter(v => v.severity === 'low' && v.status !== 'resolved').length || 0,
        medium: violations?.filter(v => v.severity === 'medium' && v.status !== 'resolved').length || 0,
        high: violations?.filter(v => v.severity === 'high' && v.status !== 'resolved').length || 0,
        critical: violations?.filter(v => v.severity === 'critical' && v.status !== 'resolved').length || 0,
      };

      setRiskDistribution([
        { name: "Low Risk", value: severityCounts.low, color: "#00C49F" },
        { name: "Medium Risk", value: severityCounts.medium, color: "#FFBB28" },
        { name: "High Risk", value: severityCounts.high, color: "#FF8042" },
        { name: "Critical Risk", value: severityCounts.critical, color: "#FF0000" },
      ]);

      // Fetch audits
      const { data: auditsData, error: auditsError } = await supabase
        .from('compliance_audits')
        .select('*')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at', { ascending: false })
        .limit(5);

      if (auditsError) throw auditsError;
      setAudits(auditsData || []);

    } catch (error: any) {
      console.error('Error fetching compliance data:', error);
      toast({
        title: "Error",
        description: "Failed to load compliance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (period: string) => {
    const now = new Date();
    let start = new Date();

    switch (period) {
      case 'current-year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'previous-year':
        start = new Date(now.getFullYear() - 1, 0, 1);
        now.setFullYear(now.getFullYear() - 1, 11, 31);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return {
      start: start.toISOString(),
      end: now.toISOString(),
    };
  };

  const groupByMonth = (violations: any[], dateRange: any) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      const monthViolations = violations.filter(v => {
        const vDate = new Date(v.identified_date);
        return vDate.getMonth() === d.getMonth() && vDate.getFullYear() === d.getFullYear();
      });
      
      result.push({
        month: months[d.getMonth()],
        violations: monthViolations.length,
        resolved: monthViolations.filter(v => v.status === 'resolved').length,
      });
    }
    
    return result.slice(-6); // Last 6 months
  };
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
              {areas.map(area => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
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
              {audits.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No audits found for this period</p>
              ) : (
                <div className="space-y-4">
                  {audits.map((audit) => (
                    <div key={audit.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{audit.title}</h4>
                        <Badge variant={
                          audit.overall_result === 'passed' ? 'default' :
                          audit.overall_result === 'passed_with_issues' ? 'outline' :
                          'destructive'
                        }>
                          {audit.overall_result === 'passed' ? 'Passed' :
                           audit.overall_result === 'passed_with_issues' ? 'Passed with Issues' :
                           'Failed'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {audit.description || 'No description provided'}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        Completed: {audit.end_date ? new Date(audit.end_date).toLocaleDateString() : 'In Progress'} | 
                        Auditor: {audit.auditor_name || 'N/A'} | 
                        Type: {audit.audit_type}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComplianceReports;
