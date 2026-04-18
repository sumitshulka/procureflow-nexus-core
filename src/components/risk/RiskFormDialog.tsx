import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  mitigation_strategy: string;
  due_date: string;
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
  mitigation_strategy: "",
  due_date: "",
};

const RiskFormDialog = ({ open, onOpenChange, initial, categories, onSaved }: Props) => {
  const { toast } = useToast();
  const form = useForm<RiskFormValues>({ defaultValues: empty });

  useEffect(() => {
    if (open) {
      form.reset({
        ...empty,
        ...initial,
        due_date: initial?.due_date ? initial.due_date.substring(0, 10) : "",
      });
    }
  }, [open, initial, form]);

  const isEdit = Boolean(initial?.id);

  const onSubmit = async (data: RiskFormValues) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Error", description: "Sign in required", variant: "destructive" });
        return;
      }

      const payload = {
        title: data.title,
        description: data.description || null,
        category_id: data.category_id || null,
        probability: Number(data.probability),
        impact: Number(data.impact),
        status: data.status,
        mitigation_strategy: data.mitigation_strategy || null,
        due_date: data.due_date || null,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Risk Assessment" : "Create Risk Assessment"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" rules={{ required: true }} render={({ field }) => (
              <FormItem>
                <FormLabel>Risk Title *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} rows={3} /></FormControl>
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
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
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="Mitigating">Mitigating</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                      <SelectItem value="Accepted">Accepted</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="probability" render={({ field }) => (
                <FormItem>
                  <FormLabel>Probability (1–5)</FormLabel>
                  <Select onValueChange={field.onChange} value={String(field.value)}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
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
                      {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="due_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="mitigation_strategy" render={({ field }) => (
              <FormItem>
                <FormLabel>Mitigation Strategy</FormLabel>
                <FormControl><Textarea {...field} rows={3} /></FormControl>
              </FormItem>
            )} />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">{isEdit ? "Save Changes" : "Create"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RiskFormDialog;
