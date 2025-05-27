
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const form = useForm<TermsData>({
    resolver: zodResolver(termsSchema),
    defaultValues: {
      ...data.terms,
    },
  });

  const onSubmit = (formData: TermsData) => {
    onUpdate({ terms: formData });
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
