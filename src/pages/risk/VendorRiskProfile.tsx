import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ShieldAlert, RefreshCw, Search, AlertTriangle, TrendingUp, Building2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/currencyUtils";

interface VendorProfile {
  vendor_id: string;
  company_name: string;
  po_count: number;
  total_spend: number;
  late_deliveries: number;
  late_delivery_rate: number;
  spend_concentration_pct: number;
  total_risks: number;
  active_risks: number;
  critical_risks: number;
  escalated_risks: number;
  auto_detected_risks: number;
  max_risk_score: number;
  avg_risk_score: number;
  overall_risk_rating: string;
}

interface VendorRisk {
  id: string;
  title: string;
  description: string | null;
  status: string;
  risk_level: string;
  risk_score: number;
  treatment_strategy: string | null;
  auto_generated: boolean;
  source_trigger: string | null;
  created_at: string;
}

const ratingColor = (r: string) => {
  if (r === "Critical") return "destructive";
  if (r === "High") return "destructive";
  if (r === "Medium") return "secondary";
  return "outline";
};

const VendorRiskProfile = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["vendor-risk-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_risk_profile" as any)
        .select("*")
        .order("max_risk_score", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as VendorProfile[];
    },
  });

  const { data: vendorRisks = [] } = useQuery({
    queryKey: ["vendor-risks", selectedVendor?.vendor_id],
    enabled: !!selectedVendor,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("risk_assessments")
        .select("id, title, description, status, risk_level, risk_score, treatment_strategy, auto_generated, source_trigger, created_at")
        .eq("vendor_id", selectedVendor!.vendor_id)
        .order("risk_score", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as VendorRisk[];
    },
  });

  const detectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("detect_and_create_risks" as any);
      if (error) throw error;
      return data as { action: string; risk_title: string; vendor_id: string }[];
    },
    onSuccess: (data) => {
      const created = data?.filter((d) => d.action === "created").length || 0;
      const closed = data?.filter((d) => d.action === "closed").length || 0;
      toast({
        title: "Risk detection complete",
        description: `${created} new risk(s) created, ${closed} auto-closed.`,
      });
      qc.invalidateQueries({ queryKey: ["vendor-risk-profiles"] });
    },
    onError: (e: any) => toast({ title: "Detection failed", description: e.message, variant: "destructive" }),
  });

  const filtered = profiles.filter((p) =>
    p.company_name.toLowerCase().includes(search.toLowerCase())
  );

  const summary = {
    total: profiles.length,
    critical: profiles.filter((p) => p.overall_risk_rating === "Critical").length,
    high: profiles.filter((p) => p.overall_risk_rating === "High").length,
    autoDetected: profiles.reduce((sum, p) => sum + (p.auto_detected_risks || 0), 0),
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-wrap justify-between items-start gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Vendor Risk Profile
            <Badge variant="outline" className="text-xs font-semibold">
              <ShieldAlert className="h-3 w-3 mr-1" />
              ISO 31000 Hybrid Rollup
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Per-vendor risk aggregation combining manual register + auto-detected operational signals
          </p>
        </div>
        <Button onClick={() => detectMutation.mutate()} disabled={detectMutation.isPending}>
          <Sparkles className="h-4 w-4 mr-2" />
          {detectMutation.isPending ? "Scanning..." : "Run Auto-Detection"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Rating</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{summary.critical}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-warning">{summary.high}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Detected</CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{summary.autoDetected}</div></CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Risk Aggregation</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No vendors found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">PO Count</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                  <TableHead className="text-right">Concentration</TableHead>
                  <TableHead className="text-right">Late Rate</TableHead>
                  <TableHead className="text-right">Active Risks</TableHead>
                  <TableHead className="text-right">Max Score</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.vendor_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedVendor(p)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {p.company_name}
                        {p.auto_detected_risks > 0 && (
                          <Badge variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />{p.auto_detected_risks}</Badge>
                        )}
                        {p.escalated_risks > 0 && <Badge variant="destructive" className="text-xs">Escalated</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{p.po_count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.total_spend)}</TableCell>
                    <TableCell className="text-right">{p.spend_concentration_pct}%</TableCell>
                    <TableCell className="text-right">
                      <span className={p.late_delivery_rate > 30 ? "text-destructive font-semibold" : ""}>
                        {p.late_delivery_rate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{p.active_risks}</TableCell>
                    <TableCell className="text-right font-semibold">{p.max_risk_score}</TableCell>
                    <TableCell>
                      <Badge variant={ratingColor(p.overall_risk_rating) as any}>{p.overall_risk_rating}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedVendor} onOpenChange={(v) => !v && setSelectedVendor(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedVendor?.company_name}</SheetTitle>
            <SheetDescription>Risk profile and all linked risks</SheetDescription>
          </SheetHeader>
          {selectedVendor && (
            <div className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Overall Rating</div>
                  <Badge variant={ratingColor(selectedVendor.overall_risk_rating) as any} className="mt-1">
                    {selectedVendor.overall_risk_rating}
                  </Badge>
                </div>
                <div className="p-3 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Avg Risk Score</div>
                  <div className="text-xl font-bold">{selectedVendor.avg_risk_score}</div>
                </div>
                <div className="p-3 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Spend</div>
                  <div className="text-sm font-semibold">{formatCurrency(selectedVendor.total_spend)}</div>
                  <div className="text-xs text-muted-foreground">{selectedVendor.spend_concentration_pct}% concentration</div>
                </div>
                <div className="p-3 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Delivery</div>
                  <div className="text-sm font-semibold">{selectedVendor.late_delivery_rate}% late</div>
                  <div className="text-xs text-muted-foreground">{selectedVendor.late_deliveries} of {selectedVendor.po_count} POs</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Linked Risks ({vendorRisks.length})</h3>
                {vendorRisks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No risks tagged to this vendor.</p>
                ) : (
                  <div className="space-y-2">
                    {vendorRisks.map((r) => (
                      <div key={r.id} className="border rounded p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{r.title}</span>
                              {r.auto_generated && (
                                <Badge variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
                              )}
                            </div>
                            {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={ratingColor(r.risk_level) as any} className="text-xs">{r.risk_level}</Badge>
                            <Badge variant="outline" className="text-xs">{r.status}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          <span>Score: <strong>{r.risk_score}</strong></span>
                          {r.treatment_strategy && <span>Strategy: <strong>{r.treatment_strategy}</strong></span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default VendorRiskProfile;
