
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/common/DataTable";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Search, Download, Filter, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 25;

interface AuditLogEntry {
  id: string;
  source: "activity" | "security";
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  ipAddress: string | null;
  details: any;
}

const AuditTrail = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [page, setPage] = useState(0);

  // Fetch activity_logs
  const { data: activityLogs = [], isLoading: loadingActivity, refetch: refetchActivity } = useQuery({
    queryKey: ["audit-activity-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch security_logs
  const { data: securityLogs = [], isLoading: loadingSecurity, refetch: refetchSecurity } = useQuery({
    queryKey: ["audit-security-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch profiles for user names
  const allUserIds = useMemo(() => {
    const ids = new Set<string>();
    activityLogs.forEach((l: any) => l.user_id && ids.add(l.user_id));
    securityLogs.forEach((l: any) => {
      if (l.user_id) ids.add(l.user_id);
      if (l.target_user_id) ids.add(l.target_user_id);
    });
    return Array.from(ids);
  }, [activityLogs, securityLogs]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["audit-profiles", allUserIds],
    queryFn: async () => {
      if (allUserIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", allUserIds);
      return data || [];
    },
    enabled: allUserIds.length > 0,
  });

  const profileMap = useMemo(
    () => new Map(profiles.map((p: any) => [p.id, p.full_name])),
    [profiles]
  );

  // Combine and normalize logs
  const allLogs: AuditLogEntry[] = useMemo(() => {
    const actEntries: AuditLogEntry[] = activityLogs.map((l: any) => ({
      id: l.id,
      source: "activity" as const,
      timestamp: l.created_at,
      userId: l.user_id,
      userName: profileMap.get(l.user_id) || "Unknown",
      action: l.action || "unknown",
      entityType: l.entity_type || "-",
      entityId: l.entity_id || "-",
      description: formatDescription(l.action, l.entity_type, l.entity_id),
      ipAddress: l.ip_address,
      details: l.details,
    }));

    const secEntries: AuditLogEntry[] = securityLogs.map((l: any) => ({
      id: l.id,
      source: "security" as const,
      timestamp: l.created_at,
      userId: l.user_id,
      userName: profileMap.get(l.user_id) || "System",
      action: l.action || "unknown",
      entityType: "security",
      entityId: l.target_user_id ? `User: ${profileMap.get(l.target_user_id) || l.target_user_id?.slice(0, 8)}` : "-",
      description: formatSecurityDescription(l.action, l.role_name, profileMap.get(l.target_user_id)),
      ipAddress: l.ip_address,
      details: l.metadata,
    }));

    return [...actEntries, ...secEntries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [activityLogs, securityLogs, profileMap]);

  // Derive unique values for filters
  const uniqueActions = useMemo(() => {
    const set = new Set(allLogs.map((l) => l.action));
    return Array.from(set).sort();
  }, [allLogs]);

  const uniqueEntityTypes = useMemo(() => {
    const set = new Set(allLogs.map((l) => l.entityType).filter(Boolean));
    return Array.from(set).sort();
  }, [allLogs]);

  // Apply filters
  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          log.userName.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.entityType.toLowerCase().includes(q) ||
          log.entityId.toLowerCase().includes(q) ||
          log.description.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (entityFilter !== "all" && log.entityType !== entityFilter) return false;
      if (sourceFilter !== "all" && log.source !== sourceFilter) return false;

      if (dateFrom) {
        const logDate = new Date(log.timestamp);
        if (logDate < dateFrom) return false;
      }
      if (dateTo) {
        const logDate = new Date(log.timestamp);
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (logDate > endOfDay) return false;
      }

      return true;
    });
  }, [allLogs, searchTerm, actionFilter, entityFilter, sourceFilter, dateFrom, dateTo]);

  // Paginate
  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const paginatedLogs = filteredLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const isLoading = loadingActivity || loadingSecurity;

  const getActionBadge = (action: string, source: string) => {
    const actionLower = action.toLowerCase();
    let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
    if (actionLower.includes("create") || actionLower.includes("submit") || actionLower.includes("assign")) variant = "default";
    else if (actionLower.includes("update") || actionLower.includes("change") || actionLower.includes("revis")) variant = "secondary";
    else if (actionLower.includes("delete") || actionLower.includes("reject") || actionLower.includes("remove")) variant = "destructive";
    else if (actionLower.includes("approv")) variant = "default";

    return (
      <div className="flex items-center gap-1.5">
        <Badge variant={variant} className="text-xs">{action.replace(/_/g, " ")}</Badge>
        {source === "security" && (
          <Badge variant="outline" className="text-xs border-destructive/40 text-destructive">Security</Badge>
        )}
      </div>
    );
  };

  const columns = [
    {
      id: "timestamp",
      header: "Timestamp",
      cell: (row: AuditLogEntry) => (
        <div className="text-sm whitespace-nowrap">
          <div>{format(new Date(row.timestamp), "MMM dd, yyyy")}</div>
          <div className="text-muted-foreground">{format(new Date(row.timestamp), "HH:mm:ss")}</div>
        </div>
      ),
    },
    {
      id: "user",
      header: "User",
      cell: (row: AuditLogEntry) => (
        <div className="text-sm">
          <div className="font-medium">{row.userName}</div>
          <div className="text-muted-foreground font-mono text-xs">{row.userId?.slice(0, 8)}</div>
        </div>
      ),
    },
    {
      id: "action",
      header: "Action",
      cell: (row: AuditLogEntry) => getActionBadge(row.action, row.source),
    },
    {
      id: "entity",
      header: "Entity",
      cell: (row: AuditLogEntry) => (
        <div className="text-sm">
          <div className="font-medium">{row.entityType.replace(/_/g, " ")}</div>
          <div className="text-muted-foreground text-xs">{row.entityId?.slice(0, 12)}</div>
        </div>
      ),
    },
    {
      id: "description",
      header: "Description",
      cell: (row: AuditLogEntry) => (
        <div className="text-sm max-w-xs truncate" title={row.description}>
          {row.description}
        </div>
      ),
    },
    {
      id: "ip",
      header: "IP Address",
      cell: (row: AuditLogEntry) => (
        <span className="text-sm font-mono text-muted-foreground">{row.ipAddress || "-"}</span>
      ),
    },
  ];

  const showDetailPanel = (row: AuditLogEntry) => (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold mb-2">Audit Entry Details</h4>
        <div className="space-y-2 text-sm">
          <div><strong>Source:</strong> <Badge variant="outline" className="text-xs">{row.source === "activity" ? "Activity Log" : "Security Log"}</Badge></div>
          <div><strong>Timestamp:</strong> {format(new Date(row.timestamp), "PPpp")}</div>
          <div><strong>User:</strong> {row.userName}</div>
          <div><strong>User ID:</strong> <span className="font-mono">{row.userId}</span></div>
          <div><strong>Action:</strong> {getActionBadge(row.action, row.source)}</div>
          <div><strong>Entity Type:</strong> {row.entityType}</div>
          <div><strong>Entity ID:</strong> <span className="font-mono">{row.entityId}</span></div>
          <div><strong>IP Address:</strong> {row.ipAddress || "N/A"}</div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Description</h4>
        <p className="text-sm">{row.description}</p>
      </div>

      {row.details && Object.keys(row.details).length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Additional Details</h4>
          <div className="bg-muted p-3 rounded-md text-sm overflow-auto max-h-64">
            <pre className="whitespace-pre-wrap break-words">{JSON.stringify(row.details, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );

  const handleRefresh = () => {
    refetchActivity();
    refetchSecurity();
  };

  const handleExport = () => {
    const csv = [
      ["Timestamp", "User", "Action", "Source", "Entity Type", "Entity ID", "Description", "IP Address"].join(","),
      ...filteredLogs.map((l) =>
        [
          `"${format(new Date(l.timestamp), "yyyy-MM-dd HH:mm:ss")}"`,
          `"${l.userName}"`,
          `"${l.action}"`,
          `"${l.source}"`,
          `"${l.entityType}"`,
          `"${l.entityId}"`,
          `"${l.description}"`,
          `"${l.ipAddress || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setActionFilter("all");
    setEntityFilter("all");
    setSourceFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{allLogs.length}</div>
            <div className="text-sm text-muted-foreground">Total Entries</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{activityLogs.length}</div>
            <div className="text-sm text-muted-foreground">Activity Logs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{securityLogs.length}</div>
            <div className="text-sm text-muted-foreground">Security Events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
            <div className="text-sm text-muted-foreground">Filtered Results</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-base">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, action, entity..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className="pl-10"
              />
            </div>

            <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(0); }}>
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="activity">Activity Logs</SelectItem>
                <SelectItem value="security">Security Logs</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((a) => (
                  <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
              <SelectTrigger>
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {uniqueEntityTypes.map((e) => (
                  <SelectItem key={e} value={e}>{e.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PP") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(0); }} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Audit Log</CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete record of all system activities and security events
          </p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={paginatedLogs}
            loading={isLoading}
            emptyMessage="No audit log entries found matching your filters"
            showDetailPanel={showDetailPanel}
            detailPanelTitle="Audit Entry Details"
            detailPanelDescription="Full details for this audit log entry"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {page + 1} of {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function formatDescription(action: string, entityType: string | null, entityId: string | null): string {
  const a = action?.replace(/_/g, " ") || "Action performed";
  const entity = entityType?.replace(/_/g, " ") || "";
  const id = entityId ? ` (${entityId.slice(0, 8)})` : "";
  return `${a}${entity ? ` on ${entity}` : ""}${id}`;
}

function formatSecurityDescription(action: string, roleName: string | null, targetName: string | null): string {
  const a = action?.replace(/_/g, " ") || "Security event";
  if (roleName && targetName) return `${a} — role "${roleName}" for ${targetName}`;
  if (roleName) return `${a} — role "${roleName}"`;
  if (targetName) return `${a} for ${targetName}`;
  return a;
}

export default AuditTrail;
