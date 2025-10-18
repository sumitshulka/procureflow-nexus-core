import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScoringOption {
  id: string;
  option_label: string;
  points: number;
  min_value?: number;
  max_value?: number;
  display_order: number;
}

interface ScoringCriterion {
  id: string;
  criterion_name: string;
  criterion_type: "numerical" | "multiple_choice" | "yes_no";
  max_points: number;
  is_required: boolean;
  requires_document: boolean;
  description?: string;
  display_order: number;
  options: ScoringOption[];
}

interface TechnicalScoringManagerProps {
  rfpId: string;
  onUpdate?: () => void;
}

export default function TechnicalScoringManager({ rfpId, onUpdate }: TechnicalScoringManagerProps) {
  const [criteria, setCriteria] = useState<ScoringCriterion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null);

  useEffect(() => {
    loadCriteria();
  }, [rfpId]);

  const loadCriteria = async () => {
    if (!rfpId) return;

    try {
      const { data: criteriaData, error: criteriaError } = await supabase
        .from("rfp_scoring_criteria")
        .select("*")
        .eq("rfp_id", rfpId)
        .order("display_order");

      if (criteriaError) throw criteriaError;

      if (criteriaData) {
        const criteriaWithOptions = await Promise.all(
          criteriaData.map(async (criterion) => {
            const { data: options } = await supabase
              .from("rfp_scoring_options")
              .select("*")
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
      }
    } catch (error: any) {
      toast.error("Failed to load scoring criteria");
      console.error(error);
    }
  };

  const addCriterion = () => {
    const newCriterion: ScoringCriterion = {
      id: `temp-${Date.now()}`,
      criterion_name: "",
      criterion_type: "multiple_choice",
      max_points: 0,
      is_required: true,
      requires_document: false,
      description: "",
      display_order: criteria.length,
      options: [],
    };
    setCriteria([...criteria, newCriterion]);
    setExpandedCriterion(newCriterion.id);
  };

  const updateCriterion = (id: string, updates: Partial<ScoringCriterion>) => {
    setCriteria(criteria.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const deleteCriterion = async (id: string) => {
    if (id.startsWith("temp-")) {
      setCriteria(criteria.filter((c) => c.id !== id));
    } else {
      try {
        const { error } = await supabase.from("rfp_scoring_criteria").delete().eq("id", id);
        if (error) throw error;
        setCriteria(criteria.filter((c) => c.id !== id));
        toast.success("Criterion deleted");
      } catch (error) {
        toast.error("Failed to delete criterion");
      }
    }
  };

  const addOption = (criterionId: string) => {
    setCriteria(
      criteria.map((c) => {
        if (c.id === criterionId) {
          const newOption: ScoringOption = {
            id: `temp-opt-${Date.now()}`,
            option_label: "",
            points: 0,
            display_order: c.options.length,
          };
          return { ...c, options: [...c.options, newOption] };
        }
        return c;
      })
    );
  };

  const updateOption = (criterionId: string, optionId: string, updates: Partial<ScoringOption>) => {
    setCriteria(
      criteria.map((c) => {
        if (c.id === criterionId) {
          return {
            ...c,
            options: c.options.map((o) => (o.id === optionId ? { ...o, ...updates } : o)),
          };
        }
        return c;
      })
    );
  };

  const deleteOption = (criterionId: string, optionId: string) => {
    setCriteria(
      criteria.map((c) => {
        if (c.id === criterionId) {
          return {
            ...c,
            options: c.options.filter((o) => o.id !== optionId),
          };
        }
        return c;
      })
    );
  };

  const saveCriteria = async () => {
    setLoading(true);
    try {
      // Validate
      for (const criterion of criteria) {
        if (!criterion.criterion_name.trim()) {
          toast.error("Please provide a name for all criteria");
          setLoading(false);
          return;
        }
        if (criterion.options.length === 0 && criterion.criterion_type !== "yes_no") {
          toast.error(`Please add options for "${criterion.criterion_name}"`);
          setLoading(false);
          return;
        }
      }

      // Save each criterion
      for (const criterion of criteria) {
        let criterionId = criterion.id;

        if (criterion.id.startsWith("temp-")) {
          const { data, error } = await supabase
            .from("rfp_scoring_criteria")
            .insert({
              rfp_id: rfpId,
              criterion_name: criterion.criterion_name,
              criterion_type: criterion.criterion_type,
              max_points: criterion.max_points,
              is_required: criterion.is_required,
              requires_document: criterion.requires_document,
              description: criterion.description,
              display_order: criterion.display_order,
            })
            .select()
            .single();

          if (error) throw error;
          criterionId = data.id;
        } else {
          const { error } = await supabase
            .from("rfp_scoring_criteria")
            .update({
              criterion_name: criterion.criterion_name,
              criterion_type: criterion.criterion_type,
              max_points: criterion.max_points,
              is_required: criterion.is_required,
              requires_document: criterion.requires_document,
              description: criterion.description,
              display_order: criterion.display_order,
            })
            .eq("id", criterionId);

          if (error) throw error;
        }

        // Save options
        for (const option of criterion.options) {
          if (option.id.startsWith("temp-")) {
            const { error } = await supabase.from("rfp_scoring_options").insert({
              criteria_id: criterionId,
              option_label: option.option_label,
              points: option.points,
              min_value: option.min_value,
              max_value: option.max_value,
              display_order: option.display_order,
            });

            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("rfp_scoring_options")
              .update({
                option_label: option.option_label,
                points: option.points,
                min_value: option.min_value,
                max_value: option.max_value,
                display_order: option.display_order,
              })
              .eq("id", option.id);

            if (error) throw error;
          }
        }
      }

      toast.success("Scoring criteria saved successfully");
      loadCriteria();
      onUpdate?.();
    } catch (error: any) {
      toast.error("Failed to save scoring criteria");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Technical Scoring Criteria</h3>
          <p className="text-sm text-muted-foreground">
            Define criteria and scoring options (points are hidden from vendors)
          </p>
        </div>
        <Button onClick={addCriterion} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Criterion
        </Button>
      </div>

      {criteria.map((criterion, index) => (
        <Card key={criterion.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Criterion name (e.g., Annual Turnover)"
                  value={criterion.criterion_name}
                  onChange={(e) => updateCriterion(criterion.id, { criterion_name: e.target.value })}
                  className="font-semibold"
                />
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteCriterion(criterion.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={criterion.criterion_type}
                  onValueChange={(value: any) => updateCriterion(criterion.id, { criterion_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="numerical">Numerical Range</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="yes_no">Yes/No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Max Points</Label>
                <Input
                  type="number"
                  value={criterion.max_points}
                  onChange={(e) => updateCriterion(criterion.id, { max_points: Number(e.target.value) })}
                />
              </div>

              <div className="flex items-center gap-4 pt-8">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`required-${criterion.id}`}
                    checked={criterion.is_required}
                    onCheckedChange={(checked) => updateCriterion(criterion.id, { is_required: !!checked })}
                  />
                  <Label htmlFor={`required-${criterion.id}`}>Required</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`doc-${criterion.id}`}
                    checked={criterion.requires_document}
                    onCheckedChange={(checked) => updateCriterion(criterion.id, { requires_document: !!checked })}
                  />
                  <Label htmlFor={`doc-${criterion.id}`}>Requires Document</Label>
                </div>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description for vendors"
                value={criterion.description || ""}
                onChange={(e) => updateCriterion(criterion.id, { description: e.target.value })}
              />
            </div>

            {criterion.criterion_type !== "yes_no" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Scoring Options</Label>
                  <Button variant="outline" size="sm" onClick={() => addOption(criterion.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>

                {criterion.options.map((option) => (
                  <div key={option.id} className="flex gap-2 items-center">
                    <Input
                      placeholder="Option label"
                      value={option.option_label}
                      onChange={(e) => updateOption(criterion.id, option.id, { option_label: e.target.value })}
                      className="flex-1"
                    />
                    {criterion.criterion_type === "numerical" && (
                      <>
                        <Input
                          type="number"
                          placeholder="Min"
                          value={option.min_value || ""}
                          onChange={(e) =>
                            updateOption(criterion.id, option.id, { min_value: Number(e.target.value) || undefined })
                          }
                          className="w-24"
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={option.max_value || ""}
                          onChange={(e) =>
                            updateOption(criterion.id, option.id, { max_value: Number(e.target.value) || undefined })
                          }
                          className="w-24"
                        />
                      </>
                    )}
                    <Input
                      type="number"
                      placeholder="Points"
                      value={option.points}
                      onChange={(e) => updateOption(criterion.id, option.id, { points: Number(e.target.value) })}
                      className="w-24"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteOption(criterion.id, option.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end gap-2">
        <Button onClick={saveCriteria} disabled={loading}>
          Save All Criteria
        </Button>
      </div>
    </div>
  );
}
