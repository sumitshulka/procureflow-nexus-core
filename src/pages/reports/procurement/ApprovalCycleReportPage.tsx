import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, ArrowLeft, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const ApprovalCycleReportPage = () => {
  const navigate = useNavigate();

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ["approval-cycle-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approvals")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate approval cycle times
  const approvalMetrics = approvals
    .filter((a: any) => a.approval_date)
    .map((approval: any) => {
      const cycleTimeHours = differenceInHours(
        new Date(approval.approval_date),
        new Date(approval.created_at)
      );
      const cycleTimeDays = differenceInDays(
        new Date(approval.approval_date),
        new Date(approval.created_at)
      );
      
      return {
        ...approval,
        cycleTimeHours,
        cycleTimeDays,
        isDelayed: cycleTimeHours > 48, // More than 2 days is delayed
      };
    });

  // Average cycle time
  const avgCycleTimeHours = approvalMetrics.length > 0
    ? approvalMetrics.reduce((sum, a) => sum + a.cycleTimeHours, 0) / approvalMetrics.length
    : 0;

  // Bottleneck analysis by entity type
  const entityTypeMetrics = approvalMetrics.reduce((acc: any, a: any) => {
    const type = a.entity_type || "unknown";
    if (!acc[type]) {
      acc[type] = { count: 0, totalHours: 0, delayed: 0 };
    }
    acc[type].count++;
    acc[type].totalHours += a.cycleTimeHours;
    if (a.isDelayed) acc[type].delayed++;
    return acc;
  }, {});

  const chartData = Object.entries(entityTypeMetrics).map(([type, data]: [string, any]) => ({
    name: type.replace("_", " ").toUpperCase(),
    avgHours: Math.round(data.totalHours / data.count),
    count: data.count,
    delayRate: Math.round((data.delayed / data.count) * 100),
  })).sort((a, b) => b.avgHours - a.avgHours);

  const pendingApprovals = approvals.filter((a: any) => a.status === "pending").length;
  const delayedApprovals = approvalMetrics.filter((a) => a.isDelayed).length;

  const getPerformanceBadge = (hours: number) => {
    if (hours <= 24) return <Badge className="bg-green-500">Fast</Badge>;
    if (hours <= 48) return <Badge className="bg-yellow-500">Normal</Badge>;
    return <Badge variant="destructive">Slow</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Approval Cycle Report"
          description="Analyze approval times and identify bottlenecks in the workflow"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Cycle Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgCycleTimeHours)}h</div>
            <p className="text-xs text-muted-foreground">
              ~{Math.round(avgCycleTimeHours / 24)} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingApprovals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Delayed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{delayedApprovals}</div>
            <p className="text-xs text-muted-foreground">&gt;48 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              On-Time Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {approvalMetrics.length > 0 
                ? Math.round(((approvalMetrics.length - delayedApprovals) / approvalMetrics.length) * 100)
                : 100}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Average Approval Time by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" unit="h" />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip 
                  formatter={(value: any, name) => [
                    name === "avgHours" ? `${value} hours` : `${value}%`,
                    name === "avgHours" ? "Avg Time" : "Delay Rate"
                  ]}
                />
                <Bar dataKey="avgHours" name="avgHours" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.avgHours > 48 ? "#ef4444" : entry.avgHours > 24 ? "#eab308" : "#22c55e"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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
          <CardTitle>Recent Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead className="text-right">Cycle Time</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvalMetrics.slice(0, 20).map((approval: any) => (
                  <TableRow key={approval.id}>
                    <TableCell className="font-medium uppercase">{approval.entity_type}</TableCell>
                    <TableCell className="font-mono text-xs">{approval.entity_id.substring(0, 8)}...</TableCell>
                    <TableCell>{format(new Date(approval.created_at), "MMM dd, yyyy HH:mm")}</TableCell>
                    <TableCell>
                      {approval.approval_date 
                        ? format(new Date(approval.approval_date), "MMM dd, yyyy HH:mm")
                        : "-"
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {approval.cycleTimeHours}h ({approval.cycleTimeDays}d)
                    </TableCell>
                    <TableCell>{getPerformanceBadge(approval.cycleTimeHours)}</TableCell>
                    <TableCell>
                      <Badge variant={approval.status === "approved" ? "default" : "secondary"}>
                        {approval.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {approvalMetrics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No completed approvals found
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

export default ApprovalCycleReportPage;
