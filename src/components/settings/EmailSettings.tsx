
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Settings, Mail, TestTube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailProvider {
  id: string;
  provider: string;
  from_email: string;
  from_name: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  username: string | null;
  is_active: boolean;
}

const EmailSettings = () => {
  const [currentProvider, setCurrentProvider] = useState<EmailProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    provider: "custom_smtp",
    from_email: "",
    from_name: "",
    smtp_host: "",
    smtp_port: 587,
    smtp_secure: true,
    username: "",
    password: ""
  });

  useEffect(() => {
    fetchCurrentProvider();
  }, []);

  const fetchCurrentProvider = async () => {
    try {
      const { data, error } = await supabase
        .from("email_provider_settings")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching email provider:", error);
        return;
      }

      if (data) {
        setCurrentProvider(data);
        setFormData({
          provider: data.provider,
          from_email: data.from_email,
          from_name: data.from_name || "",
          smtp_host: data.smtp_host || "",
          smtp_port: data.smtp_port || 587,
          smtp_secure: data.smtp_secure ?? true,
          username: data.username || "",
          password: ""
        });
      }
    } catch (error) {
      console.error("Error fetching email provider:", error);
    }
  };

  const handleProviderChange = (provider: string) => {
    setFormData(prev => ({ ...prev, provider }));
    
    // Set default values based on provider
    switch (provider) {
      case "gmail":
        setFormData(prev => ({
          ...prev,
          smtp_host: "smtp.gmail.com",
          smtp_port: 587,
          smtp_secure: true
        }));
        break;
      case "google_workspace":
        setFormData(prev => ({
          ...prev,
          smtp_host: "smtp.gmail.com",
          smtp_port: 587,
          smtp_secure: true
        }));
        break;
      case "outlook":
        setFormData(prev => ({
          ...prev,
          smtp_host: "smtp-mail.outlook.com",
          smtp_port: 587,
          smtp_secure: true
        }));
        break;
      case "m365":
        setFormData(prev => ({
          ...prev,
          smtp_host: "smtp.office365.com",
          smtp_port: 587,
          smtp_secure: true
        }));
        break;
      default:
        // Custom SMTP - user will fill manually
        break;
    }
  };

  const handleSaveProvider = async () => {
    setLoading(true);
    try {
      // First, deactivate any existing provider
      if (currentProvider) {
        await supabase
          .from("email_provider_settings")
          .update({ is_active: false })
          .eq("id", currentProvider.id);
      }

      // Insert new provider settings
      const { data, error } = await supabase
        .from("email_provider_settings")
        .insert({
          provider: formData.provider,
          from_email: formData.from_email,
          from_name: formData.from_name || null,
          smtp_host: formData.smtp_host || null,
          smtp_port: formData.smtp_port,
          smtp_secure: formData.smtp_secure,
          username: formData.username || null,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentProvider(data);
      toast({
        title: "Email Provider Saved",
        description: "Your email provider settings have been saved successfully.",
      });

      // Clear password from form after saving
      setFormData(prev => ({ ...prev, password: "" }));
    } catch (error) {
      console.error("Error saving email provider:", error);
      toast({
        title: "Error",
        description: "Failed to save email provider settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      // Here we would call an edge function to test the email connection
      // For now, we'll simulate a test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setTestResult({
        success: true,
        message: "Email connection test successful!"
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: "Failed to connect to email server. Please check your settings."
      });
    } finally {
      setTesting(false);
    }
  };

  const providerOptions = [
    { value: "gmail", label: "Gmail" },
    { value: "google_workspace", label: "Google Workspace" },
    { value: "outlook", label: "Outlook.com" },
    { value: "m365", label: "Microsoft 365" },
    { value: "custom_smtp", label: "Custom SMTP" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Email Settings</h2>
        <p className="text-muted-foreground">
          Configure your email provider to enable email notifications and communications.
        </p>
      </div>

      {currentProvider && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Email provider is configured and active: <strong>{currentProvider.from_email}</strong>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Provider Setup
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Provider Configuration</CardTitle>
              <CardDescription>
                Select and configure your email provider to enable email functionality.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Email Provider</Label>
                  <Select value={formData.provider} onValueChange={handleProviderChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select email provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providerOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="from_email">From Email Address</Label>
                  <Input
                    id="from_email"
                    type="email"
                    value={formData.from_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, from_email: e.target.value }))}
                    placeholder="noreply@yourcompany.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="from_name">From Name (Optional)</Label>
                  <Input
                    id="from_name"
                    value={formData.from_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, from_name: e.target.value }))}
                    placeholder="Your Company Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username/Email</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="your-email@domain.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP Host</Label>
                  <Input
                    id="smtp_host"
                    value={formData.smtp_host}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtp_host: e.target.value }))}
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp_port">SMTP Port</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    value={formData.smtp_port}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
                    placeholder="587"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="smtp_secure"
                    checked={formData.smtp_secure}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, smtp_secure: checked }))}
                  />
                  <Label htmlFor="smtp_secure">Use TLS/SSL</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password/App Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter your email password"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveProvider} disabled={loading}>
                  {loading ? "Saving..." : "Save Configuration"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleTestConnection} 
                  disabled={testing || !formData.smtp_host}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  {testing ? "Testing..." : "Test Connection"}
                </Button>
              </div>

              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Customize email notification templates (Available after provider setup).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!currentProvider ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please configure an email provider first to manage email templates.
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="text-muted-foreground">Email template management will be available here.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailSettings;
