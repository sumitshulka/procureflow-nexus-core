
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrencySymbol } from "@/utils/currencyUtils";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

const MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ProcurementSummary = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const { data: orgSettings } = useQuery({
    queryKey: ["org-settings-currency-dashboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_settings")
        .select("base_currency")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const baseCurrency = orgSettings?.base_currency || "USD";
  const currencySymbol = getCurrencySymbol(baseCurrency);

  const { data, isLoading } = useQuery({
    queryKey: ["procurement-summary-charts", selectedYear],
    queryFn: async () => {
      const yearStart = `${selectedYear}-01-01`;
      const yearEnd = `${selectedYear}-12-31`;

      // Fetch POs for the selected year
      const { data: orders } = await supabase
        .from("purchase_orders")
        .select("po_date, final_amount")
        .gte("po_date", yearStart)
        .lte("po_date", yearEnd)
        .order("po_date", { ascending: true });

      // Fetch all distinct years for the dropdown
      const { data: allOrders } = await supabase
        .from("purchase_orders")
        .select("po_date")
        .order("po_date", { ascending: true });

      const availableYears = new Set<number>();
      availableYears.add(currentYear);
      allOrders?.forEach((o) => {
        if (o.po_date) availableYears.add(new Date(o.po_date).getFullYear());
      });

      // Fetch PO items for spend by category
      const { data: poItems } = await supabase
        .from("purchase_order_items")
        .select("total_price, description");

      // Build monthly data for selected year
      const monthlyMap: Record<string, number> = {};
      MONTH_ORDER.forEach((m) => { monthlyMap[m] = 0; });

      orders?.forEach((o) => {
        const key = format(new Date(o.po_date), "MMM");
        if (key in monthlyMap) {
          monthlyMap[key] += Number(o.final_amount) || 0;
        }
      });

      const monthlyData = MONTH_ORDER.map((name) => ({
        name,
        value: monthlyMap[name],
      }));

      // Build category data
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

      return {
        monthlyData,
        categoryData,
        availableYears: Array.from(availableYears).sort((a, b) => b - a),
      };
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
  const availableYears = data?.availableYears || [currentYear];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Monthly Procurement Volume</CardTitle>
            <CardDescription>Total procurement spend by month ({currencySymbol})</CardDescription>
          </div>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) =>
                  `${currencySymbol}${Number(value).toLocaleString()}`
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
