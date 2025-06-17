
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Calendar, Download, Filter, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";

interface CustomDateRange {
  from: Date;
  to: Date;
}

const PerformanceReports = () => {
  const [dateRange, setDateRange] = useState<CustomDateRange>({
    from: addDays(new Date(), -30),
    to: new Date()
  });
  const [department, setDepartment] = useState<string>("all");

  const handleDateChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setDateRange({
        from: range.from,
        to: range.to
      });
    }
  };

  // Fetch procurement performance data
  const { data: performanceData, isLoading } = useQuery({
    queryKey: ["performance_analytics", dateRange, department],
    queryFn: async () => {
      let query = supabase
        .from("procurement_requests")
        .select(`
          id,
          status,
          created_at,
          date_needed,
          department,
          estimated_value,
          profiles!procurement_requests_requester_id_fkey(full_name, department)
        `)
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString());

      if (department !== "all") {
        query = query.eq("department", department);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process data for charts
      const statusCounts = data?.reduce((acc, req) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const monthlyData = data?.reduce((acc, req) => {
        const month = format(new Date(req.created_at), "MMM yyyy");
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const departmentData = data?.reduce((acc, req) => {
        const dept = req.department || "Unknown";
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Calculate metrics
      const totalRequests = data?.length || 0;
      const completedRequests = data?.filter(req => req.status === "completed").length || 0;
      const pendingRequests = data?.filter(req => req.status === "submitted" || req.status === "in_review").length || 0;
      const avgProcessingTime = data?.length ? 
        data.reduce((acc, req) => {
          const created = new Date(req.created_at);
          const needed = new Date(req.date_needed);
          return acc + (needed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / data.length : 0;

      return {
        totalRequests,
        completedRequests,
        pendingRequests,
        avgProcessingTime: Math.round(avgProcessingTime),
        completionRate: totalRequests ? ((completedRequests / totalRequests) * 100).toFixed(1) : "0",
        statusChart: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
        monthlyChart: Object.entries(monthlyData).map(([name, value]) => ({ name, value })),
        departmentChart: Object.entries(departmentData).map(([name, value]) => ({ name, value }))
      };
    },
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <DatePickerWithRange 
                date={dateRange} 
                onDateChange={handleDateChange} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-3xl font-bold">{performanceData?.totalRequests || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-3xl font-bold">{performanceData?.completionRate || 0}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                <p className="text-3xl font-bold">{performanceData?.pendingRequests || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Processing Time</p>
                <p className="text-3xl font-bold">{performanceData?.avgProcessingTime || 0}</p>
                <p className="text-xs text-muted-foreground">days</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={performanceData?.statusChart}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {performanceData?.statusChart?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Request Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData?.monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Requests by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData?.departmentChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceReports;
