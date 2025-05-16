import { useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DataTable from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Filter, Plus, Search } from "lucide-react";

const ProcurementRequests = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Mock procurement request data
  const procurementRequests = [
    {
      id: "PR-2023-089",
      title: "Office Furniture for New Branch",
      requester: "John Doe",
      department: "Operations",
      dateCreated: "2023-08-30",
      dateNeeded: "2023-09-30",
      priority: "medium",
      status: "submitted",
      estimatedValue: 12500,
    },
    {
      id: "PR-2023-091",
      title: "IT Equipment for Development Team",
      requester: "Jane Smith",
      department: "Technology",
      dateCreated: "2023-09-01",
      dateNeeded: "2023-09-20",
      priority: "high",
      status: "in_review",
      estimatedValue: 28750,
    },
    {
      id: "PR-2023-092",
      title: "Marketing Materials for Q4 Campaign",
      requester: "Robert Johnson",
      department: "Marketing",
      dateCreated: "2023-09-03",
      dateNeeded: "2023-10-15",
      priority: "low",
      status: "approved",
      estimatedValue: 5600,
    },
    {
      id: "PR-2023-093",
      title: "Office Supplies Restock",
      requester: "Sarah Williams",
      department: "Administration",
      dateCreated: "2023-09-05",
      dateNeeded: "2023-09-25",
      priority: "medium",
      status: "submitted",
      estimatedValue: 3200,
    },
    {
      id: "PR-2023-094",
      title: "Training Materials for New Hires",
      requester: "Michael Brown",
      department: "Human Resources",
      dateCreated: "2023-09-07",
      dateNeeded: "2023-10-05",
      priority: "urgent",
      status: "draft",
      estimatedValue: 1800,
    },
  ];

  const filteredRequests = procurementRequests.filter((request) => {
    const matchesSearch =
      searchTerm === "" ||
      request.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requester.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus =
      statusFilter === "all" || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
            Urgent
          </Badge>
        );
      case "high":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
            Draft
          </Badge>
        );
      case "submitted":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            Submitted
          </Badge>
        );
      case "in_review":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">
            In Review
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
            Rejected
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-teal-50 text-teal-600 border-teal-200">
            Completed
          </Badge>
        );
      case "canceled":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
            Canceled
          </Badge>
        );
      default:
        return null;
    }
  };

  const requestColumns = [
    {
      id: "id",
      header: "Request ID",
      cell: (row: any) => <span className="font-medium">{row.id}</span>,
    },
    {
      id: "title",
      header: "Title",
      cell: (row: any) => <span className="font-medium">{row.title}</span>,
    },
    {
      id: "requester",
      header: "Requester",
      cell: (row: any) => row.requester,
    },
    {
      id: "department",
      header: "Department",
      cell: (row: any) => row.department,
    },
    {
      id: "dateCreated",
      header: "Date Created",
      cell: (row: any) => new Date(row.dateCreated).toLocaleDateString(),
    },
    {
      id: "dateNeeded",
      header: "Date Needed",
      cell: (row: any) => new Date(row.dateNeeded).toLocaleDateString(),
    },
    {
      id: "priority",
      header: "Priority",
      cell: (row: any) => getPriorityBadge(row.priority),
    },
    {
      id: "status",
      header: "Status",
      cell: (row: any) => getStatusBadge(row.status),
    },
    {
      id: "estimatedValue",
      header: "Est. Value",
      cell: (row: any) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(row.estimatedValue),
    },
    {
      id: "actions",
      header: "",
      cell: (row: any) => (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost">
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Procurement Requests"
        description="Manage and track all procurement requests"
        actions={
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, title, or requester..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={requestColumns}
        data={filteredRequests}
        emptyMessage="No procurement requests found"
      />
    </div>
  );
};

export default ProcurementRequests;
