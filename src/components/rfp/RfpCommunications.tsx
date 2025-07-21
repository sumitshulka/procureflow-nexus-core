import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  MessageSquare, 
  Plus, 
  Send, 
  FileText, 
  Building, 
  User,
  Clock,
  Reply,
  Eye,
  Globe
} from "lucide-react";

interface RfpCommunication {
  id: string;
  rfp_id: string;
  parent_id?: string;
  sender_type: 'vendor' | 'organization';
  sender_id: string;
  recipient_type?: 'vendor' | 'organization' | 'all_vendors';
  recipient_id?: string;
  subject: string;
  message: string;
  attachments: any[];
  is_public: boolean;
  is_clarification: boolean;
  status: 'sent' | 'read' | 'replied';
  created_at: string;
  updated_at: string;
  sender_name?: string;
  recipient_name?: string;
  replies?: RfpCommunication[];
}

interface Vendor {
  id: string;
  company_name: string;
  user_id: string;
}

interface RfpCommunicationsProps {
  rfpId: string;
  userRole?: string;
  isVendor?: boolean;
}

export const RfpCommunications: React.FC<RfpCommunicationsProps> = ({ 
  rfpId, 
  userRole = 'organization',
  isVendor = false 
}) => {
  const { toast } = useToast();
  const [communications, setCommunications] = useState<RfpCommunication[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCommunication, setSelectedCommunication] = useState<RfpCommunication | null>(null);
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    recipient_type: 'all_vendors' as 'vendor' | 'organization' | 'all_vendors',
    recipient_id: '',
    is_public: false,
    is_clarification: false
  });

  useEffect(() => {
    fetchCommunications();
    if (!isVendor) {
      fetchVendors();
    }
  }, [rfpId]);

  const fetchCommunications = async () => {
    try {
      const { data, error } = await supabase
        .from('rfp_communications')
        .select(`
          id,
          rfp_id,
          parent_id,
          sender_type,
          sender_id,
          recipient_type,
          recipient_id,
          subject,
          message,
          attachments,
          is_public,
          is_clarification,
          status,
          created_at,
          updated_at
        `)
        .eq('rfp_id', rfpId)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch sender names separately based on sender_type
      const communicationsWithNames = await Promise.all(
        (data || []).map(async (comm) => {
          let senderName = 'Unknown';
          
          if (comm.sender_type === 'vendor') {
            const { data: vendorData } = await supabase
              .from('vendor_registrations')
              .select('company_name')
              .eq('user_id', comm.sender_id)
              .single();
            senderName = vendorData?.company_name || 'Unknown Vendor';
          } else {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', comm.sender_id)
              .single();
            senderName = profileData?.full_name || 'Organization';
          }

          // Fetch replies
          const { data: replies } = await supabase
            .from('rfp_communications')
            .select(`
              id,
              rfp_id,
              parent_id,
              sender_type,
              sender_id,
              recipient_type,
              recipient_id,
              subject,
              message,
              attachments,
              is_public,
              is_clarification,
              status,
              created_at,
              updated_at
            `)
            .eq('parent_id', comm.id)
            .order('created_at', { ascending: true });

          const repliesWithNames = await Promise.all(
            (replies || []).map(async (reply) => {
              let replySenderName = 'Unknown';
              
              if (reply.sender_type === 'vendor') {
                const { data: vendorData } = await supabase
                  .from('vendor_registrations')
                  .select('company_name')
                  .eq('user_id', reply.sender_id)
                  .single();
                replySenderName = vendorData?.company_name || 'Unknown Vendor';
              } else {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', reply.sender_id)
                  .single();
                replySenderName = profileData?.full_name || 'Organization';
              }

              return {
                ...reply,
                sender_name: replySenderName
              } as RfpCommunication;
            })
          );

          return {
            ...comm,
            sender_name: senderName,
            replies: repliesWithNames
          } as RfpCommunication;
        })
      );

      setCommunications(communicationsWithNames);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch communications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_registrations')
        .select('id, company_name, user_id')
        .eq('status', 'approved');

      if (error) throw error;
      setVendors(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch vendors",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let recipientId = null;
      if (formData.recipient_type === 'vendor' && formData.recipient_id) {
        recipientId = formData.recipient_id;
      }

      const { error } = await supabase
        .from('rfp_communications')
        .insert({
          rfp_id: rfpId,
          sender_type: isVendor ? 'vendor' : 'organization',
          sender_id: user.id,
          recipient_type: formData.recipient_type,
          recipient_id: recipientId,
          subject: formData.subject,
          message: formData.message,
          is_public: formData.is_public,
          is_clarification: formData.is_clarification
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Communication sent successfully",
      });

      setFormData({
        subject: '',
        message: '',
        recipient_type: 'all_vendors',
        recipient_id: '',
        is_public: false,
        is_clarification: false
      });
      setIsDialogOpen(false);
      fetchCommunications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send communication",
        variant: "destructive",
      });
    }
  };

  const handleReply = async (parentId: string, replyMessage: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const parentComm = communications.find(c => c.id === parentId);
      if (!parentComm) return;

      const { error } = await supabase
        .from('rfp_communications')
        .insert({
          rfp_id: rfpId,
          parent_id: parentId,
          sender_type: isVendor ? 'vendor' : 'organization',
          sender_id: user.id,
          recipient_type: parentComm.sender_type,
          recipient_id: parentComm.sender_id,
          subject: `Re: ${parentComm.subject}`,
          message: replyMessage,
          is_public: parentComm.is_public,
          is_clarification: parentComm.is_clarification
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reply sent successfully",
      });

      setIsReplyDialogOpen(false);
      setSelectedCommunication(null);
      fetchCommunications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'sent': return 'default';
      case 'read': return 'secondary';
      case 'replied': return 'outline';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading communications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">RFP Communications</h3>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Communication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Communication</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isVendor && (
                <div>
                  <Label htmlFor="recipient_type">Recipient</Label>
                  <Select 
                    value={formData.recipient_type} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, recipient_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_vendors">All Vendors</SelectItem>
                      <SelectItem value="vendor">Specific Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.recipient_type === 'vendor' && !isVendor && (
                <div>
                  <Label htmlFor="recipient_id">Select Vendor</Label>
                  <Select 
                    value={formData.recipient_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, recipient_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.user_id}>
                          {vendor.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter subject"
                  required
                />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter your message"
                  rows={6}
                  required
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_public"
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                  />
                  <Label htmlFor="is_public">Make Public</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_clarification"
                    checked={formData.is_clarification}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_clarification: checked }))}
                  />
                  <Label htmlFor="is_clarification">Clarification</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Communications</TabsTrigger>
          <TabsTrigger value="clarifications">Clarifications</TabsTrigger>
          <TabsTrigger value="public">Public</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {communications.map((communication) => (
            <Card key={communication.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold">{communication.subject}</h4>
                      {communication.is_public && (
                        <Badge variant="secondary">
                          <Globe className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      )}
                      {communication.is_clarification && (
                        <Badge variant="outline">
                          <FileText className="h-3 w-3 mr-1" />
                          Clarification
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        {communication.sender_type === 'vendor' ? (
                          <Building className="h-3 w-3 mr-1" />
                        ) : (
                          <User className="h-3 w-3 mr-1" />
                        )}
                        From: {communication.sender_name}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {format(new Date(communication.created_at), "PPp")}
                      </span>
                      <Badge variant={getStatusBadgeVariant(communication.status)}>
                        {communication.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCommunication(communication);
                      setIsReplyDialogOpen(true);
                    }}
                  >
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{communication.message}</p>
                
                {communication.replies && communication.replies.length > 0 && (
                  <div className="border-t pt-4 space-y-3">
                    <h5 className="font-medium text-sm">Replies ({communication.replies.length})</h5>
                    {communication.replies.map((reply) => (
                      <div key={reply.id} className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {reply.sender_type === 'vendor' ? reply.sender_name : 'Organization'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(reply.created_at), "PPp")}
                          </span>
                        </div>
                        <p className="text-sm">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="clarifications" className="space-y-4">
          {communications
            .filter(c => c.is_clarification)
            .map((communication) => (
              <Card key={communication.id}>
                {/* Same card structure as above */}
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="public" className="space-y-4">
          {communications
            .filter(c => c.is_public)
            .map((communication) => (
              <Card key={communication.id}>
                {/* Same card structure as above */}
              </Card>
            ))}
        </TabsContent>
      </Tabs>

      {/* Reply Dialog */}
      {selectedCommunication && (
        <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reply to: {selectedCommunication.subject}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const replyMessage = formData.get('reply_message') as string;
              handleReply(selectedCommunication.id, replyMessage);
            }} className="space-y-4">
              <div>
                <Label htmlFor="reply_message">Your Reply</Label>
                <Textarea
                  id="reply_message"
                  name="reply_message"
                  placeholder="Enter your reply"
                  rows={4}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsReplyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Send className="h-4 w-4 mr-2" />
                  Send Reply
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {communications.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No communications yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};