import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RfpAddendums } from "./RfpAddendums";
import { RfpCommunications } from "./RfpCommunications";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  MessageSquare, 
  Bell,
  Users,
  Building
} from "lucide-react";

interface RfpCommunicationHubProps {
  rfpId: string;
  rfpStatus?: string;
}

export const RfpCommunicationHub: React.FC<RfpCommunicationHubProps> = ({ 
  rfpId, 
  rfpStatus = 'draft'
}) => {
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string>('');
  const [isVendor, setIsVendor] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [rfpData, setRfpData] = useState(null);
  const [unreadCount, setUnreadCount] = useState({
    addendums: 0,
    communications: 0,
    notifications: 0
  });

  useEffect(() => {
    checkUserRole();
    fetchUnreadCounts();
    fetchRfpData();
  }, [rfpId]);

  const fetchRfpData = async () => {
    try {
      const { data, error } = await supabase
        .from('rfps')
        .select('*')
        .eq('id', rfpId)
        .single();

      if (error) throw error;
      setRfpData(data);
    } catch (error) {
      console.error('Error fetching RFP data:', error);
    }
  };

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is a vendor
      const { data: vendorData } = await supabase
        .from('vendor_registrations')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .single();

      if (vendorData) {
        setIsVendor(true);
        setUserRole('vendor');
        setCanManage(false);
      } else {
        // Check user roles for organization users
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role_id, custom_roles(name)')
          .eq('user_id', user.id);

        const roles = roleData?.map(r => ((r.custom_roles as any)?.name || '').toLowerCase()) || [];
        
        if (roles.includes('admin') || roles.includes('procurement officer')) {
          setCanManage(true);
          setUserRole('organization');
        } else {
          setCanManage(false);
          setUserRole('organization');
        }
        setIsVendor(false);
      }
    } catch (error: any) {
      console.error('Error checking user role:', error);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Count unread notifications
      const { data: notificationData } = await supabase
        .from('rfp_notifications')
        .select('id')
        .eq('rfp_id', rfpId)
        .eq('user_id', user.id)
        .eq('is_read', false);

      // Count new addendums (published after user's last visit)
      const { data: addendumData } = await supabase
        .from('rfp_addendums')
        .select('id')
        .eq('rfp_id', rfpId)
        .eq('is_published', true);

      // Count unread communications
      const { data: communicationData } = await supabase
        .from('rfp_communications')
        .select('id')
        .eq('rfp_id', rfpId)
        .neq('sender_id', user.id)
        .in('status', ['sent']);

      setUnreadCount({
        addendums: addendumData?.length || 0,
        communications: communicationData?.length || 0,
        notifications: notificationData?.length || 0
      });
    } catch (error: any) {
      console.error('Error fetching unread counts:', error);
    }
  };

  const isRfpActive = rfpStatus === 'published' || rfpStatus === 'evaluation' || rfpStatus === 'awarded';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold">RFP Communications</h2>
          <Badge variant={isVendor ? "secondary" : "default"}>
            {isVendor ? (
              <>
                <Building className="h-3 w-3 mr-1" />
                Vendor View
              </>
            ) : (
              <>
                <Users className="h-3 w-3 mr-1" />
                Organization
              </>
            )}
          </Badge>
        </div>
        
        {unreadCount.notifications > 0 && (
          <Badge variant="destructive" className="flex items-center">
            <Bell className="h-3 w-3 mr-1" />
            {unreadCount.notifications} Unread
          </Badge>
        )}
      </div>

      {!isRfpActive && (
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Communication features are available once the RFP is published.
          </p>
        </div>
      )}

      <Tabs defaultValue="addendums" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="addendums" className="relative">
            <FileText className="h-4 w-4 mr-2" />
            Addendums
            {unreadCount.addendums > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {unreadCount.addendums}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="communications" className="relative">
            <MessageSquare className="h-4 w-4 mr-2" />
            Communications
            {unreadCount.communications > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {unreadCount.communications}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
            {unreadCount.notifications > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {unreadCount.notifications}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="addendums" className="space-y-4">
          <RfpAddendums
            rfpId={rfpId}
            rfpData={rfpData}
            canManage={canManage && isRfpActive}
          />
        </TabsContent>

        <TabsContent value="communications" className="space-y-4">
          {isRfpActive ? (
            <RfpCommunications
              rfpId={rfpId}
              userRole={userRole}
              isVendor={isVendor}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Communications will be available once the RFP is published.
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <RfpNotifications
            rfpId={rfpId}
            onMarkAsRead={fetchUnreadCounts}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Simple notifications component
const RfpNotifications: React.FC<{
  rfpId: string;
  onMarkAsRead: () => void;
}> = ({ rfpId, onMarkAsRead }) => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [rfpId]);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('rfp_notifications')
        .select('*')
        .eq('rfp_id', rfpId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('rfp_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      fetchNotifications();
      onMarkAsRead();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading notifications...</div>;
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
            notification.is_read 
              ? 'bg-background border-border' 
              : 'bg-primary/5 border-primary/20'
          }`}
          onClick={() => !notification.is_read && markAsRead(notification.id)}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <h4 className="font-medium text-sm">{notification.title}</h4>
              <p className="text-sm text-muted-foreground">{notification.message}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(notification.created_at).toLocaleString()}
              </p>
            </div>
            {!notification.is_read && (
              <div className="h-2 w-2 bg-primary rounded-full"></div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};