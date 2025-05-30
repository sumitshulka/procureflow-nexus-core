
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import DashboardStats from "@/components/dashboard/DashboardStats";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import ProcurementSummary from "@/components/dashboard/ProcurementSummary";
import DataTable from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const upcomingDeliveries = [
    {
      id: "PO-2023-089",
      vendor: "Office Supplies Inc.",
      items: "Office Furniture",
      value: 12500,
      dueDate: "2023-09-15",
      status: "in_transit",
    },
    {
      id: "PO-2023-092",
      vendor: "Tech Solutions Ltd.",
      items: "Laptops and Accessories",
      value: 28750,
      dueDate: "2023-09-18",
      status: "pending",
    },
    {
      id: "PO-2023-095",
      vendor: "Global Stationary Corp.",
      items: "Printer Paper and Toners",
      value: 4300,
      dueDate: "2023-09-20",
      status: "in_transit",
    },
  ];

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
      id: "items",
      header: "Items",
      cell: (row: any) => row.items,
    },
    {
      id: "value",
      header: "Value",
      cell: (row: any) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(row.value),
    },
    {
      id: "dueDate",
      header: "Due Date",
      cell: (row: any) => new Date(row.dueDate).toLocaleDateString(),
    },
    {
      id: "status",
      header: "Status",
      cell: (row: any) => {
        const statusMap: Record<string, { label: string; className: string }> = {
          pending: {
            label: "Pending",
            className: "bg-amber-50 text-amber-600 border-amber-200",
          },
          in_transit: {
            label: "In Transit",
            className: "bg-blue-50 text-blue-600 border-blue-200",
          },
          delivered: {
            label: "Delivered",
            className: "bg-green-50 text-green-600 border-green-200",
          },
          delayed: {
            label: "Delayed",
            className: "bg-red-50 text-red-600 border-red-200",
          },
        };

        const status = statusMap[row.status] || {
          label: "Unknown",
          className: "bg-gray-50 text-gray-600 border-gray-200",
        };

        return (
          <Badge variant="outline" className={status.className}>
            {status.label}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement Dashboard"
        description="Overview of procurement activities and key metrics"
        actions={
          <>
            <Button size="sm" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
            <Button size="sm">
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
