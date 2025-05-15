
import {
  Archive,
  Box,
  ClipboardList,
  FileCheck,
  FileText,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";

const DashboardStats = () => {
  const stats = [
    {
      title: "Active Requests",
      value: 24,
      trend: "+8%",
      trendUp: true,
      icon: ShoppingCart,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      title: "Pending RFPs",
      value: 16,
      trend: "+4%",
      trendUp: true,
      icon: FileText,
      bgColor: "bg-green-50",
      iconColor: "text-green-500",
    },
    {
      title: "Open Purchase Orders",
      value: 32,
      trend: "-2%",
      trendUp: false,
      icon: ClipboardList,
      bgColor: "bg-purple-50",
      iconColor: "text-purple-500",
    },
    {
      title: "Unpaid Invoices",
      value: 12,
      trend: "-6%",
      trendUp: false,
      icon: FileCheck,
      bgColor: "bg-amber-50",
      iconColor: "text-amber-500",
    },
    {
      title: "Active Vendors",
      value: 87,
      trend: "+12%",
      trendUp: true,
      icon: Users,
      bgColor: "bg-red-50",
      iconColor: "text-red-500",
    },
    {
      title: "Low Stock Items",
      value: 8,
      trend: "+3%",
      trendUp: true,
      icon: Box,
      bgColor: "bg-cyan-50",
      iconColor: "text-cyan-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="dashboard-stat-card">
          <div className="flex items-center justify-between">
            <div
              className={`p-2 rounded-md ${stat.bgColor} ${stat.iconColor}`}
            >
              <stat.icon size={20} />
            </div>
            <div
              className={`text-xs flex items-center ${
                stat.trendUp ? "text-green-600" : "text-red-600"
              }`}
            >
              <TrendingUp
                size={14}
                className={!stat.trendUp ? "rotate-180" : ""}
              />
              <span className="ml-1">{stat.trend}</span>
            </div>
          </div>
          <div className="flex flex-col mt-2">
            <span className="text-2xl font-bold">{stat.value}</span>
            <span className="text-sm text-gray-500">{stat.title}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
