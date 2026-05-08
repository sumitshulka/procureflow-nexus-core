import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, formatDistanceToNow } from "date-fns";
import { Activity, Search } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";

const ActivityLog = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState<string>("all");

  const { data: logs = [], isPending } = useQuery({
    queryKey: ["my-activity-log", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, action, entity_type, entity_id, created_at, details")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const entityTypes = Array.from(new Set(logs.map((l: any) => l.entity_type).filter(Boolean)));

  const filtered = logs.filter((l: any) => {
    if (entityType !== "all" && l.entity_type !== entityType) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.action?.toLowerCase().includes(q) ||
      l.entity_type?.toLowerCase().includes(q) ||
      l.entity_id?.toLowerCase().includes(q)
    );
  });

  const actionColor = (action: string) => {
    if (!action) return "secondary";
    if (action.includes("create") || action.includes("insert")) return "default";
    if (action.includes("delete") || action.includes("remove")) return "destructive";
    if (action.includes("update") || action.includes("edit")) return "outline";
    return "secondary";
  };

  return (
    <div className="container mx-auto p-6 space-y-6 text-left">
      <PageHeader title="Activity Log" description="A record of your recent actions across the system" />

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Your Activity
              </CardTitle>
              <CardDescription>Latest 200 actions performed by you</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search actions…" className="pl-8 w-full sm:w-64"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {entityTypes.map((t: any) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="mx-auto h-10 w-10 mb-3 opacity-50" />
              <p>No activity found</p>
            </div>
          ) : (
            <div className="border rounded-md divide-y">
              {filtered.map((l: any) => (
                <div key={l.id} className="p-4 hover:bg-muted/50 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={actionColor(l.action) as any}>
                        {l.action?.replace(/_/g, " ") || "action"}
                      </Badge>
                      {l.entity_type && (
                        <span className="text-sm text-muted-foreground">
                          on <span className="font-medium text-foreground">{l.entity_type.replace(/_/g, " ")}</span>
                        </span>
                      )}
                      {l.entity_id && (
                        <span className="font-mono text-xs text-procurement-700">{String(l.entity_id).slice(0, 8)}</span>
                      )}
                    </div>
                    {l.details && typeof l.details === "object" && Object.keys(l.details).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {JSON.stringify(l.details).slice(0, 160)}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground sm:text-right whitespace-nowrap">
                    <div>{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</div>
                    <div className="opacity-70">{format(new Date(l.created_at), "MMM dd, yyyy HH:mm")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLog;
