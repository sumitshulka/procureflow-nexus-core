import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VendorCommunication, parseAttachments } from '@/types/vendor';
import { MessageSquare, Send, Eye, Reply, Clock, X, Filter, Calendar } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

interface ConversationGroup {
  rootMessage: VendorCommunication;
  messages: VendorCommunication[];
  latestMessage: VendorCommunication;
  hasUnread: boolean;
}

const VendorMessages = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<VendorCommunication[]>([]);
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ConversationGroup | null>(null);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMessages();
  }, [user?.id]);

  useEffect(() => {
    processConversations();
  }, [messages, statusFilter, dateFilter, searchTerm]);

  const fetchMessages = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('vendor_communications')
        .select('*')
        .or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`)
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

  const processConversations = () => {
    // Group messages by conversation
    const groupedMessages = messages.reduce((acc, message) => {
      const rootId = message.parent_id || message.id;
      if (!acc[rootId!]) {
        acc[rootId!] = [];
      }
      acc[rootId!].push(message);
      return acc;
    }, {} as Record<string, VendorCommunication[]>);

    // Convert to conversation groups
    let conversationList: ConversationGroup[] = Object.entries(groupedMessages).map(([rootId, msgs]) => {
      const sortedMessages = msgs.sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime());
      const rootMessage = sortedMessages.find(msg => msg.id === rootId) || sortedMessages[0];
      const latestMessage = sortedMessages[sortedMessages.length - 1];
      const hasUnread = sortedMessages.some(msg => !msg.is_read && msg.receiver_id === user?.id);

      return {
        rootMessage,
        messages: sortedMessages,
        latestMessage,
        hasUnread,
      };
    });

    // Apply filters
    if (statusFilter !== 'all') {
      if (statusFilter === 'unread') {
        conversationList = conversationList.filter(conv => conv.hasUnread);
      } else if (statusFilter === 'read') {
        conversationList = conversationList.filter(conv => !conv.hasUnread);
      }
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (dateFilter) {
        case 'today':
          startDate = startOfDay(now);
          break;
        case 'week':
          startDate = subDays(now, 7);
          break;
        case 'month':
          startDate = subDays(now, 30);
          break;
        default:
          startDate = new Date(0);
      }

      conversationList = conversationList.filter(conv => 
        new Date(conv.latestMessage.created_at!) >= startDate
      );
    }

    if (searchTerm) {
      conversationList = conversationList.filter(conv =>
        conv.rootMessage.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.messages.some(msg => msg.message.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Sort by latest message
    conversationList.sort((a, b) => 
      new Date(b.latestMessage.created_at!).getTime() - new Date(a.latestMessage.created_at!).getTime()
    );

    setConversations(conversationList);
  };

  const openConversation = (conversation: ConversationGroup) => {
    setSelectedConversation(conversation);
    setShowConversationModal(true);
    
    // Mark unread messages as read
    const unreadMessages = conversation.messages.filter(msg => !msg.is_read && msg.receiver_id === user?.id);
    unreadMessages.forEach(msg => markAsRead(msg.id!));
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
    if (!selectedConversation || !user?.id || !replyMessage.trim()) return;
    
    try {
      setIsSending(true);
      
      // Get vendor registration details
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendor_registrations')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (vendorError) throw vendorError;

      const rootMessage = selectedConversation.rootMessage;
      const lastMessage = selectedConversation.latestMessage;

      const replyData = {
        vendor_id: vendorData.id,
        sender_id: user.id,
        receiver_id: lastMessage.sender_type === 'vendor' ? lastMessage.receiver_id : lastMessage.sender_id,
        sender_type: 'vendor',
        subject: `Re: ${rootMessage.subject}`,
        message: replyMessage.trim(),
        parent_id: rootMessage.id,
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

  const closeConversationModal = () => {
    setShowConversationModal(false);
    setSelectedConversation(null);
    setReplyMessage('');
  };

  return (
    <div className="container mx-auto p-6 space-y-6 text-left">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600">Communication with procurement team</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <div className="relative flex-1 max-w-md">
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-3"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Messages List */}
        {isLoading ? (
          <div className="py-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-500">Loading messages...</p>
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="py-8">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-8 h-8 text-gray-400" />
                  <p className="text-gray-500">No messages found.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {conversations.map((conversation) => (
              <Card 
                key={conversation.rootMessage.id} 
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  conversation.hasUnread ? 'border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => openConversation(conversation)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold line-clamp-1">{conversation.rootMessage.subject}</h3>
                        {conversation.hasUnread && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">New</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {conversation.latestMessage.message}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(conversation.latestMessage.created_at!), 'MMM dd, yyyy hh:mm a')}
                        </div>
                        <span>
                          Last from: {conversation.latestMessage.sender_type === 'admin' ? 'Procurement Team' : 'You'}
                        </span>
                        <span className="text-blue-600">
                          {conversation.messages.length} message{conversation.messages.length > 1 ? 's' : ''}
                        </span>
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

        {/* Sliding Conversation Modal */}
        {showConversationModal && selectedConversation && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fade-in"
              onClick={closeConversationModal}
            />
            
            {/* Sliding Panel */}
            <div className="fixed top-0 right-0 h-full w-2/5 bg-white shadow-2xl z-50 animate-slide-in-right">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div>
                    <h2 className="text-lg font-semibold line-clamp-1">
                      {selectedConversation.rootMessage.subject}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedConversation.messages.length} message{selectedConversation.messages.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={closeConversationModal}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedConversation.messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`p-4 rounded-lg ${
                        message.sender_type === 'admin' 
                          ? 'bg-gray-50 border-l-2 border-l-gray-300' 
                          : 'bg-blue-50 border-l-2 border-l-blue-300 ml-8'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">
                          {message.sender_type === 'admin' ? 'Procurement Team' : 'You'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(message.created_at!), 'MMM dd, hh:mm a')}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Attachments:</p>
                          <div className="space-y-1">
                            {message.attachments.map((attachment, index) => (
                              <div key={index} className="text-xs text-blue-600 hover:underline cursor-pointer">
                                {attachment}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <div className="p-4 border-t bg-gray-50">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Reply to conversation</label>
                    <Textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply here..."
                      rows={4}
                      className="resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={closeConversationModal}
                      >
                        Close
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
                </div>
              </div>
            </div>
          </>
        )}
    </div>
  );
};

export default VendorMessages;