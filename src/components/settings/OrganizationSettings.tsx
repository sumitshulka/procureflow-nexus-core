
import React, { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logDatabaseError, checkAuthentication } from "@/utils/supabaseHelpers";

const formSchema = z.object({
  organizationName: z.string().min(2, {
    message: "Organization name must be at least 2 characters.",
  }),
  baseCurrency: z.string().min(1, { 
    message: "Please select a base currency." 
  }),
  dateFormat: z.string().min(1, {
    message: "Please select a date format.",
  }),
  fiscalYearStart: z.string().min(1, {
    message: "Please select a fiscal year start month.",
  }),
  timeZone: z.string().min(1, {
    message: "Please select a time zone.",
  }),
  logoUrl: z.string().optional(),
});

const OrganizationSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log("[OrganizationSettings] Component mounted");

  // Fetch current organization settings - get the first record if multiple exist
  const { data: orgSettings, isLoading, error } = useQuery({
    queryKey: ["organization_settings"],
    queryFn: async () => {
      console.log("[OrganizationSettings] Starting to fetch organization settings");
      
      // Check authentication first
      const user = await checkAuthentication();
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("[OrganizationSettings] User authenticated, fetching settings");
      
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .order('created_at', { ascending: false })
        .limit(1);
      
      console.log("[OrganizationSettings] Query result:", { data, error });
      
      if (error) {
        logDatabaseError(error, "fetch organization settings");
        throw error;
      }
      
      // Return the first record if it exists, null otherwise
      return data && data.length > 0 ? data[0] : null;
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organizationName: "Acme Corporation",
      baseCurrency: "USD",
      dateFormat: "MM/DD/YYYY",
      fiscalYearStart: "January",
      timeZone: "UTC",
      logoUrl: "",
    },
  });

  // Update form values when data is loaded
  useEffect(() => {
    if (orgSettings) {
      console.log("[OrganizationSettings] Updating form with fetched data:", orgSettings);
      form.reset({
        organizationName: orgSettings.organization_name || "Acme Corporation",
        baseCurrency: orgSettings.base_currency || "USD",
        dateFormat: "MM/DD/YYYY",
        fiscalYearStart: "January",
        timeZone: "UTC",
        logoUrl: "",
      });
    }
  }, [orgSettings, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("[OrganizationSettings] Form submission started with values:", values);
    
    try {
      // Check authentication before proceeding
      const user = await checkAuthentication();
      if (!user) {
        console.error("[OrganizationSettings] User not authenticated, cannot save settings");
        return;
      }

      console.log("[OrganizationSettings] User authenticated, proceeding with save");

      // If we have existing settings, update them. Otherwise, create new.
      if (orgSettings?.id) {
        console.log("[OrganizationSettings] Updating existing settings with ID:", orgSettings.id);
        
        const { data, error } = await supabase
          .from("organization_settings")
          .update({
            organization_name: values.organizationName,
            base_currency: values.baseCurrency,
          })
          .eq('id', orgSettings.id)
          .select()
          .single();

        console.log("[OrganizationSettings] Update result:", { data, error });

        if (error) {
          logDatabaseError(error, "update organization settings");
          throw error;
        }

        console.log("[OrganizationSettings] Settings updated successfully:", data);
      } else {
        console.log("[OrganizationSettings] Creating new settings record");
        
        const settingsData = {
          organization_name: values.organizationName,
          base_currency: values.baseCurrency,
          created_by: user.id,
        };

        console.log("[OrganizationSettings] Preparing to insert data:", settingsData);

        const { data, error } = await supabase
          .from("organization_settings")
          .insert(settingsData)
          .select()
          .single();

        console.log("[OrganizationSettings] Insert result:", { data, error });

        if (error) {
          logDatabaseError(error, "create organization settings");
          throw error;
        }

        console.log("[OrganizationSettings] Settings created successfully:", data);
      }

      toast({
        title: "Success",
        description: "Organization settings updated successfully",
      });

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["organization_settings"] });
      
    } catch (error: any) {
      console.error("[OrganizationSettings] Error saving settings:", error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to update organization settings",
        variant: "destructive",
      });
    }
  }

  if (isLoading) {
    console.log("[OrganizationSettings] Loading organization settings...");
    return <div>Loading organization settings...</div>;
  }

  if (error) {
    console.error("[OrganizationSettings] Error loading settings:", error);
    return <div>Error loading organization settings</div>;
  }

  console.log("[OrganizationSettings] Rendering component with current form values");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Organization Settings</h2>
        <p className="text-muted-foreground">
          Configure your organization's general settings and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>
            Basic details about your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter organization name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter logo URL" {...field} />
                      </FormControl>
                      <FormDescription>
                        URL to your organization's logo image.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="baseCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Currency *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select base currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">US Dollar (USD)</SelectItem>
                          <SelectItem value="EUR">Euro (EUR)</SelectItem>
                          <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                          <SelectItem value="JPY">Japanese Yen (JPY)</SelectItem>
                          <SelectItem value="CNY">Chinese Yuan (CNY)</SelectItem>
                          <SelectItem value="INR">Indian Rupee (INR)</SelectItem>
                          <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
                          <SelectItem value="AUD">Australian Dollar (AUD)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This will be the default currency for all transactions and pricing.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Format</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select date format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                          <SelectItem value="DD.MM.YYYY">DD.MM.YYYY</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fiscalYearStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fiscal Year Start</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="January">January</SelectItem>
                          <SelectItem value="February">February</SelectItem>
                          <SelectItem value="March">March</SelectItem>
                          <SelectItem value="April">April</SelectItem>
                          <SelectItem value="May">May</SelectItem>
                          <SelectItem value="June">June</SelectItem>
                          <SelectItem value="July">July</SelectItem>
                          <SelectItem value="August">August</SelectItem>
                          <SelectItem value="September">September</SelectItem>
                          <SelectItem value="October">October</SelectItem>
                          <SelectItem value="November">November</SelectItem>
                          <SelectItem value="December">December</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeZone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Zone</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time zone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="EST">Eastern Time (EST)</SelectItem>
                          <SelectItem value="CST">Central Time (CST)</SelectItem>
                          <SelectItem value="MST">Mountain Time (MST)</SelectItem>
                          <SelectItem value="PST">Pacific Time (PST)</SelectItem>
                          <SelectItem value="GMT">Greenwich Mean Time (GMT)</SelectItem>
                          <SelectItem value="IST">Indian Standard Time (IST)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <CardFooter className="px-0 pb-0 pt-6">
                <Button type="submit">Save Changes</Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationSettings;
