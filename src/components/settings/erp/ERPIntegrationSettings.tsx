import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, RefreshCw, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import ERPIntegrationDialog from "./ERPIntegrationDialog";
import ERPSyncLogs from "./ERPSyncLogs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ERP_TYPE_LABELS: Record<string, { name: string; description: string }> = {
  sap_s4hana: { name: "SAP S/4HANA", description: "Enterprise ERP for large organizations" },
  sap_business_one: { name: "SAP Business One", description: "ERP for small and medium businesses" },
  oracle_netsuite: { name: "Oracle NetSuite", description: "Cloud-based ERP suite" },
  oracle_fusion: { name: "Oracle Fusion Cloud", description: "Enterprise cloud applications" },
  microsoft_dynamics_365: { name: "Microsoft Dynamics 365", description: "Business applications platform" },
  microsoft_dynamics_nav: { name: "Microsoft Dynamics NAV", description: "Business management solution" },
  sage_intacct: { name: "Sage Intacct", description: "Cloud financial management" },
  quickbooks_enterprise: { name: "QuickBooks Enterprise", description: "Accounting software" },
  tally_prime: { name: "Tally Prime", description: "Business management software" },
  custom_rest: { name: "Custom REST API", description: "Custom integration via REST endpoints" },
};

const ERPIntegrationSettings = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState<string | null>(null);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["erp-integrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("erp_integrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("erp_integrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Integration deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["erp-integrations"] });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to delete integration: " + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("erp_integrations")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      toast.success(`Integration ${isActive ? "activated" : "deactivated"}`);
      queryClient.invalidateQueries({ queryKey: ["erp-integrations"] });
    },
    onError: (error: any) => {
      toast.error("Failed to update integration: " + error.message);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const { data, error } = await supabase.functions.invoke("erp-sync", {
        body: { integrationId, action: "sync_all" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Sync completed: ${data.synced || 0} records processed`);
      queryClient.invalidateQueries({ queryKey: ["erp-integrations"] });
      queryClient.invalidateQueries({ queryKey: ["erp-sync-logs"] });
    },
    onError: (error: any) => {
      toast.error("Sync failed: " + error.message);
    },
  });

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "in_progress":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleEdit = (integration: any) => {
    setEditingIntegration(integration);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setIntegrationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingIntegration(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">ERP Integrations</h2>
          <p className="text-muted-foreground">
            Connect to ERP systems to sync invoices and purchase orders for accounting.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Integration
        </Button>
      </div>

      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading integrations...
              </CardContent>
            </Card>
          ) : !integrations?.length ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">
                  No ERP integrations configured yet. Add your first integration to start syncing data.
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Integration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {integrations.map((integration) => (
                <Card key={integration.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {integration.name}
                          <Badge variant={integration.is_active ? "default" : "secondary"}>
                            {integration.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {ERP_TYPE_LABELS[integration.erp_type]?.name || integration.erp_type}
                          {integration.description && ` — ${integration.description}`}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {integration.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => syncMutation.mutate(integration.id)}
                            disabled={syncMutation.isPending}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                            Sync Now
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleEdit(integration)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(integration.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Base URL</p>
                        <p className="font-mono text-xs truncate">{integration.base_url}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Sync Entities</p>
                        <div className="flex gap-1 flex-wrap mt-1">
                          {integration.sync_invoices && <Badge variant="outline" className="text-xs">Invoices</Badge>}
                          {integration.sync_purchase_orders && <Badge variant="outline" className="text-xs">POs</Badge>}
                          {integration.sync_vendors && <Badge variant="outline" className="text-xs">Vendors</Badge>}
                          {integration.sync_products && <Badge variant="outline" className="text-xs">Products</Badge>}
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Sync</p>
                        <div className="flex items-center gap-1 mt-1">
                          {getStatusIcon(integration.last_sync_status)}
                          <span>
                            {integration.last_sync_at
                              ? new Date(integration.last_sync_at).toLocaleString()
                              : "Never"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Auto Sync</p>
                        <p>
                          {integration.auto_sync
                            ? `Every ${integration.sync_frequency_minutes} min`
                            : "Manual"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: integration.id,
                            isActive: !integration.is_active,
                          })
                        }
                      >
                        {integration.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <ERPSyncLogs />
        </TabsContent>
      </Tabs>

      <ERPIntegrationDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        integration={editingIntegration}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Integration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ERP integration? This will also delete all sync logs associated with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => integrationToDelete && deleteMutation.mutate(integrationToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ERPIntegrationSettings;
