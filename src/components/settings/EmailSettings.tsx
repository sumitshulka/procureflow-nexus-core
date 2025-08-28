import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Settings, Mail, TestTube, Edit, Trash2, Plus, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEmailService } from "@/hooks/useEmailService";

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

interface TestStep {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
}

const EmailSettings = () => {
  const [currentProvider, setCurrentProvider] = useState<EmailProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const { toast } = useToast();
  const { sendTestEmail } = useEmailService();

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
        .select("id, provider, from_email, from_name, smtp_host, smtp_port, smtp_secure, username, is_active")
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
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
      // First, deactivate ALL existing active providers to avoid unique constraint violation
      await supabase
        .from("email_provider_settings")
        .update({ is_active: false })
        .eq("is_active", true);

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
          smtp_password: formData.password || null,
          is_active: true
        })
        .select("id, provider, from_email, from_name, smtp_host, smtp_port, smtp_secure, username, is_active")
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
    if (!currentProvider) return;
    
    setTesting(true);
    setTestResult(null);
    setTestDialogOpen(true);
    
    // Initialize test steps - including actual email sending
    const steps: TestStep[] = [
      { step: 'Validating configuration', status: 'pending', message: 'Checking SMTP settings...' },
      { step: 'Testing SMTP connectivity', status: 'pending', message: 'Connecting to SMTP server...' },
      { step: 'Sending test email', status: 'pending', message: 'Waiting for test email address...' }
    ];
    
    setTestSteps([...steps]);
    
    try {
      // Step 1: Validate configuration
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!currentProvider.smtp_host || !currentProvider.smtp_port) {
        steps[0].status = 'error';
        steps[0].message = 'Missing SMTP host or port configuration';
        setTestSteps([...steps]);
        setTestResult({
          success: false,
          message: 'Configuration validation failed'
        });
        return;
      }
      
      steps[0].status = 'success';
      steps[0].message = 'Configuration validated successfully';
      setTestSteps([...steps]);
      
      // Step 2: Test SMTP connectivity
      await new Promise(resolve => setTimeout(resolve, 1000));
      const { data, error } = await supabase.functions.invoke('test-email-connection', {
        body: {
          smtp_host: currentProvider.smtp_host,
          smtp_port: currentProvider.smtp_port,
          smtp_secure: currentProvider.smtp_secure,
          username: currentProvider.username,
          from_email: currentProvider.from_email
        }
      });

      if (error) throw error;

      if (data.success) {
        steps[1].status = 'success';
        steps[1].message = data.message || 'Successfully connected to SMTP server';
        setTestSteps([...steps]);
        
        // Step 3: Wait for user to provide test email
        steps[2].status = 'pending';
        steps[2].message = 'Please enter an email address below to test email sending';
        setTestSteps([...steps]);
        
        setTestResult({
          success: true,
          message: 'SMTP connection successful! You can now test email sending by entering an email address below.'
        });
      } else {
        steps[1].status = 'error';
        steps[1].message = data.message || 'Connection failed';
        setTestSteps([...steps]);
        
        setTestResult({
          success: false,
          message: data.message || 'SMTP connection test failed'
        });
      }
    } catch (error: any) {
      const currentStep = steps.findIndex(s => s.status === 'pending');
      if (currentStep >= 0) {
        steps[currentStep].status = 'error';
        steps[currentStep].message = error.message || 'Test failed';
        setTestSteps([...steps]);
      }
      
      setTestResult({
        success: false,
        message: error.message || 'Connection test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setSendingTestEmail(true);
    
    // Update the test steps to show email sending in progress
    const updatedSteps = [...testSteps];
    const emailStepIndex = updatedSteps.findIndex(step => step.step === 'Sending test email');
    if (emailStepIndex >= 0) {
      updatedSteps[emailStepIndex].status = 'pending';
      updatedSteps[emailStepIndex].message = `Sending test email to ${testEmail}...`;
      setTestSteps(updatedSteps);
    }

    try {
      const result = await sendTestEmail(testEmail);
      
      if (result.success) {
        updatedSteps[emailStepIndex].status = 'success';
        updatedSteps[emailStepIndex].message = `Test email sent successfully to ${testEmail}`;
        setTestSteps(updatedSteps);
        
        toast({
          title: "Test Email Sent",
          description: `Check your inbox at ${testEmail}`,
        });
      } else {
        updatedSteps[emailStepIndex].status = 'error';
        updatedSteps[emailStepIndex].message = result.message || 'Failed to send test email';
        setTestSteps(updatedSteps);
      }
    } catch (error: any) {
      updatedSteps[emailStepIndex].status = 'error';
      updatedSteps[emailStepIndex].message = error.message || 'Failed to send test email';
      setTestSteps(updatedSteps);
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleTestFormConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-email-connection', {
        body: {
          smtp_host: formData.smtp_host,
          smtp_port: formData.smtp_port,
          smtp_secure: formData.smtp_secure,
          username: formData.username,
          password: formData.password,
          from_email: formData.from_email
        }
      });

      if (error) throw error;

      setTestResult({
        success: data.success,
        message: data.message
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || "Failed to connect to email server. Please check your settings."
      });
    } finally {
      setTesting(false);
    }
  };

  const handleEdit = () => {
    // Reset form with current provider data for editing and show form
    if (currentProvider) {
      setFormData({
        provider: currentProvider.provider,
        from_email: currentProvider.from_email,
        from_name: currentProvider.from_name || "",
        smtp_host: currentProvider.smtp_host || "",
        smtp_port: currentProvider.smtp_port || 587,
        smtp_secure: currentProvider.smtp_secure ?? true,
        username: currentProvider.username || "",
        password: ""
      });
      // Temporarily hide the config card to show the form
      setCurrentProvider(null);
    }
  };

  const handleDelete = async () => {
    if (!currentProvider) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("email_provider_settings")
        .delete()
        .eq("id", currentProvider.id);

      if (error) throw error;

      setCurrentProvider(null);
      setFormData({
        provider: "custom_smtp",
        from_email: "",
        from_name: "",
        smtp_host: "",
        smtp_port: 587,
        smtp_secure: true,
        username: "",
        password: ""
      });

      toast({
        title: "Email Provider Deleted",
        description: "Your email provider configuration has been removed.",
      });
    } catch (error) {
      console.error("Error deleting email provider:", error);
      toast({
        title: "Error",
        description: "Failed to delete email provider configuration.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          {currentProvider ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Email Provider Configuration
                  <div className="flex gap-2">
                    <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={handleTestConnection} className="flex items-center gap-2" disabled={testing}>
                          <TestTube className="h-4 w-4" />
                          Test Connection
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Testing Email Connection</DialogTitle>
                          <DialogDescription>We will validate configuration and attempt to connect to your SMTP server.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          {testSteps.map((step, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                              <div className="flex-shrink-0 mt-0.5">
                                {step.status === 'pending' && testing && (
                                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                )}
                                {step.status === 'success' && (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                )}
                                {step.status === 'error' && (
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                )}
                                {step.status === 'pending' && !testing && (
                                  <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm">{step.step}</div>
                                <div className={`text-sm ${
                                  step.status === 'error' ? 'text-red-600' : 
                                  step.status === 'success' ? 'text-green-600' : 
                                  'text-gray-600'
                                }`}>
                                  {step.message}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {testResult && testResult.success && (
                            <div className="space-y-3 pt-4 border-t">
                              <div>
                                <Label htmlFor="test-email" className="text-sm font-medium">
                                  Test Email Address
                                </Label>
                                <div className="flex gap-2 mt-1">
                                  <Input
                                    id="test-email"
                                    type="email"
                                    placeholder="Enter email to test sending"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    className="flex-1"
                                  />
                                  <Button 
                                    onClick={handleSendTestEmail} 
                                    disabled={sendingTestEmail || !testEmail}
                                    className="flex items-center gap-2"
                                  >
                                    <Send className="h-4 w-4" />
                                    {sendingTestEmail ? "Sending..." : "Send Test"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                          
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
                          
                          {!testing && testSteps.length > 0 && (
                            <div className="flex justify-end">
                              <Button onClick={() => setTestDialogOpen(false)}>
                                Close
                              </Button>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm" onClick={handleEdit} className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDelete} className="flex items-center gap-2" disabled={loading}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Your active email provider configuration.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Provider</Label>
                    <p className="text-sm mt-1 capitalize">{currentProvider.provider.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">From Email</Label>
                    <p className="text-sm mt-1">{currentProvider.from_email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">From Name</Label>
                    <p className="text-sm mt-1">{currentProvider.from_name || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">SMTP Host</Label>
                    <p className="text-sm mt-1">{currentProvider.smtp_host}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">SMTP Port</Label>
                    <p className="text-sm mt-1">{currentProvider.smtp_port}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Security</Label>
                    <p className="text-sm mt-1">{currentProvider.smtp_secure ? "TLS/SSL Enabled" : "No encryption"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                    <p className="text-sm mt-1">{currentProvider.username || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <p className="text-sm text-green-600">Active</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Setup Email Provider
                </CardTitle>
                <CardDescription>
                  Configure your email provider to enable email functionality.
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
                    onClick={handleTestFormConnection} 
                    disabled={testing || !formData.smtp_host || !formData.password}
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
          )}
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