import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileText, CheckCircle, XCircle, AlertTriangle, DollarSign } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { formatCurrencyAmount, amountToWords } from "@/utils/numberFormatting";

const VendorInvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: invoice, isLoading, error: invoiceError } = useQuery({
    queryKey: ["vendor-invoice", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          vendor:vendor_registrations(id, company_name, billing_address, gst_number, pan_number),
          purchase_order:purchase_orders(po_number, po_date),
          invoice_items(*, product:products(name))
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: organizationSettings } = useQuery({
    queryKey: ["organization_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; className?: string }> = {
      draft: { variant: "outline", icon: FileText },
      submitted: { variant: "secondary", icon: FileText },
      under_approval: { variant: "default", icon: FileText },
      pending_approval: { variant: "default", icon: FileText },
      approved: { variant: "default", icon: CheckCircle, className: "bg-green-500" },
      rejected: { variant: "destructive", icon: XCircle },
      disputed: { variant: "destructive", icon: AlertTriangle },
      paid: { variant: "default", icon: DollarSign, className: "bg-blue-500" },
    };

    const config = variants[status] || variants.submitted;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className || ""}`}>
        <Icon className="h-3 w-3" />
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto py-6">
        <Card className="p-8 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <div>
            <p className="text-lg font-semibold">Invoice Not Found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {invoiceError ? "You don't have permission to view this invoice or it doesn't exist." : "This invoice could not be loaded."}
            </p>
          </div>
          <Button onClick={() => navigate("/vendor/invoices")} variant="outline">
            Back to Invoices
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/vendor/invoices")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={`Invoice ${invoice.invoice_number}`}
          description={`Invoice from ${invoice.vendor?.company_name}`}
        />
      </div>

      {/* Professional Invoice Display */}
      <Card className="print:shadow-none">
        <CardContent className="p-8 space-y-8">
          {/* Invoice Header */}
          <div className="flex justify-between items-start border-b-2 border-border pb-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-primary">INVOICE</h1>
              <div className="text-sm space-y-1">
                <p className="font-semibold">Invoice #: {invoice.invoice_number}</p>
                <p>Date: {new Date(invoice.invoice_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                {invoice.due_date && (
                  <p>Due Date: {new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                )}
                {invoice.purchase_order?.po_number && (
                  <p>PO #: {invoice.purchase_order.po_number}</p>
                )}
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="inline-block">
                {getStatusBadge(invoice.status)}
              </div>
              {invoice.is_non_po_invoice && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">Non-PO Invoice</Badge>
                </div>
              )}
            </div>
          </div>

          {/* From/To Section */}
          <div className="grid grid-cols-2 gap-8">
            {/* Vendor (From) */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">From</h3>
              <div className="space-y-1">
                <p className="font-bold text-lg">{invoice.vendor?.company_name}</p>
                {(() => {
                  const address = invoice.vendor?.billing_address;
                  if (typeof address === 'string') {
                    const parsed = JSON.parse(address || '{}');
                    return (
                      <>
                        {parsed.street && <p className="text-sm">{parsed.street}</p>}
                        {(parsed.city || parsed.state || parsed.postal_code) && (
                          <p className="text-sm">
                            {[parsed.city, parsed.state, parsed.postal_code].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {parsed.country && <p className="text-sm">{parsed.country}</p>}
                      </>
                    );
                  }
                  return null;
                })()}
                {invoice.vendor?.gst_number && (
                  <p className="text-sm"><span className="font-medium">GST:</span> {invoice.vendor.gst_number}</p>
                )}
                {invoice.vendor?.pan_number && (
                  <p className="text-sm"><span className="font-medium">PAN:</span> {invoice.vendor.pan_number}</p>
                )}
              </div>
            </div>

            {/* Organization (To) */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Bill To</h3>
              <div className="space-y-1">
                <p className="font-bold text-lg">{organizationSettings?.organization_name || "Organization"}</p>
                <p className="text-sm text-muted-foreground">Organization Details</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Items</h3>
            <Table>
              <TableHeader>
                <TableRow className="border-t-2 border-border">
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="text-center font-semibold">Quantity</TableHead>
                  <TableHead className="text-right font-semibold">Unit Price</TableHead>
                  <TableHead className="text-right font-semibold">Tax Rate</TableHead>
                  <TableHead className="text-right font-semibold">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.invoice_items?.map((item: any, index: number) => {
                  return (
                    <TableRow key={item.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.description}</p>
                          {item.product?.name && (
                            <p className="text-xs text-muted-foreground">Product: {item.product.name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyAmount(item.unit_price, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.tax_rate ? `${item.tax_rate}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrencyAmount(item.final_amount, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex justify-between text-sm border-t pt-3">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrencyAmount(invoice.subtotal_amount, invoice.currency)}</span>
              </div>
              
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="font-medium text-destructive">-{formatCurrencyAmount(invoice.discount_amount, invoice.currency)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax:</span>
                <span className="font-medium">{formatCurrencyAmount(invoice.tax_amount, invoice.currency)}</span>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex justify-between items-center bg-primary/5 p-3 rounded-lg">
                <span className="text-lg font-bold">Total Amount:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrencyAmount(invoice.total_amount, invoice.currency)}
                </span>
              </div>
              
              {invoice.total_amount && (
                <p className="text-xs text-muted-foreground italic text-right">
                  Amount in words: {amountToWords(invoice.total_amount, invoice.currency)}
                </p>
              )}
            </div>
          </div>

          {/* Terms and Signatory */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t">
            {/* Terms */}
            <div>
              {invoice.terms_and_conditions && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Terms & Conditions</h3>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{invoice.terms_and_conditions}</p>
                </div>
              )}
              {invoice.notes && (
                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-semibold">Notes</h3>
                  <p className="text-xs text-muted-foreground">{invoice.notes}</p>
                </div>
              )}
            </div>

            {/* Authorized Signatory */}
            {invoice.signatory_name && (
              <div className="text-right">
                <div className="inline-block text-left">
                  <h3 className="text-sm font-semibold mb-4">Authorized Signatory</h3>
                  <div className="border-t-2 border-foreground pt-2 mt-16 min-w-[200px]">
                    <p className="font-semibold">{invoice.signatory_name}</p>
                    {invoice.signatory_designation && (
                      <p className="text-sm text-muted-foreground">{invoice.signatory_designation}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Information (if paid) */}
          {invoice.status === 'paid' && invoice.payment_method && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">Payment Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Method:</span>
                  <span className="ml-2 font-medium">{invoice.payment_method}</span>
                </div>
                {invoice.payment_reference && (
                  <div>
                    <span className="text-muted-foreground">Reference:</span>
                    <span className="ml-2 font-medium">{invoice.payment_reference}</span>
                  </div>
                )}
                {invoice.payment_date && (
                  <div>
                    <span className="text-muted-foreground">Paid On:</span>
                    <span className="ml-2 font-medium">
                      {new Date(invoice.payment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
              {invoice.payment_notes && (
                <p className="text-sm text-muted-foreground mt-2">{invoice.payment_notes}</p>
              )}
            </div>
          )}

          {/* Disputed/Rejected Information */}
          {invoice.status === 'disputed' && invoice.disputed_reason && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">Dispute Information</h3>
              <p className="text-sm text-muted-foreground">{invoice.disputed_reason}</p>
              {invoice.disputed_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Disputed on: {new Date(invoice.disputed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>
          )}

          {invoice.status === 'rejected' && invoice.rejected_reason && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">Rejection Information</h3>
              <p className="text-sm text-muted-foreground">{invoice.rejected_reason}</p>
              {invoice.corrective_action_required && (
                <div className="mt-2">
                  <p className="text-xs font-medium">Corrective Action Required:</p>
                  <p className="text-sm text-muted-foreground">{invoice.corrective_action_required}</p>
                </div>
              )}
              {invoice.rejected_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Rejected on: {new Date(invoice.rejected_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorInvoiceDetail;
