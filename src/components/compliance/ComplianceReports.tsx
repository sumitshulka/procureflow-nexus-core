import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Download, AlertTriangle, CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const ComplianceReports = () => {
  const [reportPeriod, setReportPeriod] = useState("current-year");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const dateRange = useMemo(() => {
    const now = new Date();
    let start = new Date(now.getFullYear(), 0, 1);
    const end = new Date();
    if (reportPeriod === "previous-year") {
      start = new Date(now.getFullYear() - 1, 0, 1);
      end.setFullYear(now.getFullYear() - 1, 11, 31);
    } else if (reportPeriod === "quarter") {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
    } else if (reportPeriod === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return { start: start.toISOString(), end: end.toISOString() };
  }, [reportPeriod]);

  const { data, isLoading } = useQuery({
    queryKey: ["compliance-reports", reportPeriod, categoryFilter],
    staleTime: 60_000,
    queryFn: async () => {
      const [policiesRes, submissionsRes, vendorsRes] = await Promise.all([
        supabase
          .from("compliance_policies")
          .select("id, title, category, status, compliance_rate, vendor_requirement_type, vendor_requirement_mandatory, review_date"),
        supabase
          .from("vendor_policy_submissions")
          .select("id, vendor_id, policy_id, status, submitted_at, reviewed_at, expires_at, created_at")
          .gte("created_at", dateRange.start)
          .lte("created_at", dateRange.end),
        supabase
          .from("vendor_registrations")
          .select("id, status")
          .eq("status", "approved"),
      ]);

      if (policiesRes.error) throw policiesRes.error;
      if (submissionsRes.error) throw submissionsRes.error;
      if (vendorsRes.error) throw vendorsRes.error;

      return {
        policies: policiesRes.data || [],
        submissions: submissionsRes.data || [],
        approvedVendors: vendorsRes.data || [],
      };
    },
  });

  const policies = data?.policies || [];
  const submissions = data?.submissions || [];
  const approvedVendorCount = data?.approvedVendors.length || 0;

  const categories = useMemo(
    () => Array.from(new Set(policies.map((p: any) => p.category))).sort(),
    [policies]
  );

  const filteredPolicies = useMemo(
    () => (categoryFilter === "all" ? policies : policies.filter((p: any) => p.category === categoryFilter)),
    [policies, categoryFilter]
  );

  const filteredPolicyIds = useMemo(() => new Set(filteredPolicies.map((p: any) => p.id)), [filteredPolicies]);
  const filteredSubmissions = useMemo(
    () => submissions.filter((s: any) => filteredPolicyIds.has(s.policy_id)),
    [submissions, filteredPolicyIds]
  );

  // Overview
  const overview = useMemo(() => {
    const total = filteredSubmissions.length;
    const approved = filteredSubmissions.filter((s: any) => s.status === "approved").length;
    const submitted = filteredSubmissions.filter((s: any) => s.status === "submitted").length;
    const rejected = filteredSubmissions.filter((s: any) => s.status === "rejected").length;
    const expired = filteredSubmissions.filter(
      (s: any) => s.expires_at && new Date(s.expires_at) < new Date()
    ).length;

    // Compliance rate = average of policy.compliance_rate across mandatory policies
    const mandatory = filteredPolicies.filter((p: any) => p.vendor_requirement_mandatory);
    const avgRate = mandatory.length
      ? Math.round(
          mandatory.reduce((sum: number, p: any) => sum + (Number(p.compliance_rate) || 0), 0) / mandatory.length
        )
      : 0;

    return { total, approved, submitted, rejected, expired, avgRate };
  }, [filteredSubmissions, filteredPolicies]);

  // Compliance by Category (group policies by category)
  const complianceByCategory = useMemo(() => {
    const map = new Map<string, { total: number; sum: number; mandatoryCount: number }>();
    filteredPolicies.forEach((p: any) => {
      const cur = map.get(p.category) || { total: 0, sum: 0, mandatoryCount: 0 };
      cur.total += 1;
      cur.sum += Number(p.compliance_rate) || 0;
      if (p.vendor_requirement_mandatory) cur.mandatoryCount += 1;
      map.set(p.category, cur);
    });
    return Array.from(map.entries()).map(([category, v]) => {
      const rate = v.total ? Math.round(v.sum / v.total) : 0;
      let status: "excellent" | "good" | "warning" | "critical" = "warning";
      if (rate >= 95) status = "excellent";
      else if (rate >= 85) status = "good";
      else if (rate < 70) status = "critical";
      return { category, total: v.total, mandatory: v.mandatoryCount, rate, status };
    });
  }, [filteredPolicies]);

  // Submission trends by month (last 6 months in range)
  const submissionTrends = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const buckets: any[] = [];
    for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d.setMonth(d.getMonth() + 1)) {
      const month = d.getMonth();
      const year = d.getFullYear();
      const subs = filteredSubmissions.filter((s: any) => {
        const sd = new Date(s.submitted_at || s.created_at);
        return sd.getMonth() === month && sd.getFullYear() === year;
      });
      buckets.push({
        month: `${months[month]} ${String(year).slice(2)}`,
        submitted: subs.length,
        approved: subs.filter((s: any) => s.status === "approved").length,
        rejected: subs.filter((s: any) => s.status === "rejected").length,
      });
    }
    return buckets.slice(-6);
  }, [filteredSubmissions, dateRange]);

  // Status distribution pie
  const statusDistribution = useMemo(
    () => [
      { name: "Approved", value: overview.approved, color: "hsl(142 76% 36%)" },
      { name: "Pending Review", value: overview.submitted, color: "hsl(38 92% 50%)" },
      { name: "Rejected", value: overview.rejected, color: "hsl(0 84% 60%)" },
      { name: "Expired", value: overview.expired, color: "hsl(220 9% 46%)" },
    ].filter((e) => e.value > 0),
    [overview]
  );

  // Policies needing attention
  const attention = useMemo(
    () =>
      filteredPolicies
        .filter((p: any) => p.vendor_requirement_mandatory && (Number(p.compliance_rate) || 0) < 85)
        .sort((a: any, b: any) => (Number(a.compliance_rate) || 0) - (Number(b.compliance_rate) || 0))
        .slice(0, 10),
    [filteredPolicies]
  );

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      excellent: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      good: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      warning: { variant: "outline", icon: <AlertTriangle className="h-3 w-3" /> },
      critical: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
    };
    const c = config[status] || config.warning;
    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        {c.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={reportPeriod} onValueChange={setReportPeriod}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="current-year">Current Year</SelectItem>
              <SelectItem value="previous-year">Previous Year</SelectItem>
              <SelectItem value="quarter">Current Quarter</SelectItem>
              <SelectItem value="month">Current Month</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />Export Report
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.total}</div>
            <p className="text-xs text-muted-foreground">{approvedVendorCount} approved vendors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overview.approved}</div>
            <p className="text-xs text-muted-foreground">Compliant submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{overview.submitted}</div>
            <p className="text-xs text-muted-foreground">{overview.rejected} rejected, {overview.expired} expired</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Compliance Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.avgRate}%</div>
            <Progress value={overview.avgRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">By Category</TabsTrigger>
          <TabsTrigger value="trends">Submission Trends</TabsTrigger>
          <TabsTrigger value="status">Status Distribution</TabsTrigger>
          <TabsTrigger value="attention">Needs Attention</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Compliance by Policy Category</CardTitle></CardHeader>
            <CardContent>
              {complianceByCategory.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No policies found</p>
              ) : (
                <div className="space-y-4">
                  {complianceByCategory.map((c) => (
                    <div key={c.category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{c.category}</span>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(c.status)}
                          <span className="text-sm text-muted-foreground">
                            {c.mandatory}/{c.total} mandatory · {c.rate}%
                          </span>
                        </div>
                      </div>
                      <Progress value={c.rate} className="w-full" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {complianceByCategory.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Compliance Rate by Category</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={complianceByCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="rate" fill="hsl(var(--primary))" name="Compliance %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Submission Trends (Last 6 Months)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={submissionTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="submitted" fill="hsl(38 92% 50%)" name="Submitted" />
                  <Bar dataKey="approved" fill="hsl(142 76% 36%)" name="Approved" />
                  <Bar dataKey="rejected" fill="hsl(0 84% 60%)" name="Rejected" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Submission Status Distribution</CardTitle></CardHeader>
            <CardContent>
              {statusDistribution.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No submissions in this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attention" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Mandatory Policies Below 85%</CardTitle></CardHeader>
            <CardContent>
              {attention.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">All mandatory policies are in good shape 🎉</p>
              ) : (
                <div className="space-y-3">
                  {attention.map((p: any) => (
                    <div key={p.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{p.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {p.category} · Review: {format(new Date(p.review_date), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <Badge variant={Number(p.compliance_rate) < 70 ? "destructive" : "outline"}>
                          {Number(p.compliance_rate) || 0}%
                        </Badge>
                      </div>
                      <Progress value={Number(p.compliance_rate) || 0} />
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
