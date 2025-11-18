import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, FileText, AlertTriangle, CheckCircle, XCircle, 
  DollarSign, Send, Ban 
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { useState } from "react";

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [disputeReason, setDisputeReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [approvalComments, setApprovalComments] = useState("");

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          vendor:vendor_registrations(id, company_name),
          purchase_order:purchase_orders(po_number, po_date),
          invoice_items(*),
          invoice_approval_history(
            *,
            approver:profiles(full_name, email),
            approval_level:invoice_approval_levels(level_name)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data.map(r => r.role);
    },
  });

  const isAdmin = userRoles?.includes("admin") || userRoles?.includes("finance_officer");

  const disputeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "disputed",
          disputed_reason: disputeReason,
          disputed_by: user?.id,
          disputed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Invoice disputed successfully" });
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      setDisputeReason("");
    },
  });

  const submitForApprovalMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("initiate_invoice_approval", {
        p_invoice_id: id,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.message);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Invoice submitted for approval" });
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      // Find pending approval for current user
      const pendingApproval = invoice?.invoice_approval_history?.find(
        (h: any) => h.approver_id === user?.id && h.status === "pending"
      );

      if (!pendingApproval) throw new Error("No pending approval found");

      const { error } = await supabase
        .from("invoice_approval_history")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          comments: approvalComments,
        })
        .eq("id", pendingApproval.id);

      if (error) throw error;

      // Update invoice status to approved
      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({
          status: "approved",
          approval_status: "approved",
        })
        .eq("id", id);

      if (invoiceError) throw invoiceError;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Invoice approved successfully" });
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      setApprovalComments("");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const pendingApproval = invoice?.invoice_approval_history?.find(
        (h: any) => h.approver_id === user?.id && h.status === "pending"
      );

      if (!pendingApproval) throw new Error("No pending approval found");

      const { error } = await supabase
        .from("invoice_approval_history")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
          comments: rejectReason,
        })
        .eq("id", pendingApproval.id);

      if (error) throw error;

      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({
          status: "rejected",
          rejected_reason: rejectReason,
          rejected_by: user?.id,
          rejected_at: new Date().toISOString(),
          corrective_action_required: correctiveAction,
        })
        .eq("id", id);

      if (invoiceError) throw invoiceError;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Invoice rejected" });
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      setRejectReason("");
      setCorrectiveAction("");
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          payment_date: new Date().toISOString(),
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          payment_notes: paymentNotes,
          paid_by: user?.id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Invoice marked as paid" });
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      setPaymentMethod("");
      setPaymentReference("");
      setPaymentNotes("");
    },
  });

  const hasPendingApproval = invoice?.invoice_approval_history?.some(
    (h: any) => h.approver_id === user?.id && h.status === "pending"
  );

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
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Invoice not found</p>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; className?: string }> = {
      submitted: { variant: "secondary", icon: FileText },
      under_approval: { variant: "default", icon: FileText },
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={`Invoice ${invoice.invoice_number}`}
          description={`Invoice from ${invoice.vendor?.company_name}`}
        />
      </div>

      {/* Status and Actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <CardTitle>Invoice Details</CardTitle>
              {getStatusBadge(invoice.status)}
              {invoice.is_non_po_invoice && (
                <Badge variant="outline">Non-PO Invoice</Badge>
              )}
            </div>
            <div className="flex gap-2">
              {isAdmin && invoice.status === "submitted" && (
                <>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Ban className="h-4 w-4 mr-2" />
                        Dispute
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Dispute Invoice</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Dispute Reason *</Label>
                          <Textarea
                            value={disputeReason}
                            onChange={(e) => setDisputeReason(e.target.value)}
                            placeholder="Explain why you're disputing this invoice..."
                          />
                        </div>
                        <Button
                          onClick={() => disputeMutation.mutate()}
                          disabled={!disputeReason || disputeMutation.isPending}
                          className="w-full"
                        >
                          Submit Dispute
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    size="sm"
                    onClick={() => submitForApprovalMutation.mutate()}
                    disabled={submitForApprovalMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit for Approval
                  </Button>
                </>
              )}

              {hasPendingApproval && (
                <>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reject Invoice</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Rejection Reason *</Label>
                          <Textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Explain why you're rejecting..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Corrective Action Required</Label>
                          <Textarea
                            value={correctiveAction}
                            onChange={(e) => setCorrectiveAction(e.target.value)}
                            placeholder="What needs to be corrected..."
                          />
                        </div>
                        <Button
                          onClick={() => rejectMutation.mutate()}
                          disabled={!rejectReason || rejectMutation.isPending}
                          className="w-full"
                        >
                          Reject Invoice
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Approve Invoice</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Comments (Optional)</Label>
                          <Textarea
                            value={approvalComments}
                            onChange={(e) => setApprovalComments(e.target.value)}
                            placeholder="Add any comments..."
                          />
                        </div>
                        <Button
                          onClick={() => approveMutation.mutate()}
                          disabled={approveMutation.isPending}
                          className="w-full"
                        >
                          Approve Invoice
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {isAdmin && invoice.status === "approved" && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Mark Invoice as Paid</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Payment Method *</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Reference *</Label>
                        <Input
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="Transaction ID or reference number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          placeholder="Additional payment notes..."
                        />
                      </div>
                      <Button
                        onClick={() => markPaidMutation.mutate()}
                        disabled={!paymentMethod || !paymentReference || markPaidMutation.isPending}
                        className="w-full"
                      >
                        Confirm Payment
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Invoice Date</p>
              <p className="font-medium">
                {new Date(invoice.invoice_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="font-medium">
                {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">PO Number</p>
              <p className="font-medium">{invoice.purchase_order?.po_number || "N/A"}</p>
            </div>
          </div>

          {invoice.disputed_reason && (
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md">
              <p className="text-sm font-medium text-destructive mb-2">Dispute Reason:</p>
              <p className="text-sm">{invoice.disputed_reason}</p>
            </div>
          )}

          {invoice.rejected_reason && (
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md space-y-2">
              <div>
                <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                <p className="text-sm">{invoice.rejected_reason}</p>
              </div>
              {invoice.corrective_action_required && (
                <div>
                  <p className="text-sm font-medium text-destructive">Corrective Action Required:</p>
                  <p className="text-sm">{invoice.corrective_action_required}</p>
                </div>
              )}
            </div>
          )}

          {invoice.is_non_po_invoice && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md">
              <p className="text-sm font-medium mb-2">Non-PO Invoice Justification:</p>
              <p className="text-sm">{invoice.non_po_justification}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Items */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.invoice_items?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.description}</p>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground">{item.notes}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {invoice.currency} {Number(item.unit_price).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {invoice.currency} {Number(item.tax_amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {invoice.currency} {Number(item.discount_amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {invoice.currency} {Number(item.final_amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator className="my-4" />

          <div className="space-y-2 max-w-sm ml-auto">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-medium">
                {invoice.currency} {Number(invoice.subtotal_amount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Discount:</span>
              <span className="font-medium">
                -{invoice.currency} {Number(invoice.discount_amount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax:</span>
              <span className="font-medium">
                {invoice.currency} {Number(invoice.tax_amount).toFixed(2)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>
                {invoice.currency} {Number(invoice.total_amount).toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signatory */}
      {invoice.signatory_name && (
        <Card>
          <CardHeader>
            <CardTitle>Authorized Signatory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{invoice.signatory_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Designation</p>
                <p className="font-medium">{invoice.signatory_designation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval History */}
      {invoice.invoice_approval_history && invoice.invoice_approval_history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Approval History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoice.invoice_approval_history.map((history: any) => (
                <div key={history.id} className="flex items-start gap-4 border-l-2 border-muted pl-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{history.approver?.full_name}</p>
                      <Badge
                        variant={
                          history.status === "approved"
                            ? "default"
                            : history.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {history.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {history.approval_level?.level_name} • {history.approver?.email}
                    </p>
                    {history.comments && (
                      <p className="text-sm mt-2">{history.comments}</p>
                    )}
                    {(history.approved_at || history.rejected_at) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(history.approved_at || history.rejected_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InvoiceDetail;
