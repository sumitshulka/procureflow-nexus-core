
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import DashboardStats from "@/components/dashboard/DashboardStats";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import ProcurementSummary from "@/components/dashboard/ProcurementSummary";
import DataTable from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const navigate = useNavigate();

  const { data: upcomingDeliveries = [] } = useQuery({
    queryKey: ["dashboard-upcoming-deliveries"],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("purchase_orders")
        .select("id, po_number, vendor_id, final_amount, expected_delivery_date, status")
        .in("status", ["approved", "sent", "partially_received"])
        .order("expected_delivery_date", { ascending: true })
        .limit(10);

      if (!orders || orders.length === 0) return [];

      const vendorIds = [...new Set(orders.map((o) => o.vendor_id).filter(Boolean))];
      const { data: vendors } = await supabase
        .from("vendor_registrations")
        .select("id, company_name")
        .in("id", vendorIds);

      const vendorMap = new Map(vendors?.map((v) => [v.id, v.company_name]) || []);

      return orders.map((o) => ({
        id: o.po_number || o.id,
        vendor: vendorMap.get(o.vendor_id) || "Unknown Vendor",
        items: "-",
        value: Number(o.final_amount) || 0,
        dueDate: o.expected_delivery_date || "",
        status: o.status === "sent" ? "in_transit" : o.status === "approved" ? "pending" : o.status,
      }));
    },
    refetchInterval: 30000,
  });

  const deliveryColumns = [
    {
      id: "poNumber",
      header: "PO Number",
      cell: (row: any) => <span className="font-medium">{row.id}</span>,
    },
    {
      id: "vendor",
      header: "Vendor",
      cell: (row: any) => row.vendor,
    },
    {
      id: "value",
      header: "Value",
      cell: (row: any) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.value),
    },
    {
      id: "dueDate",
      header: "Due Date",
      cell: (row: any) => row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "N/A",
    },
    {
      id: "status",
      header: "Status",
      cell: (row: any) => {
        const statusMap: Record<string, { label: string; className: string }> = {
          pending: { label: "Pending", className: "bg-amber-50 text-amber-600 border-amber-200" },
          in_transit: { label: "In Transit", className: "bg-blue-50 text-blue-600 border-blue-200" },
          delivered: { label: "Delivered", className: "bg-green-50 text-green-600 border-green-200" },
          partially_received: { label: "Partial", className: "bg-purple-50 text-purple-600 border-purple-200" },
        };
        const status = statusMap[row.status] || { label: row.status || "Unknown", className: "bg-gray-50 text-gray-600 border-gray-200" };
        return <Badge variant="outline" className={status.className}>{status.label}</Badge>;
      },
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Procurement Dashboard"
        description="Overview of procurement activities and key metrics"
        actions={
          <>
            <Button size="sm" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
            <Button size="sm" onClick={() => navigate('/requests?new=true')}>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </>
        }
      />

      <DashboardStats />

      <div className="mt-6">
        <ProcurementSummary />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Upcoming Deliveries</h2>
          <DataTable
            columns={deliveryColumns}
            data={upcomingDeliveries}
            emptyMessage="No upcoming deliveries"
          />
        </div>
        <div className="lg:col-span-1">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
