import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VendorCommunication, parseAttachments } from '@/types/vendor';
import { MessageSquare, Send, Eye, Reply, Clock } from 'lucide-react';
import VendorLayout from '@/components/layout/VendorLayout';
import { format } from 'date-fns';

const VendorMessages = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<VendorCommunication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<VendorCommunication | null>(null);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [user?.id]);

  const fetchMessages = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('vendor_communications')
        .select('*')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData: VendorCommunication[] = (data || []).map(item => ({
        ...item,
        sender_type: item.sender_type as 'admin' | 'vendor',
        attachments: parseAttachments(item.attachments),
      }));
      
      setMessages(transformedData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch messages',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('vendor_communications')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;

      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ));
    } catch (error: any) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendReply = async () => {
    if (!selectedMessage || !user?.id) return;
    
    try {
      setIsSending(true);
      
      // Get vendor registration details
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendor_registrations')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (vendorError) throw vendorError;

      const replyData = {
        vendor_id: vendorData.id,
        sender_id: user.id,
        receiver_id: selectedMessage.sender_id,
        sender_type: 'vendor',
        subject: replySubject.trim() || `Re: ${selectedMessage.subject}`,
        message: replyMessage.trim(),
        parent_id: selectedMessage.id,
      };

      const { error } = await supabase
        .from('vendor_communications')
        .insert(replyData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Reply sent successfully',
      });

      setReplyMessage('');
      setReplySubject('');
      setShowReplyDialog(false);
      fetchMessages();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send reply',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const openMessage = (message: VendorCommunication) => {
    setSelectedMessage(message);
    if (!message.is_read) {
      markAsRead(message.id!);
    }
  };

  const getMessageStatusBadge = (message: VendorCommunication) => {
    if (!message.is_read) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">New</Badge>;
    }
    return null;
  };

  return (
    <VendorLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600">Communication with procurement team</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No messages found.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {messages.map((message) => (
              <Card 
                key={message.id} 
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  !message.is_read ? 'border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => openMessage(message)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{message.subject}</h3>
                        {getMessageStatusBadge(message)}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {message.message}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {message.created_at && format(new Date(message.created_at), 'MMM dd, yyyy hh:mm a')}
                        </div>
                        <span>From: {message.sender_type === 'admin' ? 'Procurement Team' : 'You'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Message Detail Dialog */}
        {selectedMessage && (
          <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedMessage.subject}</DialogTitle>
                <DialogDescription>
                  From: {selectedMessage.sender_type === 'admin' ? 'Procurement Team' : 'You'} • 
                  {selectedMessage.created_at && format(new Date(selectedMessage.created_at), 'MMM dd, yyyy hh:mm a')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>
                
                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Attachments:</h4>
                    <ul className="space-y-1">
                      {selectedMessage.attachments.map((attachment, index) => (
                        <li key={index} className="text-sm text-blue-600 hover:underline cursor-pointer">
                          {attachment}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    onClick={() => {
                      setReplySubject(`Re: ${selectedMessage.subject}`);
                      setShowReplyDialog(true);
                    }}
                    size="sm"
                  >
                    <Reply className="w-4 h-4 mr-1" />
                    Reply
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Reply Dialog */}
        <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Reply to Message</DialogTitle>
              <DialogDescription>
                Send a reply to the procurement team
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  placeholder="Reply subject"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply here..."
                  rows={6}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowReplyDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={sendReply} 
                  disabled={isSending || !replyMessage.trim()}
                >
                  {isSending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1" />
                      Send Reply
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </VendorLayout>
  );
};

export default VendorMessages;