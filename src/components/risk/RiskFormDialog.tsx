import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RiskFormCategory {
  id: string;
  name: string;
}

export interface RiskFormValues {
  id?: string;
  title: string;
  description: string;
  category_id: string;
  probability: number;
  impact: number;
  status: string;
  treatment_strategy: string;
  mitigation_strategy: string;
  due_date: string;
  vendor_id: string;
  department_id: string;
  residual_probability: number;
  residual_impact: number;
  review_frequency_days: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<RiskFormValues> | null;
  categories: RiskFormCategory[];
  onSaved: () => void;
}

const empty: RiskFormValues = {
  title: "",
  description: "",
  category_id: "",
  probability: 3,
  impact: 3,
  status: "Open",
  treatment_strategy: "Treat",
  mitigation_strategy: "",
  due_date: "",
  vendor_id: "",
  department_id: "",
  residual_probability: 0,
  residual_impact: 0,
  review_frequency_days: 90,
};

const RiskFormDialog = ({ open, onOpenChange, initial, categories, onSaved }: Props) => {
  const { toast } = useToast();
  const form = useForm<RiskFormValues>({ defaultValues: empty });
  const [vendors, setVendors] = useState<{ id: string; company_name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (open) {
      form.reset({
        ...empty,
        ...initial,
        due_date: initial?.due_date ? initial.due_date.substring(0, 10) : "",
      });
      // Load vendors and departments for entity tagging
      Promise.all([
        supabase.from("vendor_registrations").select("id, company_name").eq("status", "approved").order("company_name"),
        supabase.from("departments").select("id, name").eq("is_active", true).order("name"),
      ]).then(([v, d]) => {
        setVendors(v.data || []);
        setDepartments(d.data || []);
      });
    }
  }, [open, initial, form]);

  const isEdit = Boolean(initial?.id);
  const inherentScore = Number(form.watch("probability")) * Number(form.watch("impact"));
  const residualScore = Number(form.watch("residual_probability") || 0) * Number(form.watch("residual_impact") || 0);

  const onSubmit = async (data: RiskFormValues) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Error", description: "Sign in required", variant: "destructive" });
        return;
      }

      const payload: any = {
        title: data.title,
        description: data.description || null,
        category_id: data.category_id || null,
        probability: Number(data.probability),
        impact: Number(data.impact),
        status: data.status,
        treatment_strategy: data.treatment_strategy,
        mitigation_strategy: data.mitigation_strategy || null,
        due_date: data.due_date || null,
        vendor_id: data.vendor_id || null,
        department_id: data.department_id || null,
        residual_probability: data.residual_probability ? Number(data.residual_probability) : null,
        residual_impact: data.residual_impact ? Number(data.residual_impact) : null,
        review_frequency_days: Number(data.review_frequency_days) || 90,
      };

      const { error } = isEdit
        ? await supabase.from("risk_assessments").update(payload).eq("id", initial!.id!)
        : await supabase.from("risk_assessments").insert({ ...payload, created_by: user.id, owner_id: user.id });

      if (error) throw error;
      toast({ title: "Success", description: `Risk ${isEdit ? "updated" : "created"}` });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? "Edit Risk Assessment" : "Create Risk Assessment"}
            <Badge variant="outline" className="text-xs">ISO 31000 / COSO ERM</Badge>
          </DialogTitle>
          <DialogDescription>
            Aligned to ISO 31000 clause 6 (Identify → Analyze → Evaluate → Treat → Monitor)
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="identify" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="identify">1. Identify</TabsTrigger>
                <TabsTrigger value="analyze">2. Analyze</TabsTrigger>
                <TabsTrigger value="treat">3. Treat</TabsTrigger>
                <TabsTrigger value="monitor">4. Monitor</TabsTrigger>
              </TabsList>

              <TabsContent value="identify" className="space-y-4 pt-4">
                <FormField control={form.control} name="title" rules={{ required: true }} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Title *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description / Risk Event</FormLabel>
                    <FormControl><Textarea {...field} rows={3} placeholder="Describe the risk event, cause, and potential consequences..." /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="category_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="vendor_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linked Vendor (optional)</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                        <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None (organization-level)</SelectItem>
                          {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.company_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormDescription>Tag if risk is vendor-specific (rolls up to vendor profile)</FormDescription>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="department_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linked Department (optional)</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                        <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
              </TabsContent>

              <TabsContent value="analyze" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">Inherent Risk = Probability × Impact (before any controls)</p>
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="probability" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probability (1–5)</FormLabel>
                      <Select onValueChange={field.onChange} value={String(field.value)}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 — Rare</SelectItem>
                          <SelectItem value="2">2 — Unlikely</SelectItem>
                          <SelectItem value="3">3 — Possible</SelectItem>
                          <SelectItem value="4">4 — Likely</SelectItem>
                          <SelectItem value="5">5 — Almost Certain</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="impact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impact (1–5)</FormLabel>
                      <Select onValueChange={field.onChange} value={String(field.value)}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 — Insignificant</SelectItem>
                          <SelectItem value="2">2 — Minor</SelectItem>
                          <SelectItem value="3">3 — Moderate</SelectItem>
                          <SelectItem value="4">4 — Major</SelectItem>
                          <SelectItem value="5">5 — Catastrophic</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormItem>
                    <FormLabel>Inherent Score</FormLabel>
                    <div className="h-10 flex items-center px-3 border rounded-md bg-muted font-bold text-lg">
                      {inherentScore || 0}
                    </div>
                  </FormItem>
                </div>
              </TabsContent>

              <TabsContent value="treat" className="space-y-4 pt-4">
                <FormField control={form.control} name="treatment_strategy" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Treatment Strategy (4T's)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Treat">Treat — Apply controls to reduce risk</SelectItem>
                        <SelectItem value="Transfer">Transfer — Insurance / contract / outsource</SelectItem>
                        <SelectItem value="Tolerate">Tolerate — Accept within appetite</SelectItem>
                        <SelectItem value="Terminate">Terminate — Avoid the activity entirely</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="mitigation_strategy" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mitigation / Treatment Plan</FormLabel>
                    <FormControl><Textarea {...field} rows={4} placeholder="Describe controls, actions, owners, and timelines..." /></FormControl>
                  </FormItem>
                )} />
                <p className="text-sm text-muted-foreground">Residual Risk = score after controls are applied (leave blank if not yet assessed)</p>
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="residual_probability" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Residual Probability</FormLabel>
                      <Select onValueChange={field.onChange} value={String(field.value || 0)}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="0">— Not assessed</SelectItem>
                          {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="residual_impact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Residual Impact</FormLabel>
                      <Select onValueChange={field.onChange} value={String(field.value || 0)}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="0">— Not assessed</SelectItem>
                          {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormItem>
                    <FormLabel>Residual Score</FormLabel>
                    <div className="h-10 flex items-center px-3 border rounded-md bg-muted font-bold text-lg">
                      {residualScore || "—"}
                    </div>
                  </FormItem>
                </div>
              </TabsContent>

              <TabsContent value="monitor" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Open">Open — Identified, awaiting treatment</SelectItem>
                          <SelectItem value="Mitigating">Mitigating — Controls being applied</SelectItem>
                          <SelectItem value="Monitoring">Monitoring — Controls active, residual tracked</SelectItem>
                          <SelectItem value="Closed">Closed — Risk eliminated</SelectItem>
                          <SelectItem value="Accepted">Accepted — Within appetite</SelectItem>
                          <SelectItem value="Escalated">Escalated — Exceeds appetite</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="due_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Treatment Due Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="review_frequency_days" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Review Frequency (days)</FormLabel>
                    <Select onValueChange={field.onChange} value={String(field.value)}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="30">Monthly (30 days)</SelectItem>
                        <SelectItem value="90">Quarterly (90 days)</SelectItem>
                        <SelectItem value="180">Semi-annual (180 days)</SelectItem>
                        <SelectItem value="365">Annual (365 days)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Next review date will be auto-set based on frequency</FormDescription>
                  </FormItem>
                )} />
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 justify-end border-t pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">{isEdit ? "Save Changes" : "Create Risk"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RiskFormDialog;
