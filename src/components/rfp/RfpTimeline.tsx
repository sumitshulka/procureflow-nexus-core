import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Clock, 
  FileText, 
  Send, 
  User, 
  Building,
  CheckCircle,
  AlertCircle,
  Info,
  Plus,
  MessageSquare
} from "lucide-react";

interface RfpActivity {
  id: string;
  rfp_id: string;
  activity_type: string;
  performed_by: string;
  activity_data: any;
  created_at: string;
  title: string;
  description?: string;
  performer_name?: string;
}

interface RfpTimelineProps {
  rfpId: string;
}

const ACTIVITY_ICONS = {
  created: FileText,
  published: Send,
  addendum_added: Plus,
  addendum_published: CheckCircle,
  clarification_sent: MessageSquare,
  clarification_answered: MessageSquare,
  response_received: User,
  evaluation_started: AlertCircle,
  awarded: CheckCircle,
  cancelled: AlertCircle
};

const ACTIVITY_COLORS = {
  created: "text-blue-600",
  published: "text-green-600", 
  addendum_added: "text-orange-600",
  addendum_published: "text-green-600",
  clarification_sent: "text-purple-600",
  clarification_answered: "text-purple-600",
  response_received: "text-blue-600",
  evaluation_started: "text-yellow-600",
  awarded: "text-green-600",
  cancelled: "text-red-600"
};

const ACTIVITY_BADGES = {
  created: "secondary",
  published: "default",
  addendum_added: "outline", 
  addendum_published: "default",
  clarification_sent: "secondary",
  clarification_answered: "secondary",
  response_received: "outline",
  evaluation_started: "outline",
  awarded: "default",
  cancelled: "destructive"
};

export const RfpTimeline: React.FC<RfpTimelineProps> = ({ rfpId }) => {
  const { toast } = useToast();
  const [activities, setActivities] = useState<RfpActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [rfpId]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('rfp_activities')
        .select('*')
        .eq('rfp_id', rfpId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch performer names
      const activitiesWithNames = await Promise.all(
        (data || []).map(async (activity) => {
          let performerName = 'Unknown';
          
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', activity.performed_by)
              .single();
            
            performerName = profileData?.full_name || 'System';
          } catch {
            performerName = 'System';
          }
          
          return {
            ...activity,
            performer_name: performerName
          } as RfpActivity;
        })
      );

      setActivities(activitiesWithNames);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch RFP timeline",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (activityType: string) => {
    const IconComponent = ACTIVITY_ICONS[activityType as keyof typeof ACTIVITY_ICONS] || Info;
    const colorClass = ACTIVITY_COLORS[activityType as keyof typeof ACTIVITY_COLORS] || "text-gray-600";
    return <IconComponent className={`h-5 w-5 ${colorClass}`} />;
  };

  const getActivityBadgeVariant = (activityType: string) => {
    return ACTIVITY_BADGES[activityType as keyof typeof ACTIVITY_BADGES] as any || "secondary";
  };

  const formatActivityType = (activityType: string) => {
    return activityType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return <div className="p-6">Loading timeline...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">RFP Activity Timeline</h3>
        <p className="text-sm text-muted-foreground">
          Track all activities and changes made to this RFP
        </p>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No activities recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <Card key={activity.id} className="relative">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-sm">{activity.title}</h4>
                      <Badge variant={getActivityBadgeVariant(activity.activity_type)}>
                        {formatActivityType(activity.activity_type)}
                      </Badge>
                    </div>
                    
                    {activity.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {activity.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {activity.performer_name}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {format(new Date(activity.created_at), "PPp")}
                      </span>
                    </div>
                    
                    {/* Additional activity data */}
                    {activity.activity_data && Object.keys(activity.activity_data).length > 0 && (
                      <div className="mt-3 p-3 bg-muted rounded-md">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Additional Details:</div>
                        <div className="text-xs space-y-1">
                          {Object.entries(activity.activity_data).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key.replace(/_/g, ' ')}:</span>{' '}
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Timeline connector */}
                {index < activities.length - 1 && (
                  <div className="absolute left-8 top-16 bottom-0 w-px bg-border" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};