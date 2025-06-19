
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Download, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface PurchaseOrder {
  id: string;
  po_number: string;
  status: string;
  vendor_id: string;
  created_at: string;
  po_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  final_amount: number;
  currency: string;
  vendor_registrations?: {
    company_name: string;
  };
}

const PurchaseOrderHistory = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [purchaseOrders, searchTerm, statusFilter, dateRange]);

  const fetchPurchaseOrders = async () => {
    try {
      // Mock data with database-style structure including historical orders
      const mockOrders: PurchaseOrder[] = [
        // Historical completed orders
        {
          id: "8748fe20-309c-4ede-829f-e376b17cbe9g",
          po_number: "PO-2023-045",
          status: "completed",
          vendor_id: "550e8400-e29b-41d4-a716-446655440003",
          created_at: "2023-12-10T09:15:00Z",
          po_date: "2023-12-10T00:00:00Z",
          expected_delivery_date: "2024-01-10T00:00:00Z",
          actual_delivery_date: "2024-01-08T00:00:00Z",
          final_amount: 95000.00,
          currency: "USD",
          vendor_registrations: {
            company_name: "Premium Systems Ltd"
          }
        },
        {
          id: "9748fe20-309c-4ede-829f-e376b17cbe9h",
          po_number: "PO-2023-044",
          status: "completed",
          vendor_id: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2023-11-15T11:45:00Z",
          po_date: "2023-11-15T00:00:00Z",
          expected_delivery_date: "2023-12-15T00:00:00Z",
          actual_delivery_date: "2023-12-12T00:00:00Z",
          final_amount: 67500.00,
          currency: "USD",
          vendor_registrations: {
            company_name: "Tech Solutions Inc"
          }
        },
        {
          id: "a748fe20-309c-4ede-829f-e376b17cbe9i",
          po_number: "PO-2023-043",
          status: "cancelled",
          vendor_id: "550e8400-e29b-41d4-a716-446655440002",
          created_at: "2023-10-20T14:30:00Z",
          po_date: "2023-10-20T00:00:00Z",
          expected_delivery_date: "2023-11-20T00:00:00Z",
          final_amount: 45000.00,
          currency: "USD",
          vendor_registrations: {
            company_name: "Global IT Corp"
          }
        },
        {
          id: "b748fe20-309c-4ede-829f-e376b17cbe9j",
          po_number: "PO-2024-001",
          status: "delivered",
          vendor_id: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-15T10:00:00Z",
          po_date: "2024-01-15T00:00:00Z",
          expected_delivery_date: "2024-02-15T00:00:00Z",
          actual_delivery_date: "2024-02-10T00:00:00Z",
          final_amount: 125000.00,
          currency: "USD",
          vendor_registrations: {
            company_name: "Tech Solutions Inc"
          }
        },
        {
          id: "c748fe20-309c-4ede-829f-e376b17cbe9k",
          po_number: "PO-2024-005",
          status: "completed",
          vendor_id: "550e8400-e29b-41d4-a716-446655440002",
          created_at: "2024-03-20T08:30:00Z",
          po_date: "2024-03-20T00:00:00Z",
          expected_delivery_date: "2024-04-20T00:00:00Z",
          actual_delivery_date: "2024-04-18T00:00:00Z",
          final_amount: 78000.00,
          currency: "USD",
          vendor_registrations: {
            company_name: "Global IT Corp"
          }
        },
        {
          id: "d748fe20-309c-4ede-829f-e376b17cbe9l",
          po_number: "PO-2024-006",
          status: "completed",
          vendor_id: "550e8400-e29b-41d4-a716-446655440003",
          created_at: "2024-05-10T13:15:00Z",
          po_date: "2024-05-10T00:00:00Z",
          expected_delivery_date: "2024-06-10T00:00:00Z",
          actual_delivery_date: "2024-06-08T00:00:00Z",
          final_amount: 112000.00,
          currency: "USD",
          vendor_registrations: {
            company_name: "Premium Systems Ltd"
          }
        }
      ];

      setPurchaseOrders(mockOrders);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch purchase order history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = purchaseOrders;

    // Only show completed, cancelled, or delivered orders for history
    filtered = filtered.filter(order => 
      ['completed', 'cancelled', 'delivered'].includes(order.status)
    );

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.vendor_registrations?.company_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    if (dateRange !== "all") {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateRange) {
        case "7days":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "30days":
          filterDate.setDate(now.getDate() - 30);
          break;
        case "90days":
          filterDate.setDate(now.getDate() - 90);
          break;
        case "1year":
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter((order) => new Date(order.created_at) >= filterDate);
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "cancelled":
        return "destructive";
      case "delivered":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusDisplayName = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Purchase Order History</h1>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export History
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">✓</div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {filteredOrders.filter(po => po.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">📦</div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">
                  {filteredOrders.filter(po => po.status === 'delivered').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">✕</div>
              <div>
                <p className="text-sm text-muted-foreground">Cancelled</p>
                <p className="text-2xl font-bold">
                  {filteredOrders.filter(po => po.status === 'cancelled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">$</div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  ${filteredOrders.filter(po => po.status !== 'cancelled').reduce((sum, po) => sum + po.final_amount, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search purchase orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Order History List */}
      <div className="grid gap-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No purchase orders found in history.</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-lg font-semibold">PO {order.po_number}</h3>
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {getStatusDisplayName(order.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Vendor: {order.vendor_registrations?.company_name}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Amount:</span>{" "}
                        {order.currency} {order.final_amount.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">PO Date:</span>{" "}
                        {format(new Date(order.po_date), "PPP")}
                      </div>
                      <div>
                        <span className="font-medium">Expected Delivery:</span>{" "}
                        {order.expected_delivery_date 
                          ? format(new Date(order.expected_delivery_date), "PPP")
                          : "Not specified"
                        }
                      </div>
                      <div>
                        <span className="font-medium">Actual Delivery:</span>{" "}
                        {order.actual_delivery_date 
                          ? format(new Date(order.actual_delivery_date), "PPP")
                          : "N/A"
                        }
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/purchase-orders/${order.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {/* Implement download PO */}}
                    >
                      <Download className="h-4 w-4" />
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

export default PurchaseOrderHistory;
