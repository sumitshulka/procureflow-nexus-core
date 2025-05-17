import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, PlusCircle, Trash2, FileEdit, Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/common/PageHeader";
import { RequestStatus, UserRole, RequestPriority } from "@/types";
import RequestItemForm from "@/components/procurement/RequestItemForm";

const ProcurementRequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    department: "",
    priority: "medium" as RequestPriority, // Fix: Type assertion to RequestPriority
    date_needed: "",
  });

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch request details
  const {
    data: request,
    isLoading: requestLoading,
    refetch: refetchRequest,
  } = useQuery({
    queryKey: ["procurement_request", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("procurement_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setFormData({
        title: data.title || "",
        description: data.description || "",
        department: data.department || "",
        priority: data.priority || "medium",
        date_needed: data.date_needed ? new Date(data.date_needed).toISOString().split("T")[0] : "",
      });

      return data;
    },
    enabled: !!id,
  });

  // Fetch request items
  const {
    data: requestItems = [],
    isLoading: itemsLoading,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ["procurement_request_items", id],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from("procurement_request_items")
        .select(`
          *,
          product:product_id (id, name, description, unit:unit_id(name, abbreviation))
        `)
        .eq("request_id", id);

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Handle input field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: name === "priority" 
        ? value as RequestPriority // Fix: Type assertion for priority
        : value 
    }));
  };

  // Handle save request changes
  const handleSaveRequest = async () => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from("procurement_requests")
        .update({
          title: formData.title,
          description: formData.description,
          department: formData.department,
          priority: formData.priority,
          date_needed: formData.date_needed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Request updated successfully",
      });
      setEditing(false);
      refetchRequest();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update request",
        variant: "destructive",
      });
    }
  };

  // Handle delete item
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from("procurement_request_items")
        .delete()
        .eq("id", itemToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      setItemToDelete(null);
      setIsDeleteDialogOpen(false);
      refetchItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  // Submit request for approval
  const handleSubmitRequest = async () => {
    if (!id) return;

    try {
      // Check if user is admin or super admin
      const isAdmin = hasRole(UserRole.ADMIN);
      const status = isAdmin ? "approved" : "submitted";

      const { error } = await supabase
        .from("procurement_requests")
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: isAdmin 
          ? "Request automatically approved" 
          : "Request submitted for approval",
      });
      setIsSubmitDialogOpen(false);
      refetchRequest();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    }
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge className="bg-slate-200 text-slate-800 hover:bg-slate-200">Draft</Badge>;
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Submitted</Badge>;
      case "in_review":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">In Review</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      case "completed":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get priority badge styling
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "low":
        return <Badge variant="outline" className="bg-slate-50 text-slate-800 border-slate-200">Low</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">Medium</Badge>;
      case "high":
        return <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200">High</Badge>;
      case "urgent":
        return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">Urgent</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  // Calculate total estimated value
  const totalEstimatedValue = requestItems.reduce((sum, item) => {
    return sum + (item.quantity * (item.estimated_price || 0));
  }, 0);

  if (requestLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-medium">Request not found</h2>
        <p className="text-muted-foreground mt-2">
          The procurement request you are looking for does not exist or has been deleted.
        </p>
        <Button
          onClick={() => navigate("/requests")}
          className="mt-4"
          variant="outline"
        >
          Return to Requests
        </Button>
      </div>
    );
  }

  const isEditable = request.status === "draft" && user?.id === request.requester_id;

  return (
    <div className="page-container">
      <PageHeader
        title={request.title}
        description={`Request #${request.request_number || "N/A"}`}
        actions={
          isEditable ? (
            <>
              {editing ? (
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveRequest}>Save Changes</Button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setEditing(true)}
                  >
                    <FileEdit className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  
                  <Button
                    onClick={() => setIsSubmitDialogOpen(true)}
                    disabled={requestItems.length === 0}
                  >
                    <Send className="w-4 h-4 mr-2" /> Submit Request
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Button variant="outline" onClick={() => navigate("/requests")}>
              Back to Requests
            </Button>
          )
        }
      />

      <div className="grid gap-6 md:grid-cols-7">
        <div className="md:col-span-5 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Title
                    </label>
                    <Input
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description
                    </label>
                    <Textarea
                      name="description"
                      value={formData.description || ""}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Department
                      </label>
                      <Select
                        name="department"
                        value={formData.department}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.name}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Priority
                      </label>
                      <Select
                        name="priority"
                        value={formData.priority}
                        onValueChange={(value) => setFormData(prev => ({ 
                          ...prev, 
                          priority: value as RequestPriority 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Date Needed
                      </label>
                      <Input
                        type="date"
                        name="date_needed"
                        value={formData.date_needed}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <dl className="divide-y divide-gray-200">
                  <div className="py-3 grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-muted-foreground">
                      Status
                    </dt>
                    <dd className="text-sm col-span-2">
                      {getStatusBadge(request.status)}
                    </dd>
                  </div>
                  <div className="py-3 grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-muted-foreground">
                      Description
                    </dt>
                    <dd className="text-sm col-span-2">
                      {request.description || "No description provided"}
                    </dd>
                  </div>
                  <div className="py-3 grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-muted-foreground">
                      Department
                    </dt>
                    <dd className="text-sm col-span-2">
                      {request.department || "Not specified"}
                    </dd>
                  </div>
                  <div className="py-3 grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-muted-foreground">
                      Priority
                    </dt>
                    <dd className="text-sm col-span-2">
                      {getPriorityBadge(request.priority)}
                    </dd>
                  </div>
                  <div className="py-3 grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-muted-foreground">
                      Date Needed
                    </dt>
                    <dd className="text-sm col-span-2">
                      {request.date_needed
                        ? format(new Date(request.date_needed), "MMM dd, yyyy")
                        : "Not specified"}
                    </dd>
                  </div>
                  <div className="py-3 grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-muted-foreground">
                      Created
                    </dt>
                    <dd className="text-sm col-span-2">
                      {format(new Date(request.created_at || request.date_created), "MMM dd, yyyy HH:mm")}
                    </dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle>Request Items</CardTitle>
              {isEditable && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddItemDialogOpen(true)}
                >
                  <PlusCircle className="w-4 h-4 mr-2" /> Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : requestItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items added to this request yet.
                  {isEditable && (
                    <p className="mt-2">
                      Click the "Add Item" button to add items to your request.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                        {isEditable && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requestItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.product?.name || "Custom Item"}
                          </TableCell>
                          <TableCell>
                            {item.description || item.product?.description || "No description"}
                          </TableCell>
                          <TableCell>
                            {item.quantity} {item.product?.unit?.abbreviation || ""}
                          </TableCell>
                          <TableCell>
                            {item.estimated_price
                              ? `$${item.estimated_price.toFixed(2)}`
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {item.estimated_price
                              ? `$${(item.quantity * item.estimated_price).toFixed(2)}`
                              : "N/A"}
                          </TableCell>
                          {isEditable && (
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditItemId(item.id);
                                    setIsAddItemDialogOpen(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => {
                                    setItemToDelete(item.id);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {requestItems.length > 0 && (
                <div className="mt-6 flex justify-end">
                  <div className="w-48">
                    <div className="flex justify-between py-1 text-sm">
                      <span>Total Estimated Value</span>
                      <span className="font-medium">
                        ${totalEstimatedValue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Request Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Current Status
                  </p>
                  <p className="mt-1">{getStatusBadge(request.status)}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Request Number
                  </p>
                  <p className="mt-1 font-mono">
                    {request.request_number || "Not assigned"}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Items
                  </p>
                  <p className="mt-1">{requestItems.length}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Estimated Value
                  </p>
                  <p className="mt-1 font-medium">
                    ${totalEstimatedValue.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approval Information Card would go here */}
        </div>
      </div>

      {/* Add/Edit Item Dialog */}
      <Dialog 
        open={isAddItemDialogOpen} 
        onOpenChange={(open) => {
          setIsAddItemDialogOpen(open);
          if (!open) setEditItemId(null);
        }}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              {editItemId ? "Edit Request Item" : "Add Request Item"}
            </DialogTitle>
          </DialogHeader>
          <RequestItemForm
            requestId={id || ""}
            onSuccess={() => {
              setIsAddItemDialogOpen(false);
              setEditItemId(null);
              refetchItems();
            }}
            existingItem={
              editItemId
                ? requestItems.find((item) => item.id === editItemId)
                : undefined
            }
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              selected item from the request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setItemToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit Confirmation Dialog */}
      <AlertDialog
        open={isSubmitDialogOpen}
        onOpenChange={setIsSubmitDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Request</AlertDialogTitle>
            <AlertDialogDescription>
              {hasRole(UserRole.ADMIN)
                ? "As an admin, this request will be automatically approved upon submission."
                : "This will submit your request for approval. You won't be able to make further changes once submitted."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsSubmitDialogOpen(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitRequest}>
              {hasRole(UserRole.ADMIN) ? "Submit & Approve" : "Submit Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProcurementRequestDetail;
