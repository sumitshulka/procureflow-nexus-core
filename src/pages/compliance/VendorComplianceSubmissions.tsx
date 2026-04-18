import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Search,
  ShieldCheck,
} from "lucide-react";

type Row = {
  submission_id: string;
  vendor_id: string;
  vendor_name: string;
  policy_id: string;
  policy_title: string;
  category: string;
  vendor_requirement_type: string;
  vendor_requirement_mandatory: boolean;
  submission_status: string;
  submitted_at: string | null;
  expires_at: string | null;
  document_url: string | null;
  declaration_accepted: boolean | null;
  review_notes: string | null;
};

const VendorComplianceSubmissions: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [policyFilter, setPolicyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("submitted");
  const [mandatoryOnly, setMandatoryOnly] = useState(false);
  const [reviewing, setReviewing] = useState<Row | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const sb: any = supabase;
    const { data, error } = await sb
      .from("vendor_policy_submissions")
      .select(
        `id, vendor_id, policy_id, status, submitted_at, expires_at, document_url, declaration_accepted, review_notes,
         vendor_registrations!inner(company_name),
         compliance_policies!inner(title, category, vendor_requirement_type, vendor_requirement_mandatory, status)`
      )
      .order("submitted_at", { ascending: false });

    if (error) {
      toast.error("Failed to load submissions", { description: error.message });
      setRows([]);
      setLoading(false);
      return;
    }

    const mapped: Row[] = (data || [])
      .filter((r: any) => r.compliance_policies?.status === "active")
      .map((r: any) => ({
        submission_id: r.id,
        vendor_id: r.vendor_id,
        vendor_name: r.vendor_registrations?.company_name || "Unknown vendor",
        policy_id: r.policy_id,
        policy_title: r.compliance_policies?.title || "—",
        category: r.compliance_policies?.category || "—",
        vendor_requirement_type:
          r.compliance_policies?.vendor_requirement_type || "document",
        vendor_requirement_mandatory:
          !!r.compliance_policies?.vendor_requirement_mandatory,
        submission_status: r.status,
        submitted_at: r.submitted_at,
        expires_at: r.expires_at,
        document_url: r.document_url,
        declaration_accepted: r.declaration_accepted,
        review_notes: r.review_notes,
      }));

    setRows(mapped);
    setLoading(false);
  };

  const policies = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.policy_id, r.policy_title));
    return Array.from(m.entries());
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (policyFilter !== "all" && r.policy_id !== policyFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "expired") {
          const exp = r.expires_at && new Date(r.expires_at) <= new Date();
          if (!(r.submission_status === "approved" && exp)) return false;
        } else if (r.submission_status !== statusFilter) return false;
      }
      if (mandatoryOnly && !r.vendor_requirement_mandatory) return false;
      if (q) {
        const hay = `${r.vendor_name} ${r.policy_title} ${r.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, policyFilter, statusFilter, mandatoryOnly]);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let expired = 0;
    rows.forEach((r) => {
      const exp = r.expires_at && new Date(r.expires_at) <= new Date();
      if (r.submission_status === "submitted") pending++;
      else if (r.submission_status === "approved" && exp) expired++;
      else if (r.submission_status === "approved") approved++;
      else if (r.submission_status === "rejected") rejected++;
    });
    return { pending, approved, rejected, expired };
  }, [rows]);

  const downloadDoc = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("vendor-compliance-docs")
      .createSignedUrl(path, 60);
    if (error || !data) return toast.error("Could not generate link");
    window.open(data.signedUrl, "_blank");
  };

  const decide = async (status: "approved" | "rejected") => {
    if (!reviewing) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("vendor_policy_submissions")
        .update({
          status,
          reviewed_by: u.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        })
        .eq("id", reviewing.submission_id);
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

  const statusBadge = (r: Row) => {
    const exp = r.expires_at && new Date(r.expires_at) <= new Date();
    if (r.submission_status === "approved" && !exp)
      return (
        <Badge className="gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3" /> Approved
        </Badge>
      );
    if (r.submission_status === "approved" && exp)
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" /> Expired
        </Badge>
      );
    if (r.submission_status === "submitted")
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" /> Pending review
        </Badge>
      );
    if (r.submission_status === "rejected")
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" /> Rejected
        </Badge>
      );
    return <Badge variant="outline">{r.submission_status}</Badge>;
  };

  return (
    <div className="page-container space-y-4">
      <PageHeader
        title="Vendor Compliance Submissions"
        description="Cross-vendor review queue for policy documents and declarations"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Pending review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{counts.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{counts.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{counts.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{counts.expired}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Submission queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search vendor or policy"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={policyFilter} onValueChange={setPolicyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All policies</SelectItem>
                {policies.map(([id, title]) => (
                  <SelectItem key={id} value={id}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="submitted">Pending review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch
                id="mand"
                checked={mandatoryOnly}
                onCheckedChange={setMandatoryOnly}
              />
              <Label htmlFor="mand" className="text-sm">
                Mandatory only
              </Label>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No submissions match the current filters.
            </p>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Policy</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.submission_id}>
                      <TableCell className="font-medium">{r.vendor_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{r.policy_title}</span>
                          {r.vendor_requirement_mandatory && (
                            <Badge variant="outline" className="text-[10px]">
                              Mandatory
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.category}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">
                        {r.vendor_requirement_type}
                      </TableCell>
                      <TableCell>
                        {r.submitted_at
                          ? format(new Date(r.submitted_at), "PP")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {r.expires_at
                          ? format(new Date(r.expires_at), "PP")
                          : "—"}
                      </TableCell>
                      <TableCell>{statusBadge(r)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {r.document_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadDoc(r.document_url!)}
                          >
                            <Download className="h-3 w-3 mr-1" /> View
                          </Button>
                        )}
                        {r.submission_status === "submitted" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setReviewing(r);
                              setNotes("");
                            }}
                          >
                            Review
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Review: {reviewing?.policy_title}
              <div className="text-xs font-normal text-muted-foreground mt-1">
                Vendor: {reviewing?.vendor_name}
              </div>
            </DialogTitle>
          </DialogHeader>
          {reviewing?.declaration_accepted && (
            <div className="text-sm border rounded p-2 bg-muted">
              Vendor has e-signed the declaration for this policy.
            </div>
          )}
          {reviewing?.document_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadDoc(reviewing.document_url!)}
            >
              <Download className="h-3 w-3 mr-1" /> Open uploaded document
            </Button>
          )}
          <Textarea
            placeholder="Reviewer notes (optional, shown to vendor on rejection)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => decide("rejected")}
              disabled={busy}
            >
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button
              onClick={() => decide("approved")}
              disabled={busy}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorComplianceSubmissions;
