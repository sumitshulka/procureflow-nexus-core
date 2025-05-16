
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { RequestStatus, UserRole, RequestPriority } from "@/types";
import { ArrowLeft, Edit, Trash, Send } from "lucide-react";

// Define interface for request details
interface RequestDetail {
  id: string;
  request_number: string;
  title: string;
  description: string | null;
  requester_id: string;
  department: string | null;
  date_created: string;
  date_needed: string;
  priority: RequestPriority;
  status: RequestStatus;
  estimated_value: number | null;
  requester_name: string | null;
}

// Define interface for request items
interface RequestItem {
  id: string;
  request_id: string;
  product_id: string | null;
  description: string | null;
  quantity: number;
  estimated_price: number | null;
  product_name?: string;
}

const ProcurementRequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userData, hasRole } = useAuth();
  
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit = user && (
    (request?.requester_id === user.id && ['draft', 'submitted'].includes(request?.status || '')) ||
    hasRole(UserRole.ADMIN) ||
    hasRole(UserRole.PROCUREMENT_OFFICER)
  );
  
  const canDelete = user && (
    (request?.requester_id === user.id && request?.status === 'draft') ||
    hasRole(UserRole.ADMIN)
  );
  
  const canSubmit = user && 
    request?.requester_id === user.id && 
    request?.status === 'draft';

  useEffect(() => {
    if (!id) return;
    fetchRequestDetails();
  }, [id]);

  const fetchRequestDetails = async () => {
    try {
      setIsLoading(true);
      
      // Fetch request details
      const { data: requestData, error: requestError } = await supabase
        .from("procurement_request_details")
        .select("*")
        .eq("id", id)
        .single();

      if (requestError) throw requestError;
      
      setRequest(requestData);
      
      // Fetch request items
      const { data: itemsData, error: itemsError } = await supabase
        .from("procurement_request_items")
        .select(`
          *,
          product:product_id (name)
        `)
        .eq("request_id", id);

      if (itemsError) throw itemsError;
      
      const formattedItems = itemsData.map(item => ({
        ...item,
        product_name: item.product?.name || 'Custom Item'
      }));
      
      setItems(formattedItems);
      
    } catch (error: any) {
      console.error("Error fetching request details:", error.message);
      toast({
        title: "Error",
        description: "Failed to load request details",
        variant: "destructive",
      });
      navigate("/requests");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!id) return;
    
    try {
      setIsSubmitting(true);
      
      // Update request status to submitted
      const { error } = await supabase
        .from("procurement_requests")
        .update({ status: "submitted" })
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Procurement request submitted successfully",
      });
      
      // Refresh the data
      fetchRequestDetails();
      
    } catch (error: any) {
      console.error("Error submitting request:", error.message);
      toast({
        title: "Error",
        description: "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!id || !window.confirm("Are you sure you want to delete this request?")) return;
    
    try {
      setIsSubmitting(true);
      
      // Delete the request
      const { error } = await supabase
        .from("procurement_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Procurement request deleted",
      });
      
      navigate("/requests");
      
    } catch (error: any) {
      console.error("Error deleting request:", error.message);
      toast({
        title: "Error",
        description: "Failed to delete request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: RequestPriority) => {
    switch (priority) {
      case RequestPriority.URGENT:
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Urgent</Badge>;
      case RequestPriority.HIGH:
        return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">High</Badge>;
      case RequestPriority.MEDIUM:
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Medium</Badge>;
      case RequestPriority.LOW:
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Low</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.DRAFT:
        return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Draft</Badge>;
      case RequestStatus.SUBMITTED:
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Submitted</Badge>;
      case RequestStatus.IN_REVIEW:
        return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">In Review</Badge>;
      case RequestStatus.APPROVED:
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Approved</Badge>;
      case RequestStatus.REJECTED:
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Rejected</Badge>;
      case RequestStatus.COMPLETED:
        return <Badge variant="outline" className="bg-teal-50 text-teal-600 border-teal-200">Completed</Badge>;
      case RequestStatus.CANCELED:
        return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Canceled</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="page-container">
        <div className="flex flex-col justify-center items-center h-64">
          <h2 className="text-2xl font-bold mb-4">Request not found</h2>
          <Button onClick={() => navigate("/requests")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Requests
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={`Request: ${request.request_number}`}
        description={request.title}
        actions={
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => navigate("/requests")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {canSubmit && (
              <Button 
                onClick={handleSubmitRequest} 
                disabled={isSubmitting}
              >
                <Send className="mr-2 h-4 w-4" />
                Submit
              </Button>
            )}
            {canEdit && (
              <Button 
                variant="outline" 
                onClick={() => navigate(`/requests/${id}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {canDelete && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteRequest}
                disabled={isSubmitting}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(request.status)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Priority</p>
                  <div className="mt-1">{getPriorityBadge(request.priority)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Requester</p>
                  <p>{request.requester_name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p>{request.department || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created On</p>
                  <p>{format(new Date(request.date_created), "PPP")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Needed By</p>
                  <p>{format(new Date(request.date_needed), "PPP")}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="mt-1 whitespace-pre-wrap">{request.description || "No description provided"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Request Items</CardTitle>
              {canEdit && (
                <Button 
                  size="sm"
                  onClick={() => navigate(`/requests/${id}/items/add`)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No items added to this request yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="border rounded-md p-4">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-medium">{item.product_name}</h4>
                          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {item.estimated_price && `${new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD'
                            }).format(item.estimated_price)} × ${item.quantity}`}
                          </p>
                          <p className="text-sm font-semibold">
                            {item.estimated_price && 
                              new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD'
                              }).format(item.estimated_price * item.quantity)
                            }
                          </p>
                        </div>
                      </div>
                      {canEdit && (
                        <div className="mt-4 flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => navigate(`/requests/${id}/items/${item.id}/edit`)}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-500 hover:text-red-600"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Items:</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Quantity:</span>
                  <span className="font-medium">{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Estimated Cost:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(items.reduce(
                      (sum, item) => sum + ((item.estimated_price || 0) * item.quantity), 
                      0
                    ))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2"></div>
                  <div>
                    <p className="font-medium">Request Created</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(request.date_created), "PPP")}
                    </p>
                  </div>
                </div>
                
                {request.status !== "draft" && (
                  <div className="flex gap-4 items-start">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
                    <div>
                      <p className="font-medium">Request Submitted</p>
                      <p className="text-sm text-muted-foreground">
                        {/* Placeholder for submission date */}
                        —
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProcurementRequestDetail;
