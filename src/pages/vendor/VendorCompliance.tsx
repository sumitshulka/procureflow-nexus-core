import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { FileText, Upload, ShieldCheck, AlertTriangle, CheckCircle2, Clock, XCircle, Download } from "lucide-react";

const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB per doc

type Policy = {
  id: string;
  title: string;
  category: string;
  description: string;
  content: string;
  vendor_requirement_type: "none" | "document" | "declaration" | "both";
  vendor_requirement_mandatory: boolean;
  vendor_document_description: string | null;
  vendor_declaration_text: string | null;
  validity_months: number | null;
};

type Submission = {
  id?: string;
  policy_id: string;
  status: "pending" | "submitted" | "approved" | "rejected" | "expired";
  document_url: string | null;
  document_name: string | null;
  declaration_accepted: boolean | null;
  declaration_signed_by: string | null;
  submitted_at: string | null;
  expires_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
};

const VendorCompliance: React.FC = () => {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [signedBy, setSignedBy] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: vendor } = await supabase
        .from("vendor_registrations")
        .select("id, signatory_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!vendor) {
        setLoading(false);
        return;
      }
      setVendorId(vendor.id);
      setSignedBy(vendor.signatory_name || "");

      const [{ data: pol }, { data: subs }] = await Promise.all([
        supabase
          .from("compliance_policies")
          .select("id,title,category,description,content,vendor_requirement_type,vendor_requirement_mandatory,vendor_document_description,vendor_declaration_text,validity_months")
          .eq("status", "active")
          .neq("vendor_requirement_type", "none")
          .order("vendor_requirement_mandatory", { ascending: false })
          .order("title"),
        supabase
          .from("vendor_policy_submissions")
          .select("*")
          .eq("vendor_id", vendor.id),
      ]);

      setPolicies((pol as Policy[]) || []);
      const map: Record<string, Submission> = {};
      (subs || []).forEach((s: any) => (map[s.policy_id] = s));
      setSubmissions(map);
    } catch (e: any) {
      toast.error("Failed to load compliance policies", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const mandatory = policies.filter((p) => p.vendor_requirement_mandatory);
    const isApproved = (s?: Submission) =>
      !!s && s.status === "approved" && (!s.expires_at || new Date(s.expires_at) > new Date());
    const isUnderReview = (s?: Submission) => !!s && s.status === "submitted";
    const approvedAll = policies.filter((p) => isApproved(submissions[p.id]));
    const underReview = policies.filter((p) => isUnderReview(submissions[p.id]));
    const approvedMand = mandatory.filter((p) => isApproved(submissions[p.id])).length;
    return {
      total: policies.length,
      mandatory: mandatory.length,
      approved: approvedAll.length,
      underReview: underReview.length,
      pending: policies.length - approvedAll.length - underReview.length,
      pendingMandatory: mandatory.length - approvedMand - mandatory.filter((p) => isUnderReview(submissions[p.id])).length,
    };
  }, [policies, submissions]);

  const openSubmit = (p: Policy) => {
    const s = submissions[p.id];
    setActivePolicy(p);
    setAccepted(s?.declaration_accepted ?? false);
    setFile(null);
  };

  const handleSubmit = async () => {
    if (!activePolicy || !vendorId) return;
    const needsDoc = activePolicy.vendor_requirement_type === "document" || activePolicy.vendor_requirement_type === "both";
    const needsDecl = activePolicy.vendor_requirement_type === "declaration" || activePolicy.vendor_requirement_type === "both";

    if (needsDecl && (!accepted || !signedBy.trim())) {
      toast.error("Please accept the declaration and provide a signatory name.");
      return;
    }
    if (needsDoc && !file && !submissions[activePolicy.id]?.document_url) {
      toast.error("Please upload the required PDF document.");
      return;
    }
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are allowed.");
        return;
      }
      if (file.size > MAX_PDF_BYTES) {
        toast.error("Document exceeds 5MB limit.");
        return;
      }
    }

    setSubmitting(true);
    try {
      let document_url = submissions[activePolicy.id]?.document_url ?? null;
      let document_name = submissions[activePolicy.id]?.document_name ?? null;
      let document_size = null as number | null;

      if (file) {
        const path = `${vendorId}/${activePolicy.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("vendor-compliance-docs")
          .upload(path, file, { contentType: "application/pdf", upsert: false });
        if (upErr) throw upErr;
        document_url = path;
        document_name = file.name;
        document_size = file.size;
      }

      const expires_at = activePolicy.validity_months
        ? new Date(Date.now() + activePolicy.validity_months * 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const payload = {
        vendor_id: vendorId,
        policy_id: activePolicy.id,
        status: "submitted" as const,
        document_url,
        document_name,
        document_size,
        declaration_accepted: needsDecl ? accepted : null,
        declaration_accepted_at: needsDecl && accepted ? new Date().toISOString() : null,
        declaration_signed_by: needsDecl ? signedBy.trim() : null,
        submitted_at: new Date().toISOString(),
        expires_at,
      };

      const existing = submissions[activePolicy.id];
      const { error } = existing?.id
        ? await supabase.from("vendor_policy_submissions").update(payload).eq("id", existing.id)
        : await supabase.from("vendor_policy_submissions").insert(payload);
      if (error) throw error;

      toast.success("Submission saved", { description: "Awaiting admin review." });
      setActivePolicy(null);
      setFile(null);
      void load();
    } catch (e: any) {
      toast.error("Submission failed", { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadDoc = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("vendor-compliance-docs").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Could not generate download link");
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.target = "_blank";
    a.click();
  };

  const statusBadge = (s?: Submission) => {
    if (!s || s.status === "pending") return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Not submitted</Badge>;
    if (s.status === "submitted") return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Under review</Badge>;
    if (s.status === "approved") {
      const expired = s.expires_at && new Date(s.expires_at) <= new Date();
      return expired
        ? <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Expired</Badge>
        : <Badge className="gap-1 bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>;
    }
    if (s.status === "rejected") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
    if (s.status === "expired") return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Expired</Badge>;
    return <Badge variant="outline">{s.status}</Badge>;
  };

  if (loading) return <div className="page-container">Loading…</div>;
  if (!vendorId)
    return (
      <div className="page-container">
        <Alert>
          <AlertTitle>Vendor record not found</AlertTitle>
          <AlertDescription>Complete your vendor registration first.</AlertDescription>
        </Alert>
      </div>
    );

  const incomplete = stats.pendingMandatory;

  return (
    <div className="page-container space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Policy Compliance
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Submit required documents and declarations to remain compliant with the organization's policies.
          </p>
        </div>
      </div>

      {incomplete > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action required</AlertTitle>
          <AlertDescription>
            You have <strong>{incomplete}</strong> mandatory polic{incomplete === 1 ? "y" : "ies"} pending submission.
            Until all mandatory items are approved, you cannot receive new POs or respond to RFPs.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total policies</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Mandatory</div><div className="text-2xl font-bold">{stats.mandatory}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Approved</div><div className="text-2xl font-bold text-green-600">{stats.approved}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Under review</div><div className="text-2xl font-bold text-amber-600">{stats.underReview}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pending action</div><div className="text-2xl font-bold text-destructive">{stats.pending}</div></CardContent></Card>
      </div>

      <div className="grid gap-4">
        {policies.map((p) => {
          const s = submissions[p.id];
          return (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {p.title}
                      {p.vendor_requirement_mandatory && <Badge variant="destructive" className="text-[10px]">Mandatory</Badge>}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground">{p.category}</div>
                  </div>
                  {statusBadge(s)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{p.description}</p>
                <div className="text-xs grid sm:grid-cols-2 gap-2">
                  <div><span className="font-medium">Requires: </span>
                    {p.vendor_requirement_type === "document" && "PDF document"}
                    {p.vendor_requirement_type === "declaration" && "Signed declaration"}
                    {p.vendor_requirement_type === "both" && "PDF document + signed declaration"}
                  </div>
                  {p.validity_months && <div><span className="font-medium">Validity: </span>{p.validity_months} months</div>}
                </div>
                {s?.expires_at && s.status === "approved" && (
                  <div className="text-xs text-muted-foreground">Valid until: {format(new Date(s.expires_at), "PPP")}</div>
                )}
                {s?.review_notes && (
                  <Alert variant={s.status === "rejected" ? "destructive" : "default"}>
                    <AlertTitle className="text-xs">Reviewer notes</AlertTitle>
                    <AlertDescription className="text-xs">{s.review_notes}</AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={() => openSubmit(p)}>
                    {s ? "Update submission" : "Submit"}
                  </Button>
                  {s?.document_url && s.document_name && (
                    <Button size="sm" variant="outline" onClick={() => downloadDoc(s.document_url!, s.document_name!)}>
                      <Download className="h-3 w-3 mr-1" /> View document
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!activePolicy} onOpenChange={(o) => !o && setActivePolicy(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{activePolicy?.title}</DialogTitle>
          </DialogHeader>
          {activePolicy && (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                {activePolicy.content}
              </div>

              {(activePolicy.vendor_requirement_type === "document" || activePolicy.vendor_requirement_type === "both") && (
                <div className="space-y-2">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Required document
                  </div>
                  {activePolicy.vendor_document_description && (
                    <p className="text-xs text-muted-foreground">{activePolicy.vendor_document_description}</p>
                  )}
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-[11px] text-muted-foreground">PDF only · max 5MB</p>
                </div>
              )}

              {(activePolicy.vendor_requirement_type === "declaration" || activePolicy.vendor_requirement_type === "both") && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Declaration</div>
                  <Textarea readOnly value={activePolicy.vendor_declaration_text ?? ""} className="text-sm bg-muted/30" />
                  <div className="flex items-start gap-2">
                    <Checkbox id="accept" checked={accepted} onCheckedChange={(v) => setAccepted(!!v)} />
                    <label htmlFor="accept" className="text-sm">
                      I, on behalf of my organization, accept the above declaration.
                    </label>
                  </div>
                  <Input
                    placeholder="Authorized signatory name"
                    value={signedBy}
                    onChange={(e) => setSignedBy(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivePolicy(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              <Upload className="h-4 w-4 mr-1" /> {submitting ? "Submitting…" : "Submit for review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorCompliance;
