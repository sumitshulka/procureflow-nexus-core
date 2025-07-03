import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Calendar, 
  Package,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Download,
  DollarSign,
  TruckIcon,
} from 'lucide-react';
import VendorLayout from '@/components/layout/VendorLayout';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const VendorPurchaseOrders = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch purchase orders for this vendor
  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ["vendor_purchase_orders_detailed", user?.id, statusFilter],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get vendor registration to find vendor ID
      const { data: vendorReg, error: vendorError } = await supabase
        .from("vendor_registrations")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (vendorError) throw vendorError;
      if (!vendorReg) return [];
      
      // Get purchase orders for this vendor
      const { data: pos, error: poError } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          purchase_order_items(*)
        `)
        .eq("vendor_id", vendorReg.id)
        .order("created_at", { ascending: false });
      
      if (poError) throw poError;
      
      return pos || [];
    },
    enabled: !!user?.id,
  });

  const filteredPOs = purchaseOrders?.filter(po => {
    const matchesSearch = searchTerm === '' || 
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100"><AlertCircle className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'acknowledged':
        return <Badge className="bg-yellow-100 text-yellow-800"><CheckCircle className="w-3 h-3 mr-1" />Acknowledged</Badge>;
      case 'in_progress':
        return <Badge className="bg-orange-100 text-orange-800"><Package className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800"><TruckIcon className="w-3 h-3 mr-1" />Delivered</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTotalStats = () => {
    const stats = {
      total: purchaseOrders?.length || 0,
      totalValue: purchaseOrders?.reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0,
      active: purchaseOrders?.filter(po => ['sent', 'acknowledged', 'in_progress'].includes(po.status)).length || 0,
      completed: purchaseOrders?.filter(po => po.status === 'completed').length || 0,
    };
    return stats;
  };

  const stats = getTotalStats();

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage your purchase orders and delivery status</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-xl font-bold">${stats.totalValue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Orders</p>
                  <p className="text-xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-xl font-bold">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by PO number or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Orders List */}
        {isLoading ? (
          <div className="text-center py-8">Loading purchase orders...</div>
        ) : filteredPOs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Purchase Orders Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No purchase orders match your current filters.' 
                  : 'You have no purchase orders yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPOs.map((po) => (
              <Card key={po.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" />
                        {po.po_number}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {po.description || 'No description provided'}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(po.status)}
                      <span className="text-lg font-bold text-green-600">
                        ${po.total_amount?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">PO Date</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(po.po_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expected Delivery</p>
                      <p className="font-medium">
                        {po.expected_delivery_date 
                          ? format(new Date(po.expected_delivery_date), 'MMM dd, yyyy')
                          : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Items</p>
                      <p className="font-medium flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        {po.purchase_order_items?.length || 0} items
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Currency</p>
                      <p className="font-medium">{po.currency || 'USD'}</p>
                    </div>
                  </div>

                  {/* Items Preview */}
                  {po.purchase_order_items && po.purchase_order_items.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Items:</p>
                      <div className="bg-accent rounded-lg p-3">
                        {po.purchase_order_items.slice(0, 3).map((item: any, index: number) => (
                          <div key={item.id || index} className="flex justify-between items-center py-1">
                            <span className="text-sm">{item.description || 'Item'}</span>
                            <span className="text-sm font-medium">
                              {item.quantity} × ${item.unit_price?.toLocaleString() || '0'}
                            </span>
                          </div>
                        ))}
                        {po.purchase_order_items.length > 3 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            +{po.purchase_order_items.length - 3} more items
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                    {po.status === 'sent' && (
                      <Button size="sm">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Acknowledge
                      </Button>
                    )}
                    {['acknowledged', 'in_progress'].includes(po.status) && (
                      <Button size="sm">
                        <TruckIcon className="w-4 h-4 mr-2" />
                        Update Status
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </VendorLayout>
  );
};

export default VendorPurchaseOrders;