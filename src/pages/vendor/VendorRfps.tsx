import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar, 
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Send,
  DollarSign,
} from 'lucide-react';
import VendorLayout from '@/components/layout/VendorLayout';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const VendorRfps = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch RFPs available to vendor
  const { data: rfpData, isLoading } = useQuery({
    queryKey: ["vendor_all_rfps", user?.id, statusFilter],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get all active RFPs
      const { data: rfps, error: rfpError } = await supabase
        .from("rfps")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      
      if (rfpError) throw rfpError;
      
      // Get vendor responses to see which RFPs they've responded to
      const { data: responses, error: responseError } = await supabase
        .from("rfp_responses")
        .select("rfp_id, status, submitted_at")
        .eq("vendor_id", user.id);
      
      if (responseError) throw responseError;
      
      // Combine RFP data with response status
      const responseMap = new Map(responses?.map(r => [r.rfp_id, r]) || []);
      
      const enrichedRfps = rfps?.map(rfp => ({
        ...rfp,
        response: responseMap.get(rfp.id) || null,
        hasResponded: responseMap.has(rfp.id),
      })) || [];
      
      return enrichedRfps;
    },
    enabled: !!user?.id,
  });

  const filteredRfps = rfpData?.filter(rfp => {
    const matchesSearch = searchTerm === '' || 
      rfp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfp.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'responded' && rfp.hasResponded) ||
      (statusFilter === 'pending' && !rfp.hasResponded);
    
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (rfp: any) => {
    if (rfp.hasResponded) {
      const status = rfp.response?.status || 'submitted';
      switch (status) {
        case 'submitted':
          return <Badge className="bg-blue-100 text-blue-800"><Send className="w-3 h-3 mr-1" />Submitted</Badge>;
        case 'under_review':
          return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Under Review</Badge>;
        case 'accepted':
          return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
        case 'rejected':
          return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    }
    return <Badge variant="outline" className="bg-gray-100"><Clock className="w-3 h-3 mr-1" />Response Pending</Badge>;
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Request for Proposals (RFPs)</h1>
          <p className="text-muted-foreground">Browse and respond to available RFPs</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total RFPs</p>
                  <p className="text-xl font-bold">{rfpData?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Responded</p>
                  <p className="text-xl font-bold">{rfpData?.filter(r => r.hasResponded).length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold">{rfpData?.filter(r => !r.hasResponded).length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Accepted</p>
                  <p className="text-xl font-bold">{rfpData?.filter(r => r.response?.status === 'accepted').length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search RFPs by title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All RFPs</SelectItem>
                  <SelectItem value="pending">Pending Response</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* RFPs List */}
        {isLoading ? (
          <div className="py-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Loading RFPs...</span>
            </div>
          </div>
        ) : filteredRfps.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center gap-4">
                <FileText className="w-12 h-12 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-medium mb-2">No RFPs Found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No RFPs match your current filters.' 
                      : 'There are no active RFPs available at the moment.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRfps.map((rfp) => {
              const daysUntilDeadline = getDaysUntilDeadline(rfp.submission_deadline);
              const isUrgent = daysUntilDeadline <= 3;
              
              return (
                <Card key={rfp.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{rfp.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {rfp.description?.substring(0, 200)}
                          {rfp.description && rfp.description.length > 200 && '...'}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(rfp)}
                        {isUrgent && !rfp.hasResponded && (
                          <Badge variant="outline" className="bg-red-50 text-red-600">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Urgent
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Deadline</p>
                        <p className="font-medium flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(rfp.submission_deadline), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {daysUntilDeadline > 0 ? `${getDaysUntilDeadline(rfp.submission_deadline)} days left` : 'Deadline passed'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Published</p>
                        <p className="font-medium">
                          {format(new Date(rfp.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Budget Range</p>
                        <p className="font-medium flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          Not specified
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Response Status</p>
                        <p className="font-medium">
                          {rfp.hasResponded 
                            ? `Submitted on ${format(new Date(rfp.response.submitted_at), 'MMM dd')}`
                            : 'Not submitted'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      {!rfp.hasResponded && daysUntilDeadline > 0 && (
                        <Button size="sm">
                          <Send className="w-4 h-4 mr-2" />
                          Submit Response
                        </Button>
                      )}
                      {rfp.hasResponded && (
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          View Response
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </VendorLayout>
  );
};

export default VendorRfps;