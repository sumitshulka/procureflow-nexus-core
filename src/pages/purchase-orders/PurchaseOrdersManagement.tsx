import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { usePOActions } from '@/hooks/usePOActions';
import { formatCurrencyAmount } from '@/utils/numberFormatting';
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
  Plus,
  Eye,
  X,
  ChevronsUpDown,
  Check,
  CalendarClock,
} from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { DateRange } from 'react-day-picker';
import PageHeader from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';

const PurchaseOrdersManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [poDateRange, setPoDateRange] = useState<DateRange | undefined>();
  const [deliveryDateRange, setDeliveryDateRange] = useState<DateRange | undefined>();
  
  // Applied filters state
  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: '',
    vendorFilter: 'all',
    poDateRange: undefined as DateRange | undefined,
    deliveryDateRange: undefined as DateRange | undefined,
  });

  const { generatePDF, sendEmail, isGeneratingPDF, isSendingEmail } = usePOActions();

  const { data: purchaseOrders, isLoading, refetch } = useQuery({
    queryKey: ["purchase_orders_management", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("purchase_orders")
        .select(`
          *,
          vendor:vendor_registrations(id, company_name, primary_email),
          purchase_order_items(*)
        `)
        .order("created_at", { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch vendors for filter
  const { data: vendors } = useQuery({
    queryKey: ["vendors-for-po-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_registrations")
        .select("id, company_name")
        .eq("status", "approved")
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const filteredPOs = useMemo(() => {
    return purchaseOrders?.filter(po => {
      const matchesSearch = appliedFilters.searchTerm === '' || 
        po.po_number.toLowerCase().includes(appliedFilters.searchTerm.toLowerCase()) ||
        po.vendor?.company_name?.toLowerCase().includes(appliedFilters.searchTerm.toLowerCase());
      
      const matchesVendor = appliedFilters.vendorFilter === 'all' || po.vendor_id === appliedFilters.vendorFilter;
      
      // PO date range filter
      let matchesPoDate = true;
      if (appliedFilters.poDateRange?.from) {
        const poDate = new Date(po.po_date);
        matchesPoDate = poDate >= appliedFilters.poDateRange.from;
        if (appliedFilters.poDateRange.to) {
          matchesPoDate = matchesPoDate && poDate <= appliedFilters.poDateRange.to;
        }
      }

      // Delivery date range filter
      let matchesDeliveryDate = true;
      if (appliedFilters.deliveryDateRange?.from && po.expected_delivery_date) {
        const deliveryDate = new Date(po.expected_delivery_date);
        matchesDeliveryDate = deliveryDate >= appliedFilters.deliveryDateRange.from;
        if (appliedFilters.deliveryDateRange.to) {
          matchesDeliveryDate = matchesDeliveryDate && deliveryDate <= appliedFilters.deliveryDateRange.to;
        }
      }
      
      return matchesSearch && matchesVendor && matchesPoDate && matchesDeliveryDate;
    }) || [];
  }, [purchaseOrders, appliedFilters]);

  const handleSearch = () => {
    setAppliedFilters({
      searchTerm,
      vendorFilter,
      poDateRange,
      deliveryDateRange,
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setVendorFilter('all');
    setPoDateRange(undefined);
    setDeliveryDateRange(undefined);
    setAppliedFilters({
      searchTerm: '',
      vendorFilter: 'all',
      poDateRange: undefined,
      deliveryDateRange: undefined,
    });
  };

  const hasActiveFilters = appliedFilters.searchTerm !== '' || appliedFilters.vendorFilter !== 'all' || appliedFilters.poDateRange || appliedFilters.deliveryDateRange;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100"><AlertCircle className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending Approval</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800"><Mail className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'acknowledged':
        return <Badge className="bg-purple-100 text-purple-800"><CheckCircle className="w-3 h-3 mr-1" />Acknowledged</Badge>;
      case 'in_progress':
        return <Badge className="bg-orange-100 text-orange-800"><Package className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'delivered':
        return <Badge className="bg-teal-100 text-teal-800"><TruckIcon className="w-3 h-3 mr-1" />Delivered</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDeliveryStatus = (po: any) => {
    if (!po.expected_delivery_date) return null;
    if (po.status === 'completed' || po.status === 'delivered') {
      return (
        <span className="text-green-600 flex items-center gap-1 text-sm">
          <CheckCircle className="h-3 w-3" />
          Delivered
        </span>
      );
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(po.expected_delivery_date);
    deliveryDate.setHours(0, 0, 0, 0);
    const daysUntilDelivery = differenceInDays(deliveryDate, today);
    
    if (daysUntilDelivery < 0) {
      return (
        <span className="text-destructive flex items-center gap-1 text-sm">
          <AlertCircle className="h-3 w-3" />
          {Math.abs(daysUntilDelivery)} day{Math.abs(daysUntilDelivery) !== 1 ? 's' : ''} overdue
        </span>
      );
    } else if (daysUntilDelivery === 0) {
      return (
        <span className="text-amber-600 flex items-center gap-1 text-sm">
          <CalendarClock className="h-3 w-3" />
          Due today
        </span>
      );
    } else if (daysUntilDelivery <= 7) {
      return (
        <span className="text-amber-600 flex items-center gap-1 text-sm">
          <CalendarClock className="h-3 w-3" />
          {daysUntilDelivery} day{daysUntilDelivery !== 1 ? 's' : ''} left
        </span>
      );
    } else {
      return (
        <span className="text-green-600 flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3" />
          {daysUntilDelivery} days left
        </span>
      );
    }
  };

  const stats = useMemo(() => ({
    total: purchaseOrders?.length || 0,
    draft: purchaseOrders?.filter(po => po.status === 'draft').length || 0,
    pending: purchaseOrders?.filter(po => po.status === 'pending_approval').length || 0,
    active: purchaseOrders?.filter(po => ['approved', 'sent', 'acknowledged', 'in_progress'].includes(po.status)).length || 0,
    completed: purchaseOrders?.filter(po => ['delivered', 'completed'].includes(po.status)).length || 0,
  }), [purchaseOrders]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Purchase Orders" 
          description="Manage all purchase orders and send to vendors"
        />
        <Button onClick={() => navigate('/purchase-orders/create')} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Create PO
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Draft</div>
          <div className="text-2xl font-bold">{stats.draft}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Pending Approval</div>
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Completed</div>
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-lg">Search & Filter Purchase Orders</h3>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by PO number or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full lg:w-[250px] justify-between"
              >
                {vendorFilter === "all"
                  ? "All Vendors"
                  : vendors?.find((v) => v.id === vendorFilter)?.company_name || "Select vendor..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0 bg-popover z-50" align="start">
              <Command>
                <CommandInput placeholder="Search vendor..." />
                <CommandList>
                  <CommandEmpty>No vendor found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => setVendorFilter("all")}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          vendorFilter === "all" ? "opacity-100" : "opacity-0"
                        )}
                      />
                      All Vendors
                    </CommandItem>
                    {vendors?.map((vendor) => (
                      <CommandItem
                        key={vendor.id}
                        value={vendor.company_name}
                        onSelect={() => setVendorFilter(vendor.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            vendorFilter === vendor.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {vendor.company_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">PO Date</span>
            <DatePickerWithRange
              date={poDateRange}
              onDateChange={setPoDateRange}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Expected Delivery</span>
            <DatePickerWithRange
              date={deliveryDateRange}
              onDateChange={setDeliveryDateRange}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Purchase Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </Card>
        ) : filteredPOs.length === 0 ? (
          <Card className="p-8 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Purchase Orders Found</h3>
            <p className="text-muted-foreground">
              {hasActiveFilters || statusFilter !== 'all'
                ? 'Try adjusting your filters' 
                : 'Create your first purchase order to get started'}
            </p>
          </Card>
        ) : (
          filteredPOs.map((po) => (
            <Card key={po.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{po.po_number}</h3>
                    {getStatusBadge(po.status)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Vendor:</span>
                      <p className="font-medium">{po.vendor?.company_name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PO Date:</span>
                      <p className="font-medium">{format(new Date(po.po_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="font-medium">{formatCurrencyAmount(po.final_amount || 0, po.currency)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Items:</span>
                      <p className="font-medium">{po.purchase_order_items?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Delivery Status:</span>
                      {po.expected_delivery_date ? (
                        getDeliveryStatus(po)
                      ) : (
                        <p className="font-medium text-muted-foreground">No date set</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => generatePDF(po.id)}
                    disabled={isGeneratingPDF}
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {po.status !== 'draft' && (
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={() => sendEmail(po.id)}
                      disabled={isSendingEmail}
                      title="Send to Vendor"
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    onClick={() => navigate(`/purchase-orders/${po.id}`)}
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PurchaseOrdersManagement;
