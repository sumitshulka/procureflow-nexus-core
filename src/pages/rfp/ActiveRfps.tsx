
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Edit, Trash2, Search, Plus, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

interface RFP {
  id: string;
  title: string;
  rfp_number: string;
  status: string;
  estimated_value: number;
  currency: string;
  submission_deadline: string;
  created_at: string;
  created_by: string;
}

const ActiveRfps = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rfps, setRfps] = useState<RFP[]>([]);
  const [filteredRfps, setFilteredRfps] = useState<RFP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchRfps();
  }, []);

  useEffect(() => {
    filterRfps();
  }, [rfps, searchTerm, statusFilter]);

  const fetchRfps = async () => {
    try {
      console.log("Fetching RFPs for user:", user?.id);
      const { data, error } = await supabase
        .from("rfps")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching RFPs:", error);
        throw error;
      }
      
      console.log("Fetched RFPs:", data?.length || 0, "RFPs");
      console.log("RFPs data:", data);
      setRfps(data || []);
    } catch (error: any) {
      console.error("fetchRfps error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch RFPs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterRfps = () => {
    let filtered = rfps;

    if (searchTerm) {
      filtered = filtered.filter(
        (rfp) =>
          rfp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rfp.rfp_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((rfp) => rfp.status === statusFilter);
    }

    setFilteredRfps(filtered);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "published":
        return "default";
      case "evaluation":
        return "outline";
      case "awarded":
        return "default";
      case "canceled":
        return "destructive";
      case "closed":
        return "destructive";
      case "expired":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const handleCloseRfp = async (rfpId: string) => {
    try {
      const { error } = await supabase
        .from("rfps")
        .update({ status: "closed" })
        .eq("id", rfpId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "RFP has been closed. Vendors can no longer submit responses.",
      });

      fetchRfps();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to close RFP",
        variant: "destructive",
      });
    }
  };

  const handlePublishRfp = async (rfpId: string) => {
    try {
      const { error } = await supabase
        .from("rfps")
        .update({ status: "published" })
        .eq("id", rfpId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "RFP published successfully",
      });

      fetchRfps();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to publish RFP",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Active RFPs</h1>
        <Button onClick={() => navigate("/rfp/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Create RFP
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search RFPs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="evaluation">Under Evaluation</SelectItem>
                <SelectItem value="awarded">Awarded</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* RFP List */}
      <div className="grid gap-4">
        {filteredRfps.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No RFPs found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          filteredRfps.map((rfp) => (
            <Card key={rfp.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-lg font-semibold">{rfp.title}</h3>
                      <Badge variant={getStatusBadgeVariant(rfp.status)}>
                        {rfp.status.charAt(0).toUpperCase() + rfp.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      RFP Number: {rfp.rfp_number}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Estimated Value:</span>{" "}
                        {rfp.estimated_value ? `${rfp.currency} ${rfp.estimated_value.toLocaleString()}` : "Not specified"}
                      </div>
                      <div>
                        <span className="font-medium">Submission Deadline:</span>{" "}
                        {format(new Date(rfp.submission_deadline), "PPP")}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>{" "}
                        {format(new Date(rfp.created_at), "PPP")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/rfp/${rfp.id}/responses`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {rfp.status === "draft" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePublishRfp(rfp.id)}
                      >
                        Publish
                      </Button>
                    )}
                    {(rfp.status === "published" || rfp.status === "evaluation") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCloseRfp(rfp.id)}
                        title="Close RFP"
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/rfp/wizard?rfpId=${rfp.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ActiveRfps;
