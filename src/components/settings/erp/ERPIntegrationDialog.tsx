import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const ERP_TYPES = [
  { value: "sap_s4hana", label: "SAP S/4HANA" },
  { value: "sap_business_one", label: "SAP Business One" },
  { value: "oracle_netsuite", label: "Oracle NetSuite" },
  { value: "oracle_fusion", label: "Oracle Fusion Cloud" },
  { value: "microsoft_dynamics_365", label: "Microsoft Dynamics 365" },
  { value: "microsoft_dynamics_nav", label: "Microsoft Dynamics NAV" },
  { value: "sage_intacct", label: "Sage Intacct" },
  { value: "quickbooks_enterprise", label: "QuickBooks Enterprise" },
  { value: "tally_prime", label: "Tally Prime" },
  { value: "custom_rest", label: "Custom REST API" },
];

const AUTH_TYPES = [
  { value: "api_key", label: "API Key" },
  { value: "bearer", label: "Bearer Token" },
  { value: "basic", label: "Basic Auth" },
  { value: "oauth2", label: "OAuth 2.0" },
];

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  erp_type: z.enum(["sap_s4hana", "sap_business_one", "oracle_netsuite", "oracle_fusion", "microsoft_dynamics_365", "microsoft_dynamics_nav", "sage_intacct", "quickbooks_enterprise", "tally_prime", "custom_rest"]),
  description: z.string().optional(),
  base_url: z.string().url("Must be a valid URL"),
  auth_type: z.string().min(1, "Auth type is required"),
  auth_config: z.object({
    api_key: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    bearer_token: z.string().optional(),
    client_id: z.string().optional(),
    client_secret: z.string().optional(),
    token_url: z.string().optional(),
  }),
  sync_invoices: z.boolean(),
  sync_purchase_orders: z.boolean(),
  sync_vendors: z.boolean(),
  sync_products: z.boolean(),
  auto_sync: z.boolean(),
  sync_frequency_minutes: z.number().min(5).max(1440),
  request_timeout_seconds: z.number().min(5).max(120),
  retry_attempts: z.number().min(0).max(10),
  endpoint_mappings: z.object({
    invoice: z.object({
      create: z.string(),
      update: z.string(),
      method: z.string(),
    }),
    purchase_order: z.object({
      create: z.string(),
      update: z.string(),
      method: z.string(),
    }),
  }),
  field_mappings: z.object({
    invoice: z.record(z.string()),
    purchase_order: z.record(z.string()),
  }),
  request_headers: z.record(z.string()),
});

type FormData = z.infer<typeof formSchema>;

interface ERPIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration?: any;
}

const DEFAULT_ENDPOINT_MAPPINGS = {
  invoice: { create: "/api/invoices", update: "/api/invoices/{id}", method: "POST" },
  purchase_order: { create: "/api/purchase-orders", update: "/api/purchase-orders/{id}", method: "POST" },
};

const DEFAULT_FIELD_MAPPINGS = {
  invoice: {
    invoice_number: "documentNumber",
    vendor_id: "vendorId",
    total_amount: "totalAmount",
    tax_amount: "taxAmount",
    invoice_date: "documentDate",
    due_date: "dueDate",
    status: "status",
  },
  purchase_order: {
    po_number: "documentNumber",
    vendor_id: "vendorId",
    total_amount: "totalAmount",
    po_date: "documentDate",
    status: "status",
  },
};

const ERPIntegrationDialog: React.FC<ERPIntegrationDialogProps> = ({
  open,
  onOpenChange,
  integration,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      erp_type: "custom_rest",
      description: "",
      base_url: "",
      auth_type: "api_key",
      auth_config: {},
      sync_invoices: true,
      sync_purchase_orders: true,
      sync_vendors: false,
      sync_products: false,
      auto_sync: false,
      sync_frequency_minutes: 60,
      request_timeout_seconds: 30,
      retry_attempts: 3,
      endpoint_mappings: DEFAULT_ENDPOINT_MAPPINGS,
      field_mappings: DEFAULT_FIELD_MAPPINGS,
      request_headers: {},
    },
  });

  const isEditing = !!integration;

  useEffect(() => {
    if (integration) {
      form.reset({
        name: integration.name,
        erp_type: integration.erp_type,
        description: integration.description || "",
        base_url: integration.base_url,
        auth_type: integration.auth_type,
        auth_config: integration.auth_config || {},
        sync_invoices: integration.sync_invoices,
        sync_purchase_orders: integration.sync_purchase_orders,
        sync_vendors: integration.sync_vendors,
        sync_products: integration.sync_products,
        auto_sync: integration.auto_sync,
        sync_frequency_minutes: integration.sync_frequency_minutes,
        request_timeout_seconds: integration.request_timeout_seconds,
        retry_attempts: integration.retry_attempts,
        endpoint_mappings: integration.endpoint_mappings || DEFAULT_ENDPOINT_MAPPINGS,
        field_mappings: integration.field_mappings || DEFAULT_FIELD_MAPPINGS,
        request_headers: integration.request_headers || {},
      });
    } else {
      form.reset({
        name: "",
        erp_type: "custom_rest",
        description: "",
        base_url: "",
        auth_type: "api_key",
        auth_config: {},
        sync_invoices: true,
        sync_purchase_orders: true,
        sync_vendors: false,
        sync_products: false,
        auto_sync: false,
        sync_frequency_minutes: 60,
        request_timeout_seconds: 30,
        retry_attempts: 3,
        endpoint_mappings: DEFAULT_ENDPOINT_MAPPINGS,
        field_mappings: DEFAULT_FIELD_MAPPINGS,
        request_headers: {},
      });
    }
  }, [integration, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (isEditing) {
        const { error } = await supabase
          .from("erp_integrations")
          .update({
            ...data,
            created_by: user?.id,
          })
          .eq("id", integration.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("erp_integrations").insert({
          name: data.name,
          erp_type: data.erp_type,
          base_url: data.base_url,
          description: data.description,
          auth_type: data.auth_type,
          auth_config: data.auth_config,
          sync_invoices: data.sync_invoices,
          sync_purchase_orders: data.sync_purchase_orders,
          sync_vendors: data.sync_vendors,
          sync_products: data.sync_products,
          auto_sync: data.auto_sync,
          sync_frequency_minutes: data.sync_frequency_minutes,
          request_timeout_seconds: data.request_timeout_seconds,
          retry_attempts: data.retry_attempts,
          endpoint_mappings: data.endpoint_mappings,
          field_mappings: data.field_mappings,
          request_headers: data.request_headers,
          created_by: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`Integration ${isEditing ? "updated" : "created"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["erp-integrations"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to save integration: ${error.message}`);
    },
  });

  const authType = form.watch("auth_type");
  const erpType = form.watch("erp_type");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit" : "Add"} ERP Integration</DialogTitle>
          <DialogDescription>
            Configure connection settings to sync data with your ERP system.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="auth">Authentication</TabsTrigger>
                <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
                <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Integration Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Production ERP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="erp_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ERP Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select ERP type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ERP_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Textarea placeholder="Optional description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="base_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://api.erp-system.com" {...field} />
                      </FormControl>
                      <FormDescription>The base URL for all API calls</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <h4 className="font-medium">Sync Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sync_invoices"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel>Sync Invoices</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sync_purchase_orders"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel>Sync Purchase Orders</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sync_vendors"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel>Sync Vendors</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sync_products"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel>Sync Products</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="auto_sync"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel>Auto Sync</FormLabel>
                          <FormDescription>Automatically sync on schedule</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sync_frequency_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sync Frequency (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="request_timeout_seconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Request Timeout (seconds)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="retry_attempts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retry Attempts</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="auth" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="auth_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authentication Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select auth type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AUTH_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {authType === "api_key" && (
                  <FormField
                    control={form.control}
                    name="auth_config.api_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Your API key" {...field} />
                        </FormControl>
                        <FormDescription>
                          The API key will be sent in the X-API-Key header
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {authType === "bearer" && (
                  <FormField
                    control={form.control}
                    name="auth_config.bearer_token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bearer Token</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Bearer token" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {authType === "basic" && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="auth_config.username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="auth_config.password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {authType === "oauth2" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="auth_config.client_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Client ID" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="auth_config.client_secret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client Secret</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Client Secret" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="auth_config.token_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Token URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://api.erp.com/oauth/token" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Custom Headers</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add custom headers to be sent with every request. Format: one header per line as "Header-Name: value"
                  </p>
                  <Textarea
                    placeholder="X-Custom-Header: value&#10;Content-Type: application/json"
                    value={Object.entries(form.watch("request_headers") || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("\n")}
                    onChange={(e) => {
                      const headers: Record<string, string> = {};
                      e.target.value.split("\n").forEach((line) => {
                        const [key, ...valueParts] = line.split(":");
                        if (key?.trim() && valueParts.length > 0) {
                          headers[key.trim()] = valueParts.join(":").trim();
                        }
                      });
                      form.setValue("request_headers", headers);
                    }}
                    rows={4}
                  />
                </div>
              </TabsContent>

              <TabsContent value="endpoints" className="space-y-4 mt-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Configure the API endpoints for each entity type. Use <code>{"{id}"}</code> as placeholder for entity IDs.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Invoice Endpoints</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="endpoint_mappings.invoice.create"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Create Endpoint</FormLabel>
                          <FormControl>
                            <Input placeholder="/api/invoices" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endpoint_mappings.invoice.update"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Update Endpoint</FormLabel>
                          <FormControl>
                            <Input placeholder="/api/invoices/{id}" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endpoint_mappings.invoice.method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HTTP Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="POST">POST</SelectItem>
                              <SelectItem value="PUT">PUT</SelectItem>
                              <SelectItem value="PATCH">PATCH</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Purchase Order Endpoints</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="endpoint_mappings.purchase_order.create"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Create Endpoint</FormLabel>
                          <FormControl>
                            <Input placeholder="/api/purchase-orders" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endpoint_mappings.purchase_order.update"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Update Endpoint</FormLabel>
                          <FormControl>
                            <Input placeholder="/api/purchase-orders/{id}" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endpoint_mappings.purchase_order.method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HTTP Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="POST">POST</SelectItem>
                              <SelectItem value="PUT">PUT</SelectItem>
                              <SelectItem value="PATCH">PATCH</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mappings" className="space-y-4 mt-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Map your system fields to ERP fields. Format: one mapping per line as "our_field: erp_field"
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Invoice Field Mappings</h4>
                  <Textarea
                    placeholder="invoice_number: documentNumber&#10;total_amount: totalAmount&#10;vendor_id: vendorCode"
                    value={Object.entries(form.watch("field_mappings.invoice") || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("\n")}
                    onChange={(e) => {
                      const mappings: Record<string, string> = {};
                      e.target.value.split("\n").forEach((line) => {
                        const [key, value] = line.split(":").map((s) => s.trim());
                        if (key && value) {
                          mappings[key] = value;
                        }
                      });
                      form.setValue("field_mappings.invoice", mappings);
                    }}
                    rows={6}
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Purchase Order Field Mappings</h4>
                  <Textarea
                    placeholder="po_number: documentNumber&#10;total_amount: totalAmount&#10;vendor_id: vendorCode"
                    value={Object.entries(form.watch("field_mappings.purchase_order") || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("\n")}
                    onChange={(e) => {
                      const mappings: Record<string, string> = {};
                      e.target.value.split("\n").forEach((line) => {
                        const [key, value] = line.split(":").map((s) => s.trim());
                        if (key && value) {
                          mappings[key] = value;
                        }
                      });
                      form.setValue("field_mappings.purchase_order", mappings);
                    }}
                    rows={6}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ERPIntegrationDialog;
