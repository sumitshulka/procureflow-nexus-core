
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

const ProcurementSummary = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["procurement-summary-charts"],
    queryFn: async () => {
      const eightMonthsAgo = subMonths(new Date(), 8);

      // Fetch POs for monthly volume
      const { data: orders } = await supabase
        .from("purchase_orders")
        .select("po_date, final_amount")
        .gte("po_date", eightMonthsAgo.toISOString())
        .order("po_date", { ascending: true });

      // Fetch PO items with category info for spend by category
      const { data: poItems } = await supabase
        .from("purchase_order_items")
        .select("total_price, description");

      // Build monthly data
      const monthlyMap: Record<string, number> = {};
      for (let i = 7; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const key = format(startOfMonth(d), "MMM");
        monthlyMap[key] = 0;
      }
      orders?.forEach((o) => {
        const key = format(new Date(o.po_date), "MMM");
        if (key in monthlyMap) {
          monthlyMap[key] += Number(o.final_amount) || 0;
        }
      });
      const monthlyData = Object.entries(monthlyMap).map(([name, value]) => ({
        name,
        value,
      }));

      // Build category data - group by first word of description as proxy for category
      const catMap: Record<string, number> = {};
      poItems?.forEach((item) => {
        const cat = item.description?.split(" ")[0] || "Other";
        catMap[cat] = (catMap[cat] || 0) + (Number(item.total_price) || 0);
      });
      const total = Object.values(catMap).reduce((s, v) => s + v, 0) || 1;
      const sortedCats = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      const categoryData = sortedCats.map(([name, val]) => ({
        name,
        value: Math.round((val / total) * 100),
      }));

      return { monthlyData, categoryData };
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardContent className="h-[300px] flex items-center justify-center"><Skeleton className="h-60 w-full" /></CardContent></Card>
        <Card><CardContent className="h-[300px] flex items-center justify-center"><Skeleton className="h-60 w-full" /></CardContent></Card>
      </div>
    );
  }

  const monthlyData = data?.monthlyData || [];
  const categoryData = data?.categoryData || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Procurement Volume</CardTitle>
          <CardDescription>Total procurement spend by month</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) =>
                  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value as number)
                }
              />
              <Area type="monotone" dataKey="value" stroke="#0284c7" fill="#0ea5e9" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spend by Category</CardTitle>
          <CardDescription>Procurement distribution across categories</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {categoryData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">No spend data available</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, "Percentage"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcurementSummary;
