import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileText, Calendar, DollarSign, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/currencyUtils";

const VendorInvoiceDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ["vendor-invoice", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          vendor:vendor_registrations(id, company_name),
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "submitted":
      case "pending_approval":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1" /> Pending Approval
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case "paid":
        return (
          <Badge className="bg-green-600 text-white">
            <CheckCircle className="w-3 h-3 mr-1" /> Paid
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
      case "disputed":
        return (
          <Badge className="bg-orange-100 text-orange-800">
            <AlertCircle className="w-3 h-3 mr-1" /> Disputed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Unable to load invoice details.
          </CardContent>
        </Card>
      </div>
    );
  }

  const subtotal = Number(invoice.subtotal_amount || 0);
  const tax = Number(invoice.tax_amount || 0);
  const total = Number(invoice.total_amount || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/vendor/invoices")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Invoices
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-2xl">
                Invoice {invoice.invoice_number}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {invoice.vendor?.company_name || "Your organization"}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(invoice.status)}
            <div className="flex items-center gap-2 text-lg font-semibold">
              <DollarSign className="h-4 w-4" />
              <span>{formatCurrency(total, invoice.currency)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Invoice Date</p>
              <p className="font-medium">
                {invoice.invoice_date
                  ? format(new Date(invoice.invoice_date), "MMM dd, yyyy")
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Due Date</p>
              <p className="font-medium">
                {invoice.due_date
                  ? format(new Date(invoice.due_date), "MMM dd, yyyy")
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Purchase Order</p>
              <p className="font-medium">
                {invoice.purchase_order?.po_number || (invoice.is_non_po_invoice ? "Non-PO Invoice" : "-")}
              </p>
            </div>
          </div>

          {invoice.notes && (
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">Notes</p>
              <p className="whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

          <Separator className="my-4" />

          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" /> Line Items
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.invoice_items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.description}</div>
                      {item.product?.name && (
                        <div className="text-xs text-muted-foreground">
                          Product: {item.product.name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(item.unit_price), invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.tax_rate ? `${item.tax_rate}%` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(item.final_amount), invoice.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="w-full md:w-1/3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">
                  {formatCurrency(subtotal, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax:</span>
                <span className="font-medium">
                  {formatCurrency(tax, invoice.currency)}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total Amount:</span>
                <span className="font-bold">
                  {formatCurrency(total, invoice.currency)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorInvoiceDetail;
