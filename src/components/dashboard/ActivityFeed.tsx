
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const ActivityFeed = () => {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["dashboard-activity-feed"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("id, action, entity_type, entity_id, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!data || data.length === 0) return [];

      // Fetch profile names for unique user ids
      const userIds = [...new Set(data.map((a) => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

      return data.map((a) => {
        const name = profileMap.get(a.user_id) || "Unknown User";
        const initials = name
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return {
          id: a.id,
          userName: name,
          initials,
          action: a.action?.replace(/_/g, " ") || "performed action",
          entityType: a.entity_type?.replace(/_/g, " ") || "",
          entityId: a.entity_id || "",
          timestamp: formatDistanceToNow(new Date(a.created_at), { addSuffix: true }),
        };
      });
    },
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <div className="border rounded-md bg-white divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3"><Skeleton className="h-10 w-full" /></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Recent Activity</h2>
      <div className="border rounded-md bg-white divide-y">
        {activities.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">No recent activity</div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="p-3 flex items-center gap-3 hover:bg-gray-50">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{activity.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">{activity.userName}</span>{" "}
                  <span className="text-gray-600">{activity.action}</span>{" "}
                  <span>{activity.entityType}</span>{" "}
                  {activity.entityId && (
                    <span className="font-medium text-procurement-700">{activity.entityId.slice(0, 8)}</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{activity.timestamp}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
