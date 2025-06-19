
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Edit, Search, Filter, FileText, Clock } from "lucide-react";
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
  total_amount: number;
  final_amount: number;
  currency: string;
  payment_terms?: string;
  delivery_terms?: string;
  vendor_registrations?: {
    company_name: string;
  };
}

const ActivePurchaseOrders = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [purchaseOrders, searchTerm, statusFilter]);

  const fetchPurchaseOrders = async () => {
    try {
      // Mock data with database-style structure
      const mockOrders: PurchaseOrder[] = [
        {
          id: "6748fe20-309c-4ede-829f-e376b17cbe9e",
          po_number: "PO-2024-001",
          status: "approved",
          vendor_id: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-15T10:00:00Z",
          po_date: "2024-01-15T00:00:00Z",
          expected_delivery_date: "2024-02-15T00:00:00Z",
          total_amount: 125000.00,
          final_amount: 125000.00,
          currency: "USD",
          payment_terms: "Net 30",
          delivery_terms: "FOB Destination",
          vendor_registrations: {
            company_name: "Tech Solutions Inc"
          }
        },
        {
          id: "7748fe20-309c-4ede-829f-e376b17cbe9f",
          po_number: "PO-2024-002",
          status: "in_progress",
          vendor_id: "550e8400-e29b-41d4-a716-446655440002",
          created_at: "2024-02-01T14:30:00Z",
          po_date: "2024-02-01T00:00:00Z",
          expected_delivery_date: "2024-03-01T00:00:00Z",
          total_amount: 85000.00,
          final_amount: 85000.00,
          currency: "USD",
          payment_terms: "Net 45",
          delivery_terms: "FOB Origin",
          vendor_registrations: {
            company_name: "Global IT Corp"
          }
        },
        {
          id: "8748fe20-309c-4ede-829f-e376b17cbe9g",
          po_number: "PO-2024-003",
          status: "pending_approval",
          vendor_id: "550e8400-e29b-41d4-a716-446655440003",
          created_at: "2024-06-10T09:15:00Z",
          po_date: "2024-06-10T00:00:00Z",
          expected_delivery_date: "2024-07-10T00:00:00Z",
          total_amount: 95000.00,
          final_amount: 95000.00,
          currency: "USD",
          payment_terms: "Net 30",
          delivery_terms: "FOB Destination",
          vendor_registrations: {
            company_name: "Premium Systems Ltd"
          }
        },
        {
          id: "9748fe20-309c-4ede-829f-e376b17cbe9h",
          po_number: "PO-2024-004",
          status: "sent_to_vendor",
          vendor_id: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-06-15T11:45:00Z",
          po_date: "2024-06-15T00:00:00Z",
          expected_delivery_date: "2024-07-30T00:00:00Z",
          total_amount: 67500.00,
          final_amount: 67500.00,
          currency: "USD",
          payment_terms: "Net 30",
          delivery_terms: "FOB Destination",
          vendor_registrations: {
            company_name: "Tech Solutions Inc"
          }
        }
      ];

      setPurchaseOrders(mockOrders);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch purchase orders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = purchaseOrders;

    // Filter out completed and cancelled orders for "active" view
    filtered = filtered.filter(order => 
      !['completed', 'cancelled', 'delivered'].includes(order.status)
    );

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vendor_registrations?.company_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "default";
      case "pending_approval":
        return "secondary";
      case "sent_to_vendor":
        return "outline";
      case "acknowledged":
        return "outline";
      case "in_progress":
        return "secondary";
      default:
        return "outline";
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
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Active Purchase Orders</h1>
        </div>
        <Button onClick={() => navigate("/purchase-orders/create")}>
          Create PO
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold">
                  {filteredOrders.filter(po => po.status === 'pending_approval').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">
                  {filteredOrders.filter(po => po.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">$</div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  ${filteredOrders.reduce((sum, po) => sum + po.final_amount, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">#</div>
              <div>
                <p className="text-sm text-muted-foreground">Active Orders</p>
                <p className="text-2xl font-bold">{filteredOrders.length}</p>
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
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="sent_to_vendor">Sent to Vendor</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders List */}
      <div className="grid gap-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active purchase orders found.</p>
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
                        <span className="font-medium">Payment Terms:</span>{" "}
                        {order.payment_terms || "Not specified"}
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
                      onClick={() => navigate(`/purchase-orders/edit/${order.id}`)}
                    >
                      <Edit className="h-4 w-4" />
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

export default ActivePurchaseOrders;
