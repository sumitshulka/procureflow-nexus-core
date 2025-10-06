import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CreateAddendumDialog } from "./CreateAddendumDialog";
import { 
  FileText, 
  Eye, 
  Trash2, 
  Calendar,
  Send,
  Settings,
  AlertTriangle
} from "lucide-react";

interface RfpAddendum {
  id: string;
  rfp_id: string;
  addendum_number: number;
  title: string;
  description?: string;
  content?: string;
  attachments: any;
  field_overrides: Record<string, any>;
  published_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_published: boolean;
}

interface RfpAddendumsProps {
  rfpId: string;
  rfpData?: any;
  canManage?: boolean;
}

export const RfpAddendums: React.FC<RfpAddendumsProps> = ({ 
  rfpId,
  rfpData,
  canManage = false 
}) => {
  const { toast } = useToast();
  const [addendums, setAddendums] = useState<RfpAddendum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAddendum, setSelectedAddendum] = useState<RfpAddendum | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchAddendums();
  }, [rfpId]);

  const fetchAddendums = async () => {
    try {
      let query = supabase
        .from('rfp_addendums')
        .select('*')
        .eq('rfp_id', rfpId)
        .order('addendum_number', { ascending: true });

      // If user can't manage, only show published addendums
      if (!canManage) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAddendums((data || []).map(item => ({
        ...item,
        field_overrides: item.field_overrides as Record<string, any>
      })));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch addendums",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async (addendumId: string) => {
    try {
      // First, check if RFP is closed and if we need to reopen it
      const { data: rfpData, error: rfpError } = await supabase
        .from('rfps')
        .select('id, status, updated_at')
        .eq('id', rfpId)
        .single();

      if (rfpError) throw rfpError;

      let shouldReopenRfp = false;

      // If RFP is closed, check if we're within the reopen time limit
      if (rfpData?.status === 'closed') {
        // Get organization settings for time limit
        const { data: orgSettings, error: settingsError } = await supabase
          .from('organization_settings')
          .select('rfp_reopen_time_limit_days')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!settingsError && orgSettings) {
          const timeLimitDays = orgSettings.rfp_reopen_time_limit_days || 30;
          const rfpUpdatedDate = new Date(rfpData.updated_at);
          const now = new Date();
          const daysSinceClosed = Math.floor((now.getTime() - rfpUpdatedDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysSinceClosed <= timeLimitDays) {
            shouldReopenRfp = true;
          } else {
            toast({
              title: "Cannot Reopen RFP",
              description: `This RFP was closed ${daysSinceClosed} days ago. The time limit of ${timeLimitDays} days has expired.`,
              variant: "destructive",
            });
            return;
          }
        }
      }

      // If we need to reopen the RFP, do it first
      if (shouldReopenRfp) {
        const { error: reopenError } = await supabase
          .from('rfps')
          .update({ status: 'published' })
          .eq('id', rfpId);

        if (reopenError) throw reopenError;
      }

      // Now publish the addendum
      const { error } = await supabase
        .from('rfp_addendums')
        .update({
          is_published: true,
          published_at: new Date().toISOString()
        })
        .eq('id', addendumId);

      if (error) throw error;

      toast({
        title: "Success",
        description: shouldReopenRfp 
          ? "Addendum published and RFP has been reopened for submissions"
          : "Addendum published successfully",
      });

      fetchAddendums();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to publish addendum",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (addendumId: string) => {
    try {
      const { error } = await supabase
        .from('rfp_addendums')
        .delete()
        .eq('id', addendumId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Addendum deleted successfully",
      });

      fetchAddendums();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete addendum",
        variant: "destructive",
      });
    }
  };

  const viewAddendum = (addendum: RfpAddendum) => {
    setSelectedAddendum(addendum);
    setIsViewDialogOpen(true);
  };

  if (isLoading) {
    return <div className="p-6">Loading addendums...</div>;
  }

  return (
    <div className="space-y-6">
      {rfpData?.status === 'closed' && canManage && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900">RFP is Closed</h4>
              <p className="text-sm text-amber-700 mt-1">
                This RFP is currently closed. Publishing an addendum will automatically reopen it for vendor submissions if within the configured time limit.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">RFP Addendums</h3>
        
        {canManage && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Create Addendum
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {addendums.map((addendum) => (
          <Card key={addendum.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      Addendum #{addendum.addendum_number}
                    </Badge>
                    <h4 className="font-semibold">{addendum.title}</h4>
                    {addendum.is_published ? (
                      <Badge variant="default">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </div>
                  {addendum.description && (
                    <p className="text-sm text-muted-foreground">{addendum.description}</p>
                  )}
                  {addendum.field_overrides && Object.keys(addendum.field_overrides).length > 0 && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        Overrides {Object.keys(addendum.field_overrides).length} field(s)
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Created: {format(new Date(addendum.created_at), "PPp")}
                    </span>
                    {addendum.published_at && (
                      <span className="flex items-center">
                        <Send className="h-3 w-3 mr-1" />
                        Published: {format(new Date(addendum.published_at), "PPp")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewAddendum(addendum)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  {canManage && (
                    <>
                      {!addendum.is_published && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handlePublish(addendum.id)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Publish
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Addendum</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this addendum? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(addendum.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* View Addendum Dialog */}
      {selectedAddendum && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Badge variant="outline">
                  Addendum #{selectedAddendum.addendum_number}
                </Badge>
                <span>{selectedAddendum.title}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedAddendum.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedAddendum.description}</p>
                </div>
              )}
              
              {selectedAddendum.content && (
                <div>
                  <h4 className="font-medium mb-2">Content</h4>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm">{selectedAddendum.content}</pre>
                  </div>
                </div>
              )}

              {selectedAddendum.field_overrides && Object.keys(selectedAddendum.field_overrides).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Field Overrides</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedAddendum.field_overrides).map(([field, value]) => (
                      <div key={field} className="p-3 bg-muted rounded-md">
                        <div className="font-medium text-sm capitalize">{field.replace(/_/g, ' ')}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-4 text-sm text-muted-foreground pt-4 border-t">
                <span>Created: {format(new Date(selectedAddendum.created_at), "PPP p")}</span>
                {selectedAddendum.published_at && (
                  <span>Published: {format(new Date(selectedAddendum.published_at), "PPP p")}</span>
                )}
                <Badge variant={selectedAddendum.is_published ? "default" : "secondary"}>
                  {selectedAddendum.is_published ? "Published" : "Draft"}
                </Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Addendum Dialog */}
      {rfpData && (
        <CreateAddendumDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          rfpId={rfpId}
          rfpData={rfpData}
          onSuccess={fetchAddendums}
        />
      )}

      {addendums.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No addendums available.</p>
            {canManage && (
              <p className="text-sm text-muted-foreground mt-2">
                Create the first addendum to provide updates and clarifications to vendors.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};