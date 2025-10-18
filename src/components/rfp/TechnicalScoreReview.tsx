import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Edit2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResponseScore {
  id: string;
  criteria_id: string;
  criterion_name: string;
  selected_option_label: string;
  submitted_value?: string;
  uploaded_document_url?: string;
  auto_calculated_score: number;
  manual_score?: number;
  manual_override_reason?: string;
  is_approved: boolean;
}

interface VendorResponse {
  id: string;
  vendor_name: string;
  total_technical_score: number;
  is_technically_qualified: boolean;
  scores: ResponseScore[];
}

interface TechnicalScoreReviewProps {
  rfpId: string;
  minimumScore?: number;
}

export default function TechnicalScoreReview({ rfpId, minimumScore }: TechnicalScoreReviewProps) {
  const [responses, setResponses] = useState<VendorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [selectedScore, setSelectedScore] = useState<ResponseScore | null>(null);
  const [manualScore, setManualScore] = useState<number>(0);
  const [overrideReason, setOverrideReason] = useState("");

  useEffect(() => {
    loadResponses();
  }, [rfpId]);

  const loadResponses = async () => {
    try {
      // Get all responses for this RFP
      const { data: rfpResponses, error: responsesError } = await supabase
        .from("rfp_responses")
        .select(`
          id,
          vendor_id,
          total_technical_score,
          is_technically_qualified,
          vendor_registrations (company_name)
        `)
        .eq("rfp_id", rfpId)
        .eq("technical_submission_status", "submitted");

      if (responsesError) throw responsesError;

      if (rfpResponses) {
        const vendorResponses = await Promise.all(
          rfpResponses.map(async (response: any) => {
            // Get all scores for this response
            const { data: scores } = await supabase
              .from("rfp_response_scores")
              .select(`
                id,
                criteria_id,
                selected_option_id,
                submitted_value,
                uploaded_document_url,
                auto_calculated_score,
                manual_score,
                manual_override_reason,
                is_approved,
                rfp_scoring_criteria (criterion_name),
                rfp_scoring_options (option_label)
              `)
              .eq("response_id", response.id);

            return {
              id: response.id,
              vendor_name: response.vendor_registrations?.company_name || "Unknown",
              total_technical_score: response.total_technical_score || 0,
              is_technically_qualified: response.is_technically_qualified || false,
              scores:
                scores?.map((s: any) => ({
                  id: s.id,
                  criteria_id: s.criteria_id,
                  criterion_name: s.rfp_scoring_criteria?.criterion_name || "",
                  selected_option_label: s.rfp_scoring_options?.option_label || s.submitted_value || "-",
                  submitted_value: s.submitted_value,
                  uploaded_document_url: s.uploaded_document_url,
                  auto_calculated_score: s.auto_calculated_score || 0,
                  manual_score: s.manual_score,
                  manual_override_reason: s.manual_override_reason,
                  is_approved: s.is_approved,
                })) || [],
            };
          })
        );

        setResponses(vendorResponses);
      }
    } catch (error: any) {
      toast.error("Failed to load responses");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const approveScore = async (scoreId: string) => {
    try {
      const { error } = await supabase
        .from("rfp_response_scores")
        .update({
          is_approved: true,
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", scoreId);

      if (error) throw error;
      toast.success("Score approved");
      loadResponses();
    } catch (error) {
      toast.error("Failed to approve score");
    }
  };

  const openOverrideDialog = (score: ResponseScore) => {
    setSelectedScore(score);
    setManualScore(score.manual_score || score.auto_calculated_score);
    setOverrideReason(score.manual_override_reason || "");
    setOverrideDialogOpen(true);
  };

  const saveManualOverride = async () => {
    if (!selectedScore) return;

    try {
      const { error } = await supabase
        .from("rfp_response_scores")
        .update({
          manual_score: manualScore,
          manual_override_reason: overrideReason,
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
          is_approved: true,
        })
        .eq("id", selectedScore.id);

      if (error) throw error;
      toast.success("Manual score saved");
      setOverrideDialogOpen(false);
      loadResponses();
    } catch (error) {
      toast.error("Failed to save manual score");
    }
  };

  if (loading) {
    return <div>Loading technical scores...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Technical Score Review</CardTitle>
          <CardDescription>
            Review, approve, and override vendor technical scores
            {minimumScore && ` (Minimum qualifying score: ${minimumScore})`}
          </CardDescription>
        </CardHeader>
      </Card>

      {responses.map((response) => (
        <Card key={response.id}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{response.vendor_name}</CardTitle>
                <CardDescription>
                  Total Score: <strong>{response.total_technical_score.toFixed(2)}</strong>
                </CardDescription>
              </div>
              <Badge variant={response.is_technically_qualified ? "default" : "destructive"}>
                {response.is_technically_qualified ? "Qualified" : "Not Qualified"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Criterion</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Auto Score</TableHead>
                  <TableHead>Manual Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {response.scores.map((score) => (
                  <TableRow key={score.id}>
                    <TableCell className="font-medium">{score.criterion_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {score.selected_option_label}
                        {score.uploaded_document_url && (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{score.auto_calculated_score}</TableCell>
                    <TableCell>
                      {score.manual_score !== null && score.manual_score !== undefined ? (
                        <div>
                          <div>{score.manual_score}</div>
                          {score.manual_override_reason && (
                            <div className="text-xs text-muted-foreground">{score.manual_override_reason}</div>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {score.is_approved ? (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!score.is_approved && (
                          <Button size="sm" variant="outline" onClick={() => approveScore(score.id)}>
                            Approve
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openOverrideDialog(score)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Score Override</DialogTitle>
            <DialogDescription>
              Override the auto-calculated score for: {selectedScore?.criterion_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Auto-calculated Score</label>
              <div className="text-2xl font-bold">{selectedScore?.auto_calculated_score}</div>
            </div>
            <div>
              <label className="text-sm font-medium">Manual Score</label>
              <Input
                type="number"
                value={manualScore}
                onChange={(e) => setManualScore(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reason for Override</label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explain why you're overriding the auto-calculated score"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveManualOverride}>Save Override</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
