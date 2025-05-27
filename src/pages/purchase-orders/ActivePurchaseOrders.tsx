
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, CheckCircle, Search, Package } from "lucide-react";
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
  expected_delivery_date: string;
  actual_delivery_date: string;
  final_amount: number;
  currency: string;
  acknowledgment_date: string;
  vendor_registrations: {
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
  const [statusFilter, setStatusFilter] = useState("active");

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [purchaseOrders, searchTerm, statusFilter]);

  const fetchPurchaseOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          vendor_registrations:vendor_id (
            company_name
          )
        `)
        .in("status", ["acknowledged", "in_progress", "delivered", "completed"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPurchaseOrders(data || []);
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

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.vendor_registrations?.company_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter((order) => 
          ["acknowledged", "in_progress", "delivered"].includes(order.status)
        );
      } else {
        filtered = filtered.filter((order) => order.status === statusFilter);
      }
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "acknowledged":
        return "outline";
      case "in_progress":
        return "default";
      case "delivered":
        return "default";
      case "completed":
        return "default";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "acknowledged":
        return <CheckCircle className="h-4 w-4" />;
      case "in_progress":
        return <Package className="h-4 w-4" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handleMarkCompleted = async (poId: string) => {
    try {
      const { error } = await supabase
        .from("purchase_orders")
        .update({ 
          status: "completed",
          actual_delivery_date: new Date().toISOString()
        })
        .eq("id", poId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Purchase order marked as completed",
      });

      fetchPurchaseOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update purchase order",
        variant: "destructive",
      });
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case "acknowledged":
        return 25;
      case "in_progress":
        return 50;
      case "delivered":
        return 75;
      case "completed":
        return 100;
      default:
        return 0;
    }
  };

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Active Purchase Orders</h1>
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
                <SelectItem value="active">Active Orders</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Order List */}
      <div className="grid gap-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No active purchase orders found.</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-lg font-semibold">PO {order.po_number}</h3>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {order.status.replace("_", " ").charAt(0).toUpperCase() + 
                           order.status.replace("_", " ").slice(1)}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Vendor: {order.vendor_registrations?.company_name}
                    </p>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progress</span>
                        <span>{getProgressPercentage(order.status)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage(order.status)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Amount:</span>{" "}
                        {order.currency} {order.final_amount.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Expected Delivery:</span>{" "}
                        {order.expected_delivery_date 
                          ? format(new Date(order.expected_delivery_date), "PPP")
                          : "Not specified"
                        }
                      </div>
                      <div>
                        <span className="font-medium">Acknowledged:</span>{" "}
                        {order.acknowledgment_date 
                          ? format(new Date(order.acknowledgment_date), "PPP")
                          : "Not yet"
                        }
                      </div>
                      <div>
                        <span className="font-medium">Actual Delivery:</span>{" "}
                        {order.actual_delivery_date 
                          ? format(new Date(order.actual_delivery_date), "PPP")
                          : "Pending"
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
                    {order.status === "delivered" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleMarkCompleted(order.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete
                      </Button>
                    )}
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
