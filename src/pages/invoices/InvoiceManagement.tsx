import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, DollarSign, CheckCircle, XCircle, Clock, AlertTriangle, ArrowRight, Eye, X, ChevronsUpDown, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import { formatCurrencyAmount } from "@/utils/numberFormatting";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const InvoiceManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [invoiceDateRange, setInvoiceDateRange] = useState<DateRange | undefined>();
  const [dueDateRange, setDueDateRange] = useState<DateRange | undefined>();

  const { data: invoices, isLoading, refetch } = useQuery({
    queryKey: ["invoices", statusFilter],
    queryFn: async () => {
      // Debug: Check auth state
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Invoice query - Auth session:", session?.user?.id);
      
      let query = supabase
        .from("invoices")
        .select(`
          *,
          vendor:vendor_registrations(id, company_name),
          purchase_order:purchase_orders(po_number),
          invoice_items(*)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      console.log("Invoice query result:", { data, error, count: data?.length });
      if (error) {
        console.error("Invoice query error:", error);
        throw error;
      }
      return data;
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });

  // Refetch invoices when page becomes visible (after login)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch]);

  const { data: stats } = useQuery({
    queryKey: ["invoice-stats"],
    queryFn: async () => {
      // Fetch organization base currency
      const { data: orgSettings } = await supabase
        .from("organization_settings")
        .select("base_currency")
        .single();
      
      const baseCurrency = orgSettings?.base_currency || "USD";
      
      const { data, error } = await supabase
        .from("invoices")
        .select("status, total_amount, currency");
      
      if (error) throw error;

      const submitted = data.filter(i => i.status === "submitted").length;
      const underApproval = data.filter(i => i.status === "under_approval").length;
      const approved = data.filter(i => i.status === "approved").length;
      const disputed = data.filter(i => i.status === "disputed").length;
      
      // Group totals by currency
      const currencyTotals = data.reduce((acc, invoice) => {
        const currency = invoice.currency || baseCurrency;
        if (!acc[currency]) {
          acc[currency] = 0;
        }
        acc[currency] += Number(invoice.total_amount);
        return acc;
      }, {} as Record<string, number>);

      return { 
        submitted, 
        underApproval, 
        approved, 
        disputed, 
        currencyTotals,
        baseCurrency 
      };
    },
  });

  // Fetch vendors for filter dropdown
  const { data: vendors } = useQuery({
    queryKey: ["vendors-for-filter"],
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

  const filteredInvoices = useMemo(() => {
    return invoices?.filter(invoice => {
      // Text search filter
      const matchesSearch = searchTerm === "" ||
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.vendor?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Vendor filter
      const matchesVendor = vendorFilter === "all" || invoice.vendor_id === vendorFilter;

      // Invoice date range filter
      let matchesInvoiceDate = true;
      if (invoiceDateRange?.from) {
        const invoiceDate = new Date(invoice.invoice_date);
        matchesInvoiceDate = invoiceDate >= invoiceDateRange.from;
        if (invoiceDateRange.to) {
          matchesInvoiceDate = matchesInvoiceDate && invoiceDate <= invoiceDateRange.to;
        }
      }

      // Due date range filter
      let matchesDueDate = true;
      if (dueDateRange?.from && invoice.due_date) {
        const dueDate = new Date(invoice.due_date);
        matchesDueDate = dueDate >= dueDateRange.from;
        if (dueDateRange.to) {
          matchesDueDate = matchesDueDate && dueDate <= dueDateRange.to;
        }
      }

      return matchesSearch && matchesVendor && matchesInvoiceDate && matchesDueDate;
    });
  }, [invoices, searchTerm, vendorFilter, invoiceDateRange, dueDateRange]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setVendorFilter("all");
    setInvoiceDateRange(undefined);
    setDueDateRange(undefined);
  };

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || vendorFilter !== "all" || invoiceDateRange || dueDateRange;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      submitted: { variant: "secondary", icon: Clock },
      under_approval: { variant: "default", icon: Clock },
      approved: { variant: "default", icon: CheckCircle },
      rejected: { variant: "destructive", icon: XCircle },
      disputed: { variant: "destructive", icon: AlertTriangle },
      paid: { variant: "default", icon: DollarSign },
    };

    const config = variants[status] || variants.submitted;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Invoice Management"
        description="Manage vendor invoices and payment processing"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Submitted</div>
          <div className="text-2xl font-bold">{stats?.submitted || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Under Approval</div>
          <div className="text-2xl font-bold">{stats?.underApproval || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Approved</div>
          <div className="text-2xl font-bold">{stats?.approved || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Disputed</div>
          <div className="text-2xl font-bold text-destructive">{stats?.disputed || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-2">Total Value</div>
          {stats?.currencyTotals && Object.keys(stats.currencyTotals).length > 0 ? (
            <div className="space-y-1">
              {Object.entries(stats.currencyTotals).map(([currency, amount]) => (
                <div key={currency} className="text-lg font-bold">
                  {formatCurrencyAmount(amount, currency)}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-2xl font-bold">-</div>
          )}
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="under_approval">Under Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="disputed">Disputed</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
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
          <Button onClick={() => navigate("/invoices/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Invoice Date</span>
            <DatePickerWithRange
              date={invoiceDateRange}
              onDateChange={setInvoiceDateRange}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Due Date</span>
            <DatePickerWithRange
              date={dueDateRange}
              onDateChange={setDueDateRange}
            />
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="lg:mt-5">
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Invoice List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </Card>
        ) : filteredInvoices && filteredInvoices.length > 0 ? (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{invoice.invoice_number}</h3>
                    {getStatusBadge(invoice.status)}
                    {invoice.is_non_po_invoice && (
                      <Badge variant="outline">Non-PO Invoice</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Vendor:</span>
                      <p className="font-medium">{invoice.vendor?.company_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Invoice Date:</span>
                      <p className="font-medium">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="font-medium">
                        {formatCurrencyAmount(Number(invoice.total_amount), invoice.currency)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PO Number:</span>
                      <p className="font-medium">{invoice.purchase_order?.po_number || "N/A"}</p>
                    </div>
                  </div>
                  {invoice.disputed_reason && (
                    <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                      <p className="text-sm text-destructive font-medium">Dispute Reason:</p>
                      <p className="text-sm mt-1">{invoice.disputed_reason}</p>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                  className="group relative overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <Eye className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
                  <span className="font-medium">View Details</span>
                  <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No invoices found</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default InvoiceManagement;
