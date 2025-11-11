import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { usePOActions } from '@/hooks/usePOActions';
import { 
  ShoppingCart, 
  Search, 
  Download,
  Mail,
  DollarSign,
  TruckIcon,
  CheckCircle,
  AlertCircle,
  Clock,
  Package,
} from 'lucide-react';

import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/common/PageHeader';

const PurchaseOrdersManagement = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { generatePDF, sendEmail, isGeneratingPDF, isSendingEmail } = usePOActions();

  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ["purchase_orders_management", statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          vendor:vendor_registrations(company_name, primary_email),
          purchase_order_items(*)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const filteredPOs = purchaseOrders?.filter(po => {
    const matchesSearch = searchTerm === '' || 
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.vendor?.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    
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
      totalValue: purchaseOrders?.reduce((sum, po) => sum + (po.final_amount || 0), 0) || 0,
      active: purchaseOrders?.filter(po => ['sent', 'acknowledged', 'in_progress'].includes(po.status)).length || 0,
      completed: purchaseOrders?.filter(po => po.status === 'completed').length || 0,
    };
    return stats;
  };

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Purchase Orders Management" 
        description="Manage all purchase orders and send to vendors"
      />

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
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by PO number or vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
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
          <CardContent className="text-center py-8">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No Purchase Orders Found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Create your first purchase order to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPOs.map((po) => (
            <Card key={po.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{po.po_number}</h3>
                    <p className="text-sm text-muted-foreground">
                      Vendor: {po.vendor?.company_name || 'N/A'}
                    </p>
                  </div>
                  {getStatusBadge(po.status)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-semibold">{po.currency} {po.final_amount?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">PO Date</p>
                    <p className="font-semibold">{format(new Date(po.po_date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Delivery</p>
                    <p className="font-semibold">
                      {po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'MMM dd, yyyy') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Items</p>
                    <p className="font-semibold">{po.purchase_order_items?.length || 0}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => generatePDF(po.id)}
                    disabled={isGeneratingPDF}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isGeneratingPDF ? "Generating..." : "Download PDF"}
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => sendEmail(po.id)}
                    disabled={isSendingEmail || po.status === 'draft'}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {isSendingEmail ? "Sending..." : "Send to Vendor"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PurchaseOrdersManagement;
