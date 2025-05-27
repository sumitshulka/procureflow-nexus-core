
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { VendorRegistration, VendorCommunication, parseAttachments } from '@/types/vendor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Send, MessageSquare, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VendorCommunicationDialogProps {
  vendor: VendorRegistration;
  isOpen: boolean;
  onClose: () => void;
}

const VendorCommunicationDialog: React.FC<VendorCommunicationDialogProps> = ({
  vendor,
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [communications, setCommunications] = useState<VendorCommunication[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen && vendor.id) {
      fetchCommunications();
    }
  }, [isOpen, vendor.id]);

  const fetchCommunications = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('vendor_communications')
        .select('*')
        .eq('vendor_id', vendor.id!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData: VendorCommunication[] = (data || []).map(item => ({
        ...item,
        sender_type: item.sender_type as 'admin' | 'vendor',
        attachments: parseAttachments(item.attachments),
      }));
      
      setCommunications(transformedData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch communications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide both subject and message',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSending(true);
      
      const communicationData = {
        vendor_id: vendor.id!,
        sender_id: user!.id,
        receiver_id: vendor.user_id,
        sender_type: 'admin',
        subject: subject.trim(),
        message: message.trim(),
      };

      const { error } = await supabase
        .from('vendor_communications')
        .insert(communicationData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Message sent successfully',
      });

      setSubject('');
      setMessage('');
      fetchCommunications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Communication with {vendor.company_name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Message History */}
          <div className="flex-1 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading messages...</p>
              </div>
            ) : communications.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No messages yet</p>
                <p className="text-sm text-gray-400">Start a conversation with this vendor</p>
              </div>
            ) : (
              <div className="space-y-3">
                {communications.map((comm) => (
                  <Card key={comm.id} className={`${
                    comm.sender_type === 'admin' ? 'ml-8 bg-blue-50' : 'mr-8 bg-white'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span className="font-medium">
                            {comm.sender_type === 'admin' ? 'Admin' : vendor.signatory_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {comm.created_at && formatDistanceToNow(new Date(comm.created_at), { addSuffix: true })}
                        </div>
                      </div>
                      
                      <h4 className="font-medium text-sm mb-1">{comm.subject}</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{comm.message}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Send Message Form */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <Input
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              
              <div>
                <Textarea
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button 
                  onClick={sendMessage}
                  disabled={isSending || !subject.trim() || !message.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSending ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VendorCommunicationDialog;
