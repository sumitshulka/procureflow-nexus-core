import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, FileText, Users, TrendingUp, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/currencyUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

const RfpAnalysisReportPage = () => {
  const navigate = useNavigate();

  const { data: rfps = [], isLoading: rfpsLoading } = useQuery({
    queryKey: ["rfp-analysis-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfps")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: rfpResponses = [], isLoading: responsesLoading } = useQuery({
    queryKey: ["rfp-responses-for-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfp_responses")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Status breakdown
  const statusCounts = rfps.reduce((acc: any, rfp: any) => {
    acc[rfp.status] = (acc[rfp.status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "),
    value: value as number,
  }));

  // Response rates per RFP
  const rfpWithResponses = rfps.map((rfp: any) => {
    const responses = rfpResponses.filter((r: any) => r.rfp_id === rfp.id);
    return {
      ...rfp,
      responseCount: responses.length,
      submittedResponses: responses.filter((r: any) => r.status === "submitted").length,
    };
  });

  const avgResponseRate = rfps.length > 0
    ? rfpWithResponses.reduce((sum, rfp) => sum + rfp.responseCount, 0) / rfps.length
    : 0;

  const awardedRfps = rfps.filter((r: any) => r.status === "awarded").length;
  const totalEstimatedValue = rfps.reduce((sum: number, rfp: any) => sum + (rfp.estimated_budget || 0), 0);

  // Response trend (by month)
  const monthlyRfps = rfps.reduce((acc: any, rfp: any) => {
    const month = format(new Date(rfp.created_at), "MMM yyyy");
    if (!acc[month]) acc[month] = 0;
    acc[month]++;
    return acc;
  }, {});

  const trendData = Object.entries(monthlyRfps)
    .map(([month, count]) => ({ month, count: count as number }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    .slice(-6);

  const isLoading = rfpsLoading || responsesLoading;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-blue-500">Published</Badge>;
      case "evaluation":
        return <Badge className="bg-yellow-500">Evaluation</Badge>;
      case "awarded":
        return <Badge className="bg-green-500">Awarded</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="RFP Analysis Report"
          description="Track RFP performance, response rates, and award outcomes"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total RFPs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rfps.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Responses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rfpResponses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Response Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseRate.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">responses per RFP</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Awarded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{awardedRfps}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Est. Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEstimatedValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>RFP Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly RFP Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" name="RFPs Created" fill="#0088FE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>RFP Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RFP Title</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="text-right">Est. Budget</TableHead>
                  <TableHead className="text-right">Responses</TableHead>
                  <TableHead className="text-right">Submitted</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfpWithResponses.slice(0, 20).map((rfp: any) => (
                  <TableRow key={rfp.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{rfp.title}</TableCell>
                    <TableCell>{format(new Date(rfp.created_at), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      {rfp.submission_deadline 
                        ? format(new Date(rfp.submission_deadline), "MMM dd, yyyy")
                        : "-"
                      }
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(rfp.estimated_budget || 0)}</TableCell>
                    <TableCell className="text-right">{rfp.responseCount}</TableCell>
                    <TableCell className="text-right">{rfp.submittedResponses}</TableCell>
                    <TableCell>{getStatusBadge(rfp.status)}</TableCell>
                  </TableRow>
                ))}
                {rfpWithResponses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No RFPs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RfpAnalysisReportPage;
