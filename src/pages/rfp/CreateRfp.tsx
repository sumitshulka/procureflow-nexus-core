
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const rfpSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  procurement_request_id: z.string().optional(),
  submission_deadline: z.date({ required_error: "Submission deadline is required" }),
  technical_evaluation_deadline: z.date().optional(),
  commercial_evaluation_deadline: z.date().optional(),
  estimated_value: z.number().min(0).optional(),
  currency: z.string().default("USD"),
  terms_and_conditions: z.string().optional(),
  minimum_eligibility_criteria: z.string().optional(),
  pre_bid_meeting_date: z.date().optional(),
  pre_bid_meeting_venue: z.string().optional(),
  bid_validity_period: z.number().default(30),
  payment_terms: z.string().optional(),
  delivery_terms: z.string().optional(),
  warranty_requirements: z.string().optional(),
});

type RfpFormData = z.infer<typeof rfpSchema>;

interface EvaluationCriteria {
  criteria_name: string;
  criteria_type: "technical" | "commercial" | "compliance";
  weightage: number;
  max_score: number;
  description: string;
}

const CreateRfp = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [evaluationCriteria, setEvaluationCriteria] = useState<EvaluationCriteria[]>([]);

  const form = useForm<RfpFormData>({
    resolver: zodResolver(rfpSchema),
    defaultValues: {
      currency: "USD",
      bid_validity_period: 30,
    },
  });

  const addEvaluationCriteria = () => {
    setEvaluationCriteria([
      ...evaluationCriteria,
      {
        criteria_name: "",
        criteria_type: "technical",
        weightage: 0,
        max_score: 100,
        description: "",
      },
    ]);
  };

  const removeEvaluationCriteria = (index: number) => {
    setEvaluationCriteria(evaluationCriteria.filter((_, i) => i !== index));
  };

  const updateEvaluationCriteria = (index: number, field: keyof EvaluationCriteria, value: any) => {
    const updated = [...evaluationCriteria];
    updated[index] = { ...updated[index], [field]: value };
    setEvaluationCriteria(updated);
  };

  const onSubmit = async (data: RfpFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create an RFP",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Insert RFP
      const { data: rfpData, error: rfpError } = await supabase
        .from("rfps")
        .insert({
          ...data,
          created_by: user.id,
          status: "draft",
        })
        .select()
        .single();

      if (rfpError) throw rfpError;

      // Insert evaluation criteria
      if (evaluationCriteria.length > 0) {
        const criteriaData = evaluationCriteria.map((criteria) => ({
          ...criteria,
          rfp_id: rfpData.id,
        }));

        const { error: criteriaError } = await supabase
          .from("rfp_evaluation_criteria")
          .insert(criteriaData);

        if (criteriaError) throw criteriaError;
      }

      toast({
        title: "Success",
        description: "RFP created successfully",
      });

      navigate("/rfp/active");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create RFP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Request for Proposal (RFP)</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RFP Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter RFP title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimated_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Value</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="INR">INR</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="submission_deadline"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Submission Deadline *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : "Pick a date"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter detailed description of the RFP"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="payment_terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Net 30 days from delivery"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="delivery_terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Terms</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., FOB Destination, DDP"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="terms_and_conditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms and Conditions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter terms and conditions"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Evaluation Criteria Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Evaluation Criteria</h3>
                  <Button type="button" onClick={addEvaluationCriteria} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Criteria
                  </Button>
                </div>

                {evaluationCriteria.map((criteria, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Input
                        placeholder="Criteria Name"
                        value={criteria.criteria_name}
                        onChange={(e) => updateEvaluationCriteria(index, "criteria_name", e.target.value)}
                      />
                      <Select
                        value={criteria.criteria_type}
                        onValueChange={(value) => updateEvaluationCriteria(index, "criteria_type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="compliance">Compliance</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Weightage %"
                        value={criteria.weightage}
                        onChange={(e) => updateEvaluationCriteria(index, "weightage", parseFloat(e.target.value) || 0)}
                      />
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Max Score"
                          value={criteria.max_score}
                          onChange={(e) => updateEvaluationCriteria(index, "max_score", parseFloat(e.target.value) || 100)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeEvaluationCriteria(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      className="mt-2"
                      placeholder="Criteria Description"
                      value={criteria.description}
                      onChange={(e) => updateEvaluationCriteria(index, "description", e.target.value)}
                    />
                  </Card>
                ))}
              </div>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => navigate("/rfp/active")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create RFP"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateRfp;
