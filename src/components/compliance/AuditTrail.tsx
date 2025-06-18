
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/common/DataTable";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Search, Download, Filter } from "lucide-react";

const AuditTrail = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  // Mock audit trail data - replace with actual database queries
  const auditLogs = [
    {
      id: "1",
      timestamp: "2024-01-15 10:30:00",
      userId: "user-1",
      userName: "John Doe",
      action: "CREATE",
      entityType: "procurement_request",
      entityId: "PR-001",
      description: "Created procurement request PR-2024-001",
      ipAddress: "192.168.1.100",
      userAgent: "Chrome/96.0.4664.110",
      changes: {
        title: "Office Supplies Request",
        status: "draft"
      }
    },
    {
      id: "2",
      timestamp: "2024-01-15 11:15:00",
      userId: "user-2",
      userName: "Jane Smith",
      action: "UPDATE",
      entityType: "procurement_request",
      entityId: "PR-001",
      description: "Updated procurement request status to submitted",
      ipAddress: "192.168.1.101",
      userAgent: "Firefox/95.0",
      changes: {
        status: { from: "draft", to: "submitted" }
      }
    },
    {
      id: "3",
      timestamp: "2024-01-15 14:22:00",
      userId: "user-3",
      userName: "Mike Johnson",
      action: "APPROVE",
      entityType: "procurement_request",
      entityId: "PR-001",
      description: "Approved procurement request PR-2024-001",
      ipAddress: "192.168.1.102",
      userAgent: "Safari/14.1.2",
      changes: {
        status: { from: "submitted", to: "approved" },
        approver: "Mike Johnson"
      }
    },
    {
      id: "4",
      timestamp: "2024-01-15 16:45:00",
      userId: "user-1",
      userName: "John Doe",
      action: "DELETE",
      entityType: "product",
      entityId: "PROD-001",
      description: "Deleted product PROD-001 from catalog",
      ipAddress: "192.168.1.100",
      userAgent: "Chrome/96.0.4664.110",
      changes: {
        name: "Deleted Product",
        status: "deleted"
      }
    },
  ];

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      CREATE: "default",
      UPDATE: "secondary",
      DELETE: "destructive",
      APPROVE: "default",
      REJECT: "destructive",
      LOGIN: "outline",
      LOGOUT: "outline",
    };
    return <Badge variant={variants[action] || "outline"}>{action}</Badge>;
  };

  const columns = [
    {
      id: "timestamp",
      header: "Timestamp",
      cell: (row: any) => (
        <div className="text-sm">
          <div>{format(new Date(row.timestamp), "MMM dd, yyyy")}</div>
          <div className="text-muted-foreground">{format(new Date(row.timestamp), "HH:mm:ss")}</div>
        </div>
      ),
    },
    {
      id: "user",
      header: "User",
      cell: (row: any) => (
        <div className="text-sm">
          <div className="font-medium">{row.userName}</div>
          <div className="text-muted-foreground">{row.userId}</div>
        </div>
      ),
    },
    {
      id: "action",
      header: "Action",
      cell: (row: any) => getActionBadge(row.action),
    },
    {
      id: "entity",
      header: "Entity",
      cell: (row: any) => (
        <div className="text-sm">
          <div className="font-medium">{row.entityType}</div>
          <div className="text-muted-foreground">{row.entityId}</div>
        </div>
      ),
    },
    {
      id: "description",
      header: "Description",
      cell: (row: any) => (
        <div className="text-sm max-w-xs truncate" title={row.description}>
          {row.description}
        </div>
      ),
    },
    {
      id: "ipAddress",
      header: "IP Address",
      cell: (row: any) => <span className="text-sm font-mono">{row.ipAddress}</span>,
    },
  ];

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch = searchTerm === "" || 
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesUser = userFilter === "all" || log.userId === userFilter;
    
    return matchesSearch && matchesAction && matchesUser;
  });

  const showDetailPanel = (row: any) => (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold mb-2">Audit Details</h4>
        <div className="space-y-2 text-sm">
          <div><strong>Timestamp:</strong> {row.timestamp}</div>
          <div><strong>User:</strong> {row.userName} ({row.userId})</div>
          <div><strong>Action:</strong> {getActionBadge(row.action)}</div>
          <div><strong>Entity:</strong> {row.entityType} - {row.entityId}</div>
          <div><strong>IP Address:</strong> {row.ipAddress}</div>
          <div><strong>User Agent:</strong> {row.userAgent}</div>
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold mb-2">Description</h4>
        <p className="text-sm">{row.description}</p>
      </div>
      
      {row.changes && (
        <div>
          <h4 className="font-semibold mb-2">Changes</h4>
          <div className="bg-gray-50 p-3 rounded text-sm">
            <pre>{JSON.stringify(row.changes, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Audit Trail Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="APPROVE">Approve</SelectItem>
                <SelectItem value="REJECT">Reject</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="user-1">John Doe</SelectItem>
                <SelectItem value="user-2">Jane Smith</SelectItem>
                <SelectItem value="user-3">Mike Johnson</SelectItem>
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "From Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete log of all system activities and user actions
          </p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredLogs}
            emptyMessage="No audit logs found"
            showDetailPanel={showDetailPanel}
            detailPanelTitle="Audit Log Details"
            detailPanelDescription="Detailed information about this audit entry"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditTrail;
