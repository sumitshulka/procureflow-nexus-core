import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const POSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    standard_terms_and_conditions: "",
    standard_specific_instructions: "",
    email_template_subject: "Purchase Order - {{po_number}}",
    email_template_body: `Dear {{vendor_name}},

Please find attached Purchase Order {{po_number}} for your review and processing.

PO Details:
- PO Number: {{po_number}}
- Total Amount: {{total_amount}} {{currency}}
- Expected Delivery: {{expected_delivery}}

Please acknowledge receipt of this PO and confirm the delivery schedule.

Best regards,
{{sender_name}}`,
    po_number_format: {
      prefix: "PO",
      middle_section_type: "year",
      middle_format: "YYYY",
      running_number_digits: 4,
      reset_annually: true,
      fiscal_year_start_month: 1,
      fiscal_year_start_year: new Date().getFullYear(),
      fiscal_year_end_month: 12,
      fiscal_year_end_year: new Date().getFullYear(),
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("standard_po_settings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        const poNumberFormat = data.po_number_format && typeof data.po_number_format === 'object' && !Array.isArray(data.po_number_format)
          ? data.po_number_format as {
              prefix: string;
              middle_section_type: string;
              middle_format: string;
              running_number_digits: number;
              reset_annually: boolean;
              fiscal_year_start_month: number;
              fiscal_year_start_year: number;
              fiscal_year_end_month: number;
              fiscal_year_end_year: number;
            }
          : settings.po_number_format;

        setSettings({
          standard_terms_and_conditions: data.standard_terms_and_conditions || "",
          standard_specific_instructions: data.standard_specific_instructions || "",
          email_template_subject: data.email_template_subject || settings.email_template_subject,
          email_template_body: data.email_template_body || settings.email_template_body,
          po_number_format: poNumberFormat,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save settings",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Check if settings exist
      const { data: existingData } = await supabase
        .from("standard_po_settings")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingData) {
        // Update existing settings
        const { error } = await supabase
          .from("standard_po_settings")
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingData.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from("standard_po_settings")
          .insert({
            ...settings,
            created_by: user.id,
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "PO settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const getPreviewPoNumber = () => {
    const { prefix, middle_section_type, middle_format, running_number_digits } = settings.po_number_format;
    const now = new Date();
    let middlePart = "";
    
    if (middle_section_type === "year") {
      middlePart = middle_format === "YYYY" ? now.getFullYear().toString() : now.getFullYear().toString().slice(-2);
    } else if (middle_section_type === "month") {
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      middlePart = middle_format === "MM-YYYY" ? `${month}-${now.getFullYear()}` : month;
    } else if (middle_section_type === "custom") {
      middlePart = middle_format;
    }
    
    const runningNumber = "1".padStart(running_number_digits, "0");
    return `${prefix}-${middlePart}-${runningNumber}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>PO Number Format</CardTitle>
          <CardDescription>
            Configure how purchase order numbers are generated. Preview: <span className="font-mono font-semibold">{getPreviewPoNumber()}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="po_prefix">Prefix (Standard Text)</Label>
              <Input
                id="po_prefix"
                value={settings.po_number_format.prefix}
                onChange={(e) => setSettings({
                  ...settings,
                  po_number_format: { ...settings.po_number_format, prefix: e.target.value }
                })}
                placeholder="PO"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="middle_section_type">Middle Section Type</Label>
              <select
                id="middle_section_type"
                value={settings.po_number_format.middle_section_type}
                onChange={(e) => {
                  const type = e.target.value;
                  const defaultFormats = {
                    year: "YYYY",
                    month: "MM-YYYY",
                    custom: ""
                  };
                  setSettings({
                    ...settings,
                    po_number_format: {
                      ...settings.po_number_format,
                      middle_section_type: type,
                      middle_format: defaultFormats[type as keyof typeof defaultFormats]
                    }
                  });
                }}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="year">Year</option>
                <option value="month">Month</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <Label htmlFor="middle_format">
                {settings.po_number_format.middle_section_type === "year" && "Year Format"}
                {settings.po_number_format.middle_section_type === "month" && "Month Format"}
                {settings.po_number_format.middle_section_type === "custom" && "Custom Value"}
              </Label>
              {settings.po_number_format.middle_section_type === "year" && (
                <select
                  id="middle_format"
                  value={settings.po_number_format.middle_format}
                  onChange={(e) => setSettings({
                    ...settings,
                    po_number_format: { ...settings.po_number_format, middle_format: e.target.value }
                  })}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="YYYY">YYYY (2025)</option>
                  <option value="YY">YY (25)</option>
                </select>
              )}
              {settings.po_number_format.middle_section_type === "month" && (
                <select
                  id="middle_format"
                  value={settings.po_number_format.middle_format}
                  onChange={(e) => setSettings({
                    ...settings,
                    po_number_format: { ...settings.po_number_format, middle_format: e.target.value }
                  })}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="MM-YYYY">MM-YYYY (01-2025)</option>
                  <option value="MM">MM (01)</option>
                </select>
              )}
              {settings.po_number_format.middle_section_type === "custom" && (
                <Input
                  id="middle_format"
                  value={settings.po_number_format.middle_format}
                  onChange={(e) => setSettings({
                    ...settings,
                    po_number_format: { ...settings.po_number_format, middle_format: e.target.value }
                  })}
                  placeholder="Enter custom value"
                  className="mt-2"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="running_number_digits">Running Number Digits</Label>
              <Input
                id="running_number_digits"
                type="number"
                min="3"
                max="8"
                value={settings.po_number_format.running_number_digits}
                onChange={(e) => setSettings({
                  ...settings,
                  po_number_format: { ...settings.po_number_format, running_number_digits: parseInt(e.target.value) || 4 }
                })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Number of digits for running number (e.g., 4 = 0001)</p>
            </div>

            <div className="flex items-center space-x-2 mt-8">
              <input
                type="checkbox"
                id="reset_annually"
                checked={settings.po_number_format.reset_annually}
                onChange={(e) => setSettings({
                  ...settings,
                  po_number_format: { ...settings.po_number_format, reset_annually: e.target.checked }
                })}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="reset_annually" className="cursor-pointer">Reset running number at end of year</Label>
            </div>
          </div>

          {settings.po_number_format.reset_annually && (
            <div className="border-t pt-4 mt-4">
              <Label className="text-base font-semibold">Fiscal Year Period</Label>
              <p className="text-sm text-muted-foreground mb-4">Define when your fiscal year starts and ends</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fiscal_start">From (Start of Fiscal Year)</Label>
                  <div className="flex gap-2 mt-2">
                    <select
                      id="fiscal_start_month"
                      value={settings.po_number_format.fiscal_year_start_month}
                      onChange={(e) => setSettings({
                        ...settings,
                        po_number_format: { ...settings.po_number_format, fiscal_year_start_month: parseInt(e.target.value) }
                      })}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <option key={month} value={month}>
                          {new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min="2000"
                      max="2100"
                      value={settings.po_number_format.fiscal_year_start_year}
                      onChange={(e) => setSettings({
                        ...settings,
                        po_number_format: { ...settings.po_number_format, fiscal_year_start_year: parseInt(e.target.value) || new Date().getFullYear() }
                      })}
                      className="w-24"
                      placeholder="YYYY"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="fiscal_end">To (End of Fiscal Year)</Label>
                  <div className="flex gap-2 mt-2">
                    <select
                      id="fiscal_end_month"
                      value={settings.po_number_format.fiscal_year_end_month}
                      onChange={(e) => setSettings({
                        ...settings,
                        po_number_format: { ...settings.po_number_format, fiscal_year_end_month: parseInt(e.target.value) }
                      })}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <option key={month} value={month}>
                          {new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min="2000"
                      max="2100"
                      value={settings.po_number_format.fiscal_year_end_year}
                      onChange={(e) => setSettings({
                        ...settings,
                        po_number_format: { ...settings.po_number_format, fiscal_year_end_year: parseInt(e.target.value) || new Date().getFullYear() }
                      })}
                      className="w-24"
                      placeholder="YYYY"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Standard Terms & Instructions</CardTitle>
          <CardDescription>
            Define standard terms and instructions that can be loaded when creating purchase orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="standard_terms">Standard Terms and Conditions</Label>
            <Textarea
              id="standard_terms"
              value={settings.standard_terms_and_conditions}
              onChange={(e) => setSettings({ ...settings, standard_terms_and_conditions: e.target.value })}
              placeholder="Enter standard terms and conditions..."
              rows={8}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="standard_instructions">Standard Specific Instructions</Label>
            <Textarea
              id="standard_instructions"
              value={settings.standard_specific_instructions}
              onChange={(e) => setSettings({ ...settings, standard_specific_instructions: e.target.value })}
              placeholder="Enter standard specific instructions..."
              rows={8}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Template</CardTitle>
          <CardDescription>
            Configure the email template used when sending POs to vendors. Available placeholders: 
            &#123;&#123;po_number&#125;&#125;, &#123;&#123;vendor_name&#125;&#125;, &#123;&#123;total_amount&#125;&#125;, 
            &#123;&#123;currency&#125;&#125;, &#123;&#123;expected_delivery&#125;&#125;, &#123;&#123;sender_name&#125;&#125;
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email_subject">Email Subject</Label>
            <Input
              id="email_subject"
              value={settings.email_template_subject}
              onChange={(e) => setSettings({ ...settings, email_template_subject: e.target.value })}
              placeholder="Purchase Order - {{po_number}}"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="email_body">Email Body</Label>
            <Textarea
              id="email_body"
              value={settings.email_template_body}
              onChange={(e) => setSettings({ ...settings, email_template_body: e.target.value })}
              placeholder="Enter email body..."
              rows={12}
              className="mt-2 font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default POSettings;
