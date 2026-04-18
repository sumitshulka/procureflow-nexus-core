import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Clock, AlertTriangle, Download, ShieldCheck } from "lucide-react";

interface Props {
  vendorId: string;
}

type Row = {
  policy_id: string;
  policy_title: string;
  category: string;
  vendor_requirement_type: string;
  vendor_requirement_mandatory: boolean;
  validity_months: number | null;
  submission_status: string;
  submitted_at: string | null;
  expires_at: string | null;
  document_url: string | null;
  declaration_accepted: boolean | null;
  reviewed_at: string | null;
  review_notes: string | null;
};

const VendorComplianceReview: React.FC<Props> = ({ vendorId }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<Row | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vendor_compliance_overview")
      .select("*")
      .eq("vendor_id", vendorId);
    if (error) toast.error("Failed to load compliance status", { description: error.message });
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  const downloadDoc = async (path: string) => {
    const { data, error } = await supabase.storage.from("vendor-compliance-docs").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Could not generate link");
    window.open(data.signedUrl, "_blank");
  };

  const decide = async (status: "approved" | "rejected") => {
    if (!reviewing) return;
    setBusy(true);
    try {
      const { data: sub } = await supabase
        .from("vendor_policy_submissions")
        .select("id")
        .eq("vendor_id", vendorId)
        .eq("policy_id", reviewing.policy_id)
        .maybeSingle();
      if (!sub?.id) {
        toast.error("Submission not found");
        return;
      }
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("vendor_policy_submissions")
        .update({
          status,
          reviewed_by: u.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        })
        .eq("id", sub.id);
      if (error) throw error;
      toast.success(`Submission ${status}`);
      setReviewing(null);
      setNotes("");
      void load();
    } catch (e: any) {
      toast.error("Action failed", { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const badge = (r: Row) => {
    const expired = r.expires_at && new Date(r.expires_at) <= new Date();
    if (r.submission_status === "approved" && !expired)
      return <Badge className="gap-1 bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>;
    if (r.submission_status === "approved" && expired)
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Expired</Badge>;
    if (r.submission_status === "submitted")
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending review</Badge>;
    if (r.submission_status === "rejected")
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
    return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Not submitted</Badge>;
  };

  const totalMand = rows.filter((r) => r.vendor_requirement_mandatory).length;
  const okMand = rows.filter(
    (r) => r.vendor_requirement_mandatory && r.submission_status === "approved" && (!r.expires_at || new Date(r.expires_at) > new Date()),
  ).length;
  const compliant = totalMand > 0 && okMand === totalMand;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Overall vendor compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {compliant ? (
              <Badge className="bg-green-600 hover:bg-green-700">Compliant</Badge>
            ) : (
              <Badge variant="destructive">Non-compliant</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {okMand} of {totalMand} mandatory policies approved & valid
            </span>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No vendor-facing policies are currently active.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.policy_id} className="border rounded-md p-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    {r.policy_title}
                    {r.vendor_requirement_mandatory && (
                      <Badge variant="outline" className="text-[10px]">Mandatory</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{r.category}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.submitted_at && <>Submitted: {format(new Date(r.submitted_at), "PP")} · </>}
                    {r.expires_at && <>Expires: {format(new Date(r.expires_at), "PP")}</>}
                  </div>
                  {r.review_notes && (
                    <div className="text-xs italic mt-1">Notes: {r.review_notes}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {badge(r)}
                  <div className="flex gap-1">
                    {r.document_url && (
                      <Button size="sm" variant="outline" onClick={() => downloadDoc(r.document_url!)}>
                        <Download className="h-3 w-3 mr-1" /> View
                      </Button>
                    )}
                    {r.submission_status === "submitted" && (
                      <Button size="sm" onClick={() => { setReviewing(r); setNotes(""); }}>
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review: {reviewing?.policy_title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              placeholder="Reviewer notes (optional, shown to vendor on rejection)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => decide("rejected")} disabled={busy}>
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button onClick={() => decide("approved")} disabled={busy} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorComplianceReview;
