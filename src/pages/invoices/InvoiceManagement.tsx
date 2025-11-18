import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, DollarSign, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";


const InvoiceManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", statusFilter],
    queryFn: async () => {
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
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["invoice-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("status, total_amount");
      
      if (error) throw error;

      const submitted = data.filter(i => i.status === "submitted").length;
      const underApproval = data.filter(i => i.status === "under_approval").length;
      const approved = data.filter(i => i.status === "approved").length;
      const disputed = data.filter(i => i.status === "disputed").length;
      const totalValue = data.reduce((sum, i) => sum + Number(i.total_amount), 0);

      return { submitted, underApproval, approved, disputed, totalValue };
    },
  });

  const filteredInvoices = invoices?.filter(invoice =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.vendor?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="text-sm text-muted-foreground">Total Value</div>
          <div className="text-2xl font-bold">
            ${(stats?.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
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
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue />
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
          <Button onClick={() => navigate("/invoices/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
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
                        {invoice.currency} {Number(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  variant="outline"
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                >
                  View Details
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
