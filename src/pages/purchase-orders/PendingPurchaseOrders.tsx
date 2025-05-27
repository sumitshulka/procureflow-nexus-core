
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Edit, Send, Plus, Search } from "lucide-react";
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
  final_amount: number;
  currency: string;
  vendor_registrations: {
    company_name: string;
  };
}

const PendingPurchaseOrders = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

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
        .in("status", ["draft", "sent"])
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
      if (statusFilter === "pending") {
        filtered = filtered.filter((order) => order.status === "draft" || order.status === "sent");
      } else {
        filtered = filtered.filter((order) => order.status === statusFilter);
      }
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "sent":
        return "default";
      case "acknowledged":
        return "outline";
      case "in_progress":
        return "default";
      case "delivered":
        return "default";
      case "completed":
        return "default";
      case "canceled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const handleSendPO = async (poId: string) => {
    try {
      const { error } = await supabase
        .from("purchase_orders")
        .update({ status: "sent" })
        .eq("id", poId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Purchase order sent successfully",
      });

      fetchPurchaseOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send purchase order",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pending Purchase Orders</h1>
        <Button onClick={() => navigate("/purchase-orders/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Create PO
        </Button>
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
                <SelectItem value="pending">Pending (Draft/Sent)</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
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
              <p className="text-muted-foreground">No purchase orders found matching your criteria.</p>
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
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
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
                        <span className="font-medium">Expected Delivery:</span>{" "}
                        {order.expected_delivery_date 
                          ? format(new Date(order.expected_delivery_date), "PPP")
                          : "Not specified"
                        }
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>{" "}
                        {format(new Date(order.created_at), "PPP")}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>{" "}
                        <Badge variant={getStatusBadgeVariant(order.status)} className="ml-1">
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
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
                    {order.status === "draft" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/purchase-orders/edit/${order.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSendPO(order.id)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send
                        </Button>
                      </>
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

export default PendingPurchaseOrders;
