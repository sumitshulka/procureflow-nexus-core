
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

const ProcurementSummary = () => {
  // Monthly procurement volume data
  const monthlyData = [
    { name: "Jan", value: 120000 },
    { name: "Feb", value: 156000 },
    { name: "Mar", value: 134000 },
    { name: "Apr", value: 178000 },
    { name: "May", value: 210000 },
    { name: "Jun", value: 190000 },
    { name: "Jul", value: 225000 },
    { name: "Aug", value: 250000 },
  ];

  // Spending by category
  const categoryData = [
    { name: "IT Equipment", value: 35 },
    { name: "Office Supplies", value: 25 },
    { name: "Furniture", value: 18 },
    { name: "Services", value: 12 },
    { name: "Others", value: 10 },
  ];

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Procurement Volume</CardTitle>
          <CardDescription>
            Total procurement spend by month
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={monthlyData}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) =>
                  new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(value as number)
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0284c7"
                fill="#0ea5e9"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spend by Category</CardTitle>
          <CardDescription>
            Procurement distribution across categories
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
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
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {categoryData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value}%`, "Percentage"]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcurementSummary;
