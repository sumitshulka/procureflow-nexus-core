import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScoringOption {
  id: string;
  option_label: string;
  points?: number; // Optional for vendor view (hidden)
  min_value?: number;
  max_value?: number;
}

interface ScoringCriterion {
  id: string;
  criterion_name: string;
  criterion_type: "numerical" | "multiple_choice" | "yes_no";
  max_points: number;
  is_required: boolean;
  requires_document: boolean;
  description?: string;
  options: ScoringOption[];
}

interface ResponseScore {
  criteria_id: string;
  selected_option_id?: string;
  submitted_value?: string;
  uploaded_document_url?: string;
}

interface VendorTechnicalResponseProps {
  rfpId: string;
  responseId: string;
  disabled?: boolean;
}

export default function VendorTechnicalResponse({ rfpId, responseId, disabled }: VendorTechnicalResponseProps) {
  const [criteria, setCriteria] = useState<ScoringCriterion[]>([]);
  const [responses, setResponses] = useState<Record<string, ResponseScore>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCriteria();
  }, [rfpId, responseId]);

  const loadCriteria = async () => {
    try {
      // Load criteria
      const { data: criteriaData, error: criteriaError } = await supabase
        .from("rfp_scoring_criteria")
        .select("*")
        .eq("rfp_id", rfpId)
        .order("display_order");

      if (criteriaError) throw criteriaError;

      if (criteriaData) {
        // Load options for each criterion (points hidden client-side)
        const criteriaWithOptions = await Promise.all(
          criteriaData.map(async (criterion) => {
            const { data: options } = await supabase
              .from("rfp_scoring_options")
              .select("id, option_label, min_value, max_value")
              .eq("criteria_id", criterion.id)
              .order("display_order");

            return {
              ...criterion,
              criterion_type: criterion.criterion_type as "numerical" | "multiple_choice" | "yes_no",
              options: options || [],
            };
          })
        );

        setCriteria(criteriaWithOptions as ScoringCriterion[]);

        // Load existing responses
        const { data: existingResponses } = await supabase
          .from("rfp_response_scores")
          .select("*")
          .eq("response_id", responseId);

        if (existingResponses) {
          const responsesMap: Record<string, ResponseScore> = {};
          existingResponses.forEach((resp) => {
            responsesMap[resp.criteria_id] = {
              criteria_id: resp.criteria_id,
              selected_option_id: resp.selected_option_id,
              submitted_value: resp.submitted_value,
              uploaded_document_url: resp.uploaded_document_url,
            };
          });
          setResponses(responsesMap);
        }
      }
    } catch (error: any) {
      toast.error("Failed to load scoring criteria");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateResponse = (criteriaId: string, updates: Partial<ResponseScore>) => {
    setResponses({
      ...responses,
      [criteriaId]: {
        ...responses[criteriaId],
        criteria_id: criteriaId,
        ...updates,
      },
    });
  };

  const handleFileUpload = async (criteriaId: string, file: File) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${responseId}/${criteriaId}-${Date.now()}.${fileExt}`;
      
      // Note: This requires a storage bucket to be set up
      // For now, we'll just store the file name as a placeholder
      updateResponse(criteriaId, { uploaded_document_url: file.name });
      toast.success("Document uploaded (placeholder)");
    } catch (error) {
      toast.error("Failed to upload document");
      console.error(error);
    }
  };

  const saveResponses = async () => {
    setSaving(true);
    try {
      // Validate required fields
      for (const criterion of criteria) {
        if (criterion.is_required && !responses[criterion.id]?.selected_option_id && !responses[criterion.id]?.submitted_value) {
          toast.error(`Please complete required criterion: ${criterion.criterion_name}`);
          setSaving(false);
          return;
        }
        if (criterion.requires_document && !responses[criterion.id]?.uploaded_document_url) {
          toast.error(`Please upload document for: ${criterion.criterion_name}`);
          setSaving(false);
          return;
        }
      }

      // Save all responses
      for (const criteriaId in responses) {
        const response = responses[criteriaId];
        const criterion = criteria.find((c) => c.id === criteriaId);
        
        if (!criterion) continue;

        // Calculate auto score based on selected option
        let autoScore = 0;
        if (response.selected_option_id) {
          const selectedOption = criterion.options.find((o) => o.id === response.selected_option_id);
          autoScore = selectedOption?.points || 0;
        }

        const { error } = await supabase.from("rfp_response_scores").upsert({
          response_id: responseId,
          criteria_id: criteriaId,
          selected_option_id: response.selected_option_id,
          submitted_value: response.submitted_value,
          uploaded_document_url: response.uploaded_document_url,
          auto_calculated_score: autoScore,
        });

        if (error) throw error;
      }

      toast.success("Technical response saved");
    } catch (error: any) {
      toast.error("Failed to save responses");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading scoring criteria...</div>;
  }

  if (criteria.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Technical Scoring</CardTitle>
          <CardDescription>No scoring criteria defined for this RFP</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Technical Qualification Criteria</CardTitle>
          <CardDescription>
            Please provide accurate information for each criterion. Supporting documents may be required.
          </CardDescription>
        </CardHeader>
      </Card>

      {criteria.map((criterion) => (
        <Card key={criterion.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {criterion.criterion_name}
              {criterion.is_required && <span className="text-destructive ml-1">*</span>}
            </CardTitle>
            {criterion.description && <CardDescription>{criterion.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {criterion.criterion_type === "yes_no" && (
              <RadioGroup
                value={responses[criterion.id]?.submitted_value || ""}
                onValueChange={(value) => updateResponse(criterion.id, { submitted_value: value })}
                disabled={disabled}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id={`${criterion.id}-yes`} />
                  <Label htmlFor={`${criterion.id}-yes`}>Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id={`${criterion.id}-no`} />
                  <Label htmlFor={`${criterion.id}-no`}>No</Label>
                </div>
              </RadioGroup>
            )}

            {criterion.criterion_type === "multiple_choice" && (
              <Select
                value={responses[criterion.id]?.selected_option_id || ""}
                onValueChange={(value) => updateResponse(criterion.id, { selected_option_id: value })}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {criterion.options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.option_label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {criterion.criterion_type === "numerical" && (
              <div className="space-y-2">
                <Select
                  value={responses[criterion.id]?.selected_option_id || ""}
                  onValueChange={(value) => updateResponse(criterion.id, { selected_option_id: value })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    {criterion.options.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.option_label}
                        {option.min_value !== undefined && option.max_value !== undefined &&
                          ` (${option.min_value} - ${option.max_value})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  placeholder="Enter exact value (optional)"
                  value={responses[criterion.id]?.submitted_value || ""}
                  onChange={(e) => updateResponse(criterion.id, { submitted_value: e.target.value })}
                  disabled={disabled}
                />
              </div>
            )}

            {criterion.requires_document && (
              <div className="space-y-2">
                <Label>Supporting Document {criterion.is_required && <span className="text-destructive">*</span>}</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(criterion.id, file);
                    }}
                    disabled={disabled}
                  />
                  {responses[criterion.id]?.uploaded_document_url && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {responses[criterion.id].uploaded_document_url}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={saveResponses} disabled={disabled || saving}>
          {saving ? "Saving..." : "Save Technical Response"}
        </Button>
      </div>
    </div>
  );
}
