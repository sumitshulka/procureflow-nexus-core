import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  FileText, 
  Search, 
  Calendar, 
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Plus,
  DollarSign,
} from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/utils/currencyUtils';

const VendorInvoices = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch vendor's invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["vendor_invoices", user?.id, statusFilter],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get the vendor registration
      const { data: vendorReg, error: vendorError } = await supabase
        .from("vendor_registrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .single();
      
      if (vendorError || !vendorReg) {
        console.log("Vendor not found or not approved:", vendorError);
        return [];
      }
      
      // Get invoices for this vendor
      let query = supabase
        .from("invoices")
        .select(`
          *,
          purchase_orders:purchase_order_id (
            po_number
          )
        `)
        .eq("vendor_id", vendorReg.id)
        .order("created_at", { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq("status", statusFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!user?.id,
  });

  const filteredInvoices = invoices?.filter(invoice => {
    const matchesSearch = searchTerm === '' || 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline"><FileText className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Submitted</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending Approval</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'paid':
        return <Badge className="bg-green-600 text-white"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'disputed':
        return <Badge className="bg-orange-100 text-orange-800"><AlertCircle className="w-3 h-3 mr-1" />Disputed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Invoices</h1>
          <p className="text-muted-foreground">Manage and track your submitted invoices</p>
        </div>
        <Button onClick={() => navigate('/vendor/invoices/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invoices</CardDescription>
            <CardTitle className="text-2xl">{invoices?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Approval</CardDescription>
            <CardTitle className="text-2xl">
              {invoices?.filter(i => i.status === 'pending_approval').length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-2xl">
              {invoices?.filter(i => i.status === 'approved').length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid</CardDescription>
            <CardTitle className="text-2xl">
              {invoices?.filter(i => i.status === 'paid').length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <div className="space-y-4">
        {filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-lg font-semibold">No invoices found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'Create your first invoice to get started'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button 
                    className="mt-4"
                    onClick={() => navigate('/vendor/invoices/create')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">{invoice.invoice_number}</h3>
                      {getStatusBadge(invoice.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Date: {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}</span>
                      </div>
                      {invoice.due_date && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                      {invoice.purchase_orders && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>PO: {invoice.purchase_orders.po_number}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-semibold text-lg">
                        {formatCurrency(Number(invoice.total_amount), invoice.currency)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/vendor/invoices/${invoice.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
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

export default VendorInvoices;
