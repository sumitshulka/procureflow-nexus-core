import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

interface ApprovalHistoryItem {
  id: string;
  approver_id: string;
  status: string;
  approved_at: string | null;
  rejected_at: string | null;
  comments: string | null;
  created_at: string;
  approver_name?: string;
  level_name?: string;
  level_number?: number;
}

interface POApprovalStatusProps {
  purchaseOrderId: string;
  onApprovalComplete?: () => void;
}

const POApprovalStatus: React.FC<POApprovalStatusProps> = ({ 
  purchaseOrderId,
  onApprovalComplete 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [comments, setComments] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchApprovalHistory();
  }, [purchaseOrderId]);

  const fetchApprovalHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("po_approval_history")
        .select(`
          *,
          profiles!po_approval_history_approver_id_fkey(full_name),
          po_approval_levels(level_name, level_number)
        `)
        .eq("purchase_order_id", purchaseOrderId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        ...item,
        approver_name: item.profiles?.full_name,
        level_name: item.po_approval_levels?.level_name,
        level_number: item.po_approval_levels?.level_number,
      }));

      setApprovalHistory(formatted);
    } catch (error: any) {
      console.error("Error fetching approval history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovalAction = async (action: "approved" | "rejected") => {
    if (!user) return;

    const pendingApproval = approvalHistory.find(
      (item) => item.approver_id === user.id && item.status === "pending"
    );

    if (!pendingApproval) {
      toast({
        title: "Error",
        description: "No pending approval found for your account",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const updateData: any = {
        status: action,
        comments,
      };

      if (action === "approved") {
        updateData.approved_at = new Date().toISOString();
      } else {
        updateData.rejected_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from("po_approval_history")
        .update(updateData)
        .eq("id", pendingApproval.id);

      if (updateError) throw updateError;

      // Check if all approvals in this level are complete
      const levelApprovals = approvalHistory.filter(
        (item) => item.level_number === pendingApproval.level_number
      );

      const allApproved = levelApprovals.every(
        (item) => 
          item.id === pendingApproval.id 
            ? action === "approved" 
            : item.status === "approved"
      );

      // Update PO status
      let poStatus = "pending_approval";
      let poApprovalStatus = "pending_approval";

      if (action === "rejected") {
        poStatus = "draft";
        poApprovalStatus = "rejected";
      } else if (allApproved) {
        poStatus = "approved";
        poApprovalStatus = "approved";
      }

      const { error: poError } = await supabase
        .from("purchase_orders")
        .update({
          status: poStatus,
          approval_status: poApprovalStatus,
        })
        .eq("id", purchaseOrderId);

      if (poError) throw poError;

      toast({
        title: "Success",
        description: `Purchase order ${action === "approved" ? "approved" : "rejected"} successfully`,
      });

      setComments("");
      fetchApprovalHistory();
      onApprovalComplete?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process approval",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const userCanApprove = approvalHistory.some(
    (item) => item.approver_id === user?.id && item.status === "pending"
  );

  if (approvalHistory.length === 0 && !isLoading) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Approval Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading approval history...</p>
        ) : (
          <div className="space-y-4">
            {/* Approval Timeline */}
            <div className="space-y-4">
              {approvalHistory.map((item, index) => (
                <div key={item.id} className="relative">
                  {index < approvalHistory.length - 1 && (
                    <div className="absolute left-5 top-10 h-8 w-0.5 bg-border" />
                  )}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(item.status)}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.approver_name}</span>
                          {item.level_name && (
                            <span className="text-sm text-muted-foreground">
                              • {item.level_name}
                            </span>
                          )}
                        </div>
                        {getStatusBadge(item.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {item.approved_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Approved: {format(new Date(item.approved_at), "PPp")}</span>
                          </div>
                        )}
                        {item.rejected_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Rejected: {format(new Date(item.rejected_at), "PPp")}</span>
                          </div>
                        )}
                        {item.status === "pending" && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Pending since: {format(new Date(item.created_at), "PPp")}</span>
                          </div>
                        )}
                      </div>
                      {item.comments && (
                        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
                          <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <p className="text-sm">{item.comments}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Approval Actions for Current User */}
            {userCanApprove && (
              <div className="border-t pt-4 mt-4 space-y-4">
                <div>
                  <Label htmlFor="comments">Comments</Label>
                  <Textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Add your comments (optional)..."
                    className="mt-2"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprovalAction("approved")}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleApprovalAction("rejected")}
                    disabled={isProcessing}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default POApprovalStatus;
