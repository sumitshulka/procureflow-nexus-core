
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Search, Archive, ArchiveRestore, Eye, Filter, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

const NotificationsList = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active"); // active, archived, all
  const [readFilter, setReadFilter] = useState("all"); // all, read, unread

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchTerm, typeFilter, statusFilter, readFilter]);

  const fetchNotifications = async () => {
    try {
      // Mock notifications data for now since we don't have authentication
      const mockNotifications: Notification[] = [
        {
          id: "1",
          title: "Purchase Order Approved",
          message: "Purchase Order PO-2024-001 has been approved and sent to vendor.",
          type: "success",
          entity_type: "purchase_order",
          entity_id: "po-001",
          is_read: false,
          is_archived: false,
          created_at: "2024-06-18T10:00:00Z",
          updated_at: "2024-06-18T10:00:00Z"
        },
        {
          id: "2",
          title: "RFP Response Received",
          message: "New response received for RFP-2024-001 from Tech Solutions Inc.",
          type: "info",
          entity_type: "rfp",
          entity_id: "rfp-001",
          is_read: true,
          is_archived: false,
          created_at: "2024-06-17T14:30:00Z",
          updated_at: "2024-06-17T15:00:00Z"
        },
        {
          id: "3",
          title: "Procurement Request Pending",
          message: "Your procurement request PR-2024-010 is pending approval.",
          type: "warning",
          entity_type: "procurement_request",
          entity_id: "pr-010",
          is_read: false,
          is_archived: false,
          created_at: "2024-06-16T09:15:00Z",
          updated_at: "2024-06-16T09:15:00Z"
        },
        {
          id: "4",
          title: "Vendor Registration Approved",
          message: "Vendor registration for ABC Corp has been approved.",
          type: "success",
          entity_type: "vendor",
          entity_id: "vendor-001",
          is_read: true,
          is_archived: true,
          created_at: "2024-06-15T16:45:00Z",
          updated_at: "2024-06-15T17:00:00Z"
        },
        {
          id: "5",
          title: "Budget Limit Warning",
          message: "Department budget is 90% utilized for current quarter.",
          type: "warning",
          entity_type: "budget",
          entity_id: "budget-q2",
          is_read: false,
          is_archived: false,
          created_at: "2024-06-14T11:20:00Z",
          updated_at: "2024-06-14T11:20:00Z"
        }
      ];

      setNotifications(mockNotifications);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    // Filter by status (active/archived)
    if (statusFilter === "active") {
      filtered = filtered.filter(n => !n.is_archived);
    } else if (statusFilter === "archived") {
      filtered = filtered.filter(n => n.is_archived);
    }

    // Filter by read status
    if (readFilter === "read") {
      filtered = filtered.filter(n => n.is_read);
    } else if (readFilter === "unread") {
      filtered = filtered.filter(n => !n.is_read);
    }

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter(n => n.type === typeFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      
      toast({
        title: "Success",
        description: "Notification marked as read",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const toggleArchive = async (notificationId: string, isArchived: boolean) => {
    try {
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, is_archived: !isArchived } : n
      ));
      
      toast({
        title: "Success",
        description: `Notification ${isArchived ? 'unarchived' : 'archived'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to ${isArchived ? 'unarchive' : 'archive'} notification`,
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      toast({
        title: "Success",
        description: "Notification deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "success":
        return "default";
      case "warning":
        return "secondary";
      case "error":
        return "destructive";
      case "info":
      default:
        return "outline";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "error":
        return "text-red-600";
      case "info":
      default:
        return "text-blue-600";
    }
  };

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Read Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notifications found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card key={notification.id} className={`${!notification.is_read && !notification.is_archived ? 'border-l-4 border-l-blue-500' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`font-semibold ${!notification.is_read && !notification.is_archived ? 'font-bold' : ''}`}>
                        {notification.title}
                      </h3>
                      <Badge variant={getTypeBadgeVariant(notification.type)}>
                        {notification.type}
                      </Badge>
                      {!notification.is_read && !notification.is_archived && (
                        <Badge variant="secondary" className="text-xs">
                          New
                        </Badge>
                      )}
                      {notification.is_archived && (
                        <Badge variant="outline" className="text-xs">
                          Archived
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-3">{notification.message}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{format(new Date(notification.created_at), "PPP p")}</span>
                      {notification.entity_type && (
                        <span className="capitalize">
                          {notification.entity_type.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!notification.is_read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleArchive(notification.id, notification.is_archived)}
                    >
                      {notification.is_archived ? (
                        <ArchiveRestore className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsList;
