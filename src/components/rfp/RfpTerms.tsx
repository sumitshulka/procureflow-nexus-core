import React, { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const MAX_TOTAL_BYTES = 2 * 1024 * 1024; // 2 MB combined

interface RfpAttachment {
  name: string;
  path: string;
  url: string;
  size: number;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const termsSchema = z.object({
  terms_and_conditions: z.string().optional(),
  payment_terms: z.string().optional(),
  delivery_terms: z.string().optional(),
  warranty_requirements: z.string().optional(),
  minimum_eligibility_criteria: z.string().optional(),
  special_instructions: z.string().optional(),
});

type TermsData = z.infer<typeof termsSchema>;

interface RfpTermsProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
}

const RfpTerms: React.FC<RfpTermsProps> = ({ data, onUpdate, onNext }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<RfpAttachment[]>(
    Array.isArray(data.terms?.attachments) ? data.terms.attachments : []
  );
  const [uploading, setUploading] = useState(false);

  const totalBytes = attachments.reduce((sum, a) => sum + (a.size || 0), 0);

  const form = useForm<TermsData>({
    resolver: zodResolver(termsSchema),
    defaultValues: {
      ...data.terms,
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (e.target) e.target.value = "";
    if (!files.length) return;

    if (!user) {
      toast({ title: "Not signed in", description: "You must be signed in to upload files.", variant: "destructive" });
      return;
    }

    // Validate PDFs only
    const nonPdf = files.find((f) => f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf"));
    if (nonPdf) {
      toast({ title: "Invalid file type", description: `Only PDF files are allowed. "${nonPdf.name}" was rejected.`, variant: "destructive" });
      return;
    }

    const incomingBytes = files.reduce((s, f) => s + f.size, 0);
    if (totalBytes + incomingBytes > MAX_TOTAL_BYTES) {
      toast({
        title: "Size limit exceeded",
        description: `Combined size cannot exceed 2 MB. Current ${formatBytes(totalBytes)}, adding ${formatBytes(incomingBytes)}.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const uploaded: RfpAttachment[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("rfp-attachments")
          .upload(path, file, { contentType: "application/pdf", upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("rfp-attachments").getPublicUrl(path);
        uploaded.push({ name: file.name, path, url: pub.publicUrl, size: file.size });
      }
      const next = [...attachments, ...uploaded];
      setAttachments(next);
      onUpdate({ terms: { ...form.getValues(), attachments: next } });
      toast({ title: "Files uploaded", description: `${uploaded.length} file(s) added.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Could not upload file(s).", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (att: RfpAttachment) => {
    try {
      await supabase.storage.from("rfp-attachments").remove([att.path]);
    } catch {
      // best-effort cleanup
    }
    const next = attachments.filter((a) => a.path !== att.path);
    setAttachments(next);
    onUpdate({ terms: { ...form.getValues(), attachments: next } });
  };

  const onSubmit = (formData: TermsData) => {
    onUpdate({ terms: { ...formData, attachments } });
    onNext();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Terms & Conditions</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Specify the terms, conditions, and requirements for this RFP.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">General Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="terms_and_conditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms and Conditions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter general terms and conditions for the RFP..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="payment_terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., 30% advance, 60% on delivery, 10% after 30 days..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Delivery Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="delivery_terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., FOB Destination, DDP, delivery timeline..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Technical Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="warranty_requirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warranty Requirements</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Specify warranty terms and requirements..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimum_eligibility_criteria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Eligibility Criteria</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Define minimum requirements for vendor eligibility..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Special Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="special_instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Any special instructions or additional requirements..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button type="submit">
            Continue to Review
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default RfpTerms;
