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
        setSettings({
          standard_terms_and_conditions: data.standard_terms_and_conditions || "",
          standard_specific_instructions: data.standard_specific_instructions || "",
          email_template_subject: data.email_template_subject || settings.email_template_subject,
          email_template_body: data.email_template_body || settings.email_template_body,
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

  return (
    <div className="space-y-6">
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
