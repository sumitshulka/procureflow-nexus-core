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
import { formatCurrencyAmount, amountToWords } from "@/utils/numberFormatting";

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

  const { data: invoice, isLoading, error: invoiceError } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          vendor:vendor_registrations(
            id, 
            company_name, 
            billing_address, 
            registered_address,
            business_address,
            gst_number, 
            pan_number
          ),
          purchase_order:purchase_orders(po_number, po_date),
          invoice_items(*, product:products(name)),
          invoice_approval_history(
            *,
            approver:profiles(full_name),
            approval_level:invoice_approval_levels(level_name)
          ),
          created_by_user:profiles!invoices_created_by_fkey(full_name)
        `)
        .eq("id", id)
        .maybeSingle();

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

  const { data: approvalLevels } = useQuery({
    queryKey: ["invoice-approval-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_approval_levels")
        .select("id")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Check if current user can approve this invoice via approval matrix
  const { data: canApproveViaMatrix } = useQuery({
    queryKey: ["invoice-can-approve", id, user?.id],
    queryFn: async () => {
      if (!user?.id || !invoice?.current_approval_level) return false;
      
      // Check if user is assigned as approver for the current level
      const { data: matrixEntry, error } = await supabase
        .from("invoice_approval_matrix")
        .select("id, approver_user_id, approver_role")
        .eq("is_active", true)
        .eq("approval_level_id", invoice.current_approval_level.toString())
        .maybeSingle();
      
      if (error || !matrixEntry) return false;
      
      // Check if user matches the approver or has the required role
      if (matrixEntry.approver_user_id === user.id) return true;
      if (matrixEntry.approver_role && userRoles?.includes(matrixEntry.approver_role)) return true;
      
      return false;
    },
    enabled: !!user?.id && !!invoice?.current_approval_level && invoice?.status === 'pending_approval',
  });

  const hasApprovalLevels = approvalLevels && approvalLevels.length > 0;

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
      // Check if approval levels are configured
      if (!hasApprovalLevels) {
        throw new Error("No approval levels configured");
      }
      
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
    onError: (error: any) => {
      if (error.message === "No approval levels configured") {
        toast({
          title: "Configuration Required",
          description: "Please configure invoice approval levels in Settings before submitting for approval.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to submit for approval",
          variant: "destructive",
        });
      }
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      // Find pending approval for current user in history
      const pendingApproval = invoice?.invoice_approval_history?.find(
        (h: any) => h.approver_id === user?.id && h.status === "pending"
      );

      if (pendingApproval) {
        // Update existing approval history entry
        const { error } = await supabase
          .from("invoice_approval_history")
          .update({
            status: "approved",
            approved_at: new Date().toISOString(),
            comments: approvalComments,
          })
          .eq("id", pendingApproval.id);

        if (error) throw error;
      } else if (canApproveViaMatrix) {
        // Create a new approval history entry for matrix-based approval
        const { data: currentLevel } = await supabase
          .from("invoice_approval_levels")
          .select("id")
          .eq("level_number", invoice?.current_approval_level)
          .eq("is_active", true)
          .maybeSingle();
        
        if (currentLevel) {
          const { error } = await supabase
            .from("invoice_approval_history")
            .insert({
              invoice_id: id,
              approver_id: user?.id,
              approval_level_id: currentLevel.id,
              status: "approved",
              approved_at: new Date().toISOString(),
              comments: approvalComments,
            });

          if (error) throw error;
        }
      } else {
        throw new Error("You are not authorized to approve this invoice");
      }

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
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      setApprovalComments("");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to approve invoice",
        variant: "destructive"
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const pendingApproval = invoice?.invoice_approval_history?.find(
        (h: any) => h.approver_id === user?.id && h.status === "pending"
      );

      if (pendingApproval) {
        const { error } = await supabase
          .from("invoice_approval_history")
          .update({
            status: "rejected",
            rejected_at: new Date().toISOString(),
            comments: rejectReason,
          })
          .eq("id", pendingApproval.id);

        if (error) throw error;
      } else if (canApproveViaMatrix) {
        // Create a new rejection entry for matrix-based approval
        const { data: currentLevel } = await supabase
          .from("invoice_approval_levels")
          .select("id")
          .eq("level_number", invoice?.current_approval_level)
          .eq("is_active", true)
          .maybeSingle();
        
        if (currentLevel) {
          const { error } = await supabase
            .from("invoice_approval_history")
            .insert({
              invoice_id: id,
              approver_id: user?.id,
              approval_level_id: currentLevel.id,
              status: "rejected",
              rejected_at: new Date().toISOString(),
              comments: rejectReason,
            });

          if (error) throw error;
        }
      } else {
        throw new Error("You are not authorized to reject this invoice");
      }

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
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      setRejectReason("");
      setCorrectiveAction("");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to reject invoice",
        variant: "destructive"
      });
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

  const hasPendingApprovalInHistory = invoice?.invoice_approval_history?.some(
    (h: any) => h.approver_id === user?.id && h.status === "pending"
  );
  
  // Show approval banner if user has pending approval in history OR can approve via matrix
  const hasPendingApproval = hasPendingApprovalInHistory || 
    (canApproveViaMatrix && invoice?.status === 'pending_approval');

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
          <Button onClick={() => navigate("/invoices")} variant="outline">
            Back to Invoices
          </Button>
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
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={`Invoice ${invoice.invoice_number}`}
          description={`Invoice from ${invoice.vendor?.company_name}`}
        />
      </div>

      {/* Pending Approval Banner for Approvers */}
      {hasPendingApproval && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Approval Required</h3>
                  <p className="text-sm text-muted-foreground">This invoice is awaiting your approval</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive/10">
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
                          placeholder="Explain why you're rejecting this invoice..."
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
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons for Admin */}
      {isAdmin && (invoice.status === "submitted" || invoice.status === "approved") && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2 justify-end">
              {invoice.status === "submitted" && (
                <>
                  {!hasApprovalLevels ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Send className="h-4 w-4 mr-2" />
                          Submit for Approval
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Approval Levels Not Configured</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div className="flex-1 space-y-2">
                              <p className="text-sm font-medium text-yellow-900">
                                No Invoice Approval Levels Found
                              </p>
                              <p className="text-sm text-yellow-700">
                                You need to configure at least one invoice approval level before submitting invoices for approval.
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => navigate("/settings#invoice-approvals")}
                            className="w-full"
                          >
                            Go to Invoice Approval Settings
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Send className="h-4 w-4 mr-2" />
                          Submit for Approval
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Submit Invoice for Approval</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <p className="text-sm text-muted-foreground">
                            This will initiate the approval workflow for this invoice.
                          </p>
                          <Button
                            onClick={() => submitForApprovalMutation.mutate()}
                            disabled={submitForApprovalMutation.isPending}
                            className="w-full"
                          >
                            Submit for Approval
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

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
                          Dispute Invoice
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {invoice.status === "approved" && (
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
                            <SelectItem value="online">Online Payment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Reference *</Label>
                        <Input
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="Transaction/Check number"
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
          </CardContent>
        </Card>
      )}

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
                  const parseAddress = (addr: any) => {
                    if (!addr) return null;
                    if (typeof addr === 'string') {
                      try {
                        return JSON.parse(addr);
                      } catch {
                        return null;
                      }
                    }
                    return addr;
                  };

                  const billingAddr = parseAddress(invoice.vendor?.billing_address);
                  const registeredAddr = parseAddress(invoice.vendor?.registered_address);
                  
                  // Use billing address first, fallback to registered address
                  const address = billingAddr || registeredAddr;
                  
                  if (address) {
                    return (
                      <>
                        {address.street && <p className="text-sm">{address.street}</p>}
                        {(address.city || address.state || address.postal_code) && (
                          <p className="text-sm">
                            {[address.city, address.state, address.postal_code].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {address.country && <p className="text-sm">{address.country}</p>}
                      </>
                    );
                  }
                  return null;
                })()}
                {invoice.vendor?.gst_number && (
                  <p className="text-sm mt-2"><span className="font-medium">GST:</span> {invoice.vendor.gst_number}</p>
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
                <p className="font-bold text-lg">{organizationSettings?.organization_name || "Organization Name"}</p>
                <p className="text-sm text-muted-foreground">
                  {invoice.created_by_user?.full_name && `Created by: ${invoice.created_by_user.full_name}`}
                </p>
              </div>
            </div>
          </div>

          {/* Alerts/Notices */}
          {(invoice.disputed_reason || invoice.rejected_reason || invoice.is_non_po_invoice && invoice.non_po_justification) && (
            <div className="space-y-3">
              {invoice.disputed_reason && (
                <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded">
                  <p className="text-sm font-semibold text-destructive mb-1">Dispute Reason</p>
                  <p className="text-sm">{invoice.disputed_reason}</p>
                </div>
              )}
              
              {invoice.rejected_reason && (
                <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-destructive">Rejection Reason</p>
                    <p className="text-sm">{invoice.rejected_reason}</p>
                  </div>
                  {invoice.corrective_action_required && (
                    <div>
                      <p className="text-sm font-semibold text-destructive">Corrective Action Required</p>
                      <p className="text-sm">{invoice.corrective_action_required}</p>
                    </div>
                  )}
                </div>
              )}
              
              {invoice.is_non_po_invoice && invoice.non_po_justification && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded">
                  <p className="text-sm font-semibold mb-1">Non-PO Invoice Justification</p>
                  <p className="text-sm">{invoice.non_po_justification}</p>
                </div>
              )}
            </div>
          )}

          {/* Line Items Table */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Line Items</h3>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold w-16">S.No</TableHead>
                  <TableHead className="font-bold">Item/Description</TableHead>
                  <TableHead className="text-right font-bold">Qty</TableHead>
                  <TableHead className="text-right font-bold">Unit Price</TableHead>
                  <TableHead className="text-right font-bold">Item Value</TableHead>
                  <TableHead className="text-right font-bold">Tax</TableHead>
                  <TableHead className="text-right font-bold">Discount</TableHead>
                  <TableHead className="text-right font-bold">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.invoice_items?.map((item: any, index: number) => {
                  const itemValue = item.quantity * item.unit_price;
                  return (
                    <TableRow key={item.id} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.description}</p>
                          {item.product?.name && (
                            <p className="text-xs text-muted-foreground">Product: {item.product.name}</p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground italic">{item.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyAmount(item.unit_price, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyAmount(itemValue, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.tax_amount ? formatCurrencyAmount(item.tax_amount, invoice.currency) : '-'}
                        {item.tax_rate > 0 && <span className="text-xs text-muted-foreground block">({item.tax_rate}%)</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.discount_amount ? formatCurrencyAmount(item.discount_amount, invoice.currency) : '-'}
                        {item.discount_rate > 0 && <span className="text-xs text-muted-foreground block">({item.discount_rate}%)</span>}
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
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Method:</span>
                  <p className="font-medium capitalize">{invoice.payment_method.replace('_', ' ')}</p>
                </div>
                {invoice.payment_reference && (
                  <div>
                    <span className="text-muted-foreground">Reference:</span>
                    <p className="font-medium">{invoice.payment_reference}</p>
                  </div>
                )}
                {invoice.payment_date && (
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p className="font-medium">{new Date(invoice.payment_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              {invoice.payment_notes && (
                <p className="text-xs text-muted-foreground mt-2">{invoice.payment_notes}</p>
              )}
            </div>
          )}

          {/* Invoice Audit Control Information */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold mb-4">Invoice Audit Control</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Created By</p>
                <p className="font-medium">{invoice.created_by_user?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Creation Date</p>
                <p className="font-medium">{new Date(invoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{invoice.status.replace('_', ' ')}</p>
              </div>
              {invoice.approval_status && (
                <div>
                  <p className="text-muted-foreground">Approval Status</p>
                  <p className="font-medium capitalize">{invoice.approval_status.replace('_', ' ')}</p>
                </div>
              )}
              {invoice.submitted_for_approval_at && (
                <div>
                  <p className="text-muted-foreground">Submitted for Approval</p>
                  <p className="font-medium">{new Date(invoice.submitted_for_approval_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                </div>
              )}
              {invoice.payment_date && (
                <div>
                  <p className="text-muted-foreground">Payment Date</p>
                  <p className="font-medium">{new Date(invoice.payment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                </div>
              )}
              {invoice.disputed_at && (
                <div>
                  <p className="text-muted-foreground">Disputed At</p>
                  <p className="font-medium">{new Date(invoice.disputed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                </div>
              )}
              {invoice.rejected_at && (
                <div>
                  <p className="text-muted-foreground">Rejected At</p>
                  <p className="font-medium">{new Date(invoice.rejected_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
                      {history.approval_level?.level_name}
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
