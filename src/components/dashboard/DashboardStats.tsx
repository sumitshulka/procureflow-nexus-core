
import {
  Box,
  ClipboardList,
  FileCheck,
  FileText,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

const DashboardStats = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [
        { count: activeRequests },
        { count: pendingRfps },
        { count: openPOs },
        { count: unpaidInvoices },
        { count: activeVendors },
        { count: lowStockItems },
      ] = await Promise.all([
        supabase
          .from("procurement_requests")
          .select("*", { count: "exact", head: true })
          .in("status", ["submitted", "approved", "in_review"]),
        supabase
          .from("rfps")
          .select("*", { count: "exact", head: true })
          .in("status", ["draft", "published"]),
        supabase
          .from("purchase_orders")
          .select("*", { count: "exact", head: true })
          .in("status", ["draft", "pending_approval", "approved", "sent"]),
        supabase
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .in("status", ["draft", "submitted", "pending_approval", "approved"]),
        supabase
          .from("vendor_registrations")
          .select("*", { count: "exact", head: true })
          .eq("status", "approved"),
        supabase
          .from("inventory_items")
          .select("*", { count: "exact", head: true })
          .lt("quantity", 10),
      ]);

      return [
        {
          title: "Active Requests",
          value: activeRequests ?? 0,
          icon: ShoppingCart,
          bgColor: "bg-blue-50",
          iconColor: "text-blue-500",
          link: "/requests?status=submitted",
        },
        {
          title: "Pending RFPs",
          value: pendingRfps ?? 0,
          icon: FileText,
          bgColor: "bg-green-50",
          iconColor: "text-green-500",
          link: "/rfp?tab=rfps&status=published",
        },
        {
          title: "Open Purchase Orders",
          value: openPOs ?? 0,
          icon: ClipboardList,
          bgColor: "bg-purple-50",
          iconColor: "text-purple-500",
          link: "/purchase-orders/active",
        },
        {
          title: "Unpaid Invoices",
          value: unpaidInvoices ?? 0,
          icon: FileCheck,
          bgColor: "bg-amber-50",
          iconColor: "text-amber-500",
          link: "/invoices?status=pending_approval",
        },
        {
          title: "Active Vendors",
          value: activeVendors ?? 0,
          icon: Users,
          bgColor: "bg-red-50",
          iconColor: "text-red-500",
          link: "/vendors?status=approved",
        },
        {
          title: "Low Stock Items",
          value: lowStockItems ?? 0,
          icon: Box,
          bgColor: "bg-cyan-50",
          iconColor: "text-cyan-500",
          link: "/inventory/items",
        },
      ];
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dashboard-stat-card">
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats?.map((stat, index) => (
        <div
          key={index}
          className="dashboard-stat-card cursor-pointer transition-shadow hover:shadow-md hover:ring-1 hover:ring-primary/20"
          onClick={() => navigate(stat.link)}
        >
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-md ${stat.bgColor} ${stat.iconColor}`}>
              <stat.icon size={20} />
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
