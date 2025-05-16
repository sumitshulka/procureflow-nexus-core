
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { FilePenLine, FileText, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { RequestStatus, RequestPriority, UserRole } from "@/types";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Define the request data structure
interface RequestDetail {
  id: string;
  request_number: string;
  title: string;
  description: string | null;
  requester_id: string;
  requester_name: string | null;
  department: string | null;
  date_created: string;
  date_needed: string;
  priority: RequestPriority;
  status: RequestStatus;
  estimated_value: number | null;
  items: RequestItem[];
}

interface RequestItem {
  id: string;
  product_id: string | null;
  product_name?: string;
  description: string | null;
  quantity: number;
  estimated_price: number | null;
}

// Default empty request
const emptyRequest: RequestDetail = {
  id: "",
  request_number: "",
  title: "",
  description: null,
  requester_id: "",
  requester_name: null,
  department: null,
  date_created: new Date().toISOString(),
  date_needed: new Date().toISOString(),
  priority: RequestPriority.MEDIUM,
  status: RequestStatus.DRAFT,
  estimated_value: 0,
  items: [],
};

// Form schema for request item
const requestItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  estimated_price: z.number().min(0, "Price cannot be negative").optional(),
});

type RequestItemFormValues = z.infer<typeof requestItemSchema>;

const ProcurementRequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userData, hasRole } = useAuth();
  const [requestDetail, setRequestDetail] = useState<RequestDetail>(emptyRequest);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [openAddItemDialog, setOpenAddItemDialog] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const itemForm = useForm<RequestItemFormValues>({
    resolver: zodResolver(requestItemSchema),
    defaultValues: {
      description: "",
      quantity: 1,
      estimated_price: 0,
    },
  });

  const fetchRequestDetail = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      // Fetch the request
      const { data: requestData, error: requestError } = await supabase
        .from("procurement_request_details")
        .select("*")
        .eq("id", id)
        .single();

      if (requestError) throw requestError;

      // Fetch request items
      const { data: itemsData, error: itemsError } = await supabase
        .from("procurement_request_items")
        .select(`
          id,
          product_id,
          description,
          quantity,
          estimated_price,
          products (name)
        `)
        .eq("request_id", id);

      if (itemsError) throw itemsError;

      // Transform the data to match the RequestDetail interface
      const transformedRequest: RequestDetail = {
        id: requestData.id,
        request_number: requestData.request_number,
        title: requestData.title,
        description: requestData.description,
        requester_id: requestData.requester_id,
        requester_name: requestData.requester_name,
        department: requestData.department,
        date_created: requestData.date_created,
        date_needed: requestData.date_needed,
        priority: requestData.priority as RequestPriority,
        status: requestData.status as RequestStatus,
        estimated_value: requestData.estimated_value,
        items: itemsData.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.products?.name,
          description: item.description,
          quantity: item.quantity,
          estimated_price: item.estimated_price,
        })),
      };

      setRequestDetail(transformedRequest);
    } catch (error: any) {
      console.error("Error fetching request details:", error.message);
      toast({
        title: "Error",
        description: "Failed to load request details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRequestDetail();
    }
  }, [id]);

  // Convert enum status to a display-friendly format
  const formatStatus = (status: string): string => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Get appropriate status badge based on the status value
  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.DRAFT:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
            Draft
          </Badge>
        );
      case RequestStatus.SUBMITTED:
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            Submitted
          </Badge>
        );
      case RequestStatus.IN_REVIEW:
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">
            In Review
          </Badge>
        );
      case RequestStatus.APPROVED:
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            Approved
          </Badge>
        );
      case RequestStatus.REJECTED:
        return (
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
            Rejected
          </Badge>
        );
      case RequestStatus.COMPLETED:
        return (
          <Badge variant="outline" className="bg-teal-50 text-teal-600 border-teal-200">
            Completed
          </Badge>
        );
      case RequestStatus.CANCELED:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
            Canceled
          </Badge>
        );
      default:
        return null;
    }
  };

  // Get appropriate priority badge based on the priority value
  const getPriorityBadge = (priority: RequestPriority) => {
    switch (priority) {
      case RequestPriority.URGENT:
        return (
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
            Urgent
          </Badge>
        );
      case RequestPriority.HIGH:
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
            High
          </Badge>
        );
      case RequestPriority.MEDIUM:
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
            Medium
          </Badge>
        );
      case RequestPriority.LOW:
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  // Calculate the total value of all request items
  const calculateTotalValue = (): number => {
    return requestDetail.items.reduce(
      (sum, item) => sum + (item.quantity * (item.estimated_price || 0)),
      0
    );
  };

  const canEditRequest = (): boolean => {
    if (!user || !requestDetail) return false;
    
    // Admin and procurement officers can edit any request
    if (hasRole(UserRole.ADMIN) || hasRole(UserRole.PROCUREMENT_OFFICER)) {
      return true;
    }
    
    // Requesters can only edit their own requests in draft or submitted status
    return (
      user.id === requestDetail.requester_id &&
      [RequestStatus.DRAFT, RequestStatus.SUBMITTED].includes(requestDetail.status)
    );
  };

  const handleAddItem = async (values: RequestItemFormValues) => {
    try {
      const newItem = {
        request_id: id,
        description: values.description,
        quantity: values.quantity,
        estimated_price: values.estimated_price || 0,
      };
      
      const { data, error } = await supabase
        .from("procurement_request_items")
        .insert(newItem)
        .select()
        .single();
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Item added to request",
      });
      
      setOpenAddItemDialog(false);
      itemForm.reset();
      fetchRequestDetail();
      
    } catch (error: any) {
      console.error("Error adding item:", error.message);
      toast({
        title: "Error",
        description: "Failed to add item to request",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("procurement_request_items")
        .delete()
        .eq("id", itemId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Item removed from request",
      });
      
      setDeletingItemId(null);
      fetchRequestDetail();
      
    } catch (error: any) {
      console.error("Error deleting item:", error.message);
      toast({
        title: "Error",
        description: "Failed to remove item from request",
        variant: "destructive",
      });
    }
  };

  // If loading, show a simple loading message
  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading request details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={`Request ${requestDetail.request_number}`}
        description={requestDetail.title}
        actions={
          canEditRequest() && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <FilePenLine className="mr-2 h-4 w-4" />
                {isEditing ? "Cancel Editing" : "Edit Request"}
              </Button>
              
              {requestDetail.status === RequestStatus.DRAFT && (
                <Button size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Submit Request
                </Button>
              )}
            </div>
          )
        }
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="approvals">Approval Chain</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Information</CardTitle>
              <CardDescription>Details about this procurement request</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <div className="mt-1">{getStatusBadge(requestDetail.status)}</div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Priority</h3>
                  <div className="mt-1">{getPriorityBadge(requestDetail.priority)}</div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Requester</h3>
                  <p className="text-sm mt-1">{requestDetail.requester_name || 'Unknown'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Department</h3>
                  <p className="text-sm mt-1">{requestDetail.department || 'Not specified'}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Date Created</h3>
                  <p className="text-sm mt-1">
                    {format(new Date(requestDetail.date_created), "MMM dd, yyyy")}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Date Needed</h3>
                  <p className="text-sm mt-1">
                    {format(new Date(requestDetail.date_needed), "MMM dd, yyyy")}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Estimated Value</h3>
                  <p className="text-sm mt-1">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(calculateTotalValue())}
                  </p>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="text-sm mt-1 whitespace-pre-line">
                  {requestDetail.description || "No description provided."}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Request Items</CardTitle>
                <CardDescription>
                  Items included in this procurement request
                </CardDescription>
              </div>
              
              {(canEditRequest() && requestDetail.status === RequestStatus.DRAFT) && (
                <Dialog open={openAddItemDialog} onOpenChange={setOpenAddItemDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add Item to Request</DialogTitle>
                      <DialogDescription>
                        Add a new item to this procurement request.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...itemForm}>
                      <form onSubmit={itemForm.handleSubmit(handleAddItem)} className="space-y-4 py-4">
                        <FormField
                          control={itemForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input placeholder="Item description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={itemForm.control}
                            name="quantity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantity</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min={1}
                                    placeholder="1" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={itemForm.control}
                            name="estimated_price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Est. Price (per unit)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    placeholder="0.00" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <DialogFooter>
                          <Button type="submit">Add Item</Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {requestDetail.items.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">No items added to this request yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Est. Unit Price</TableHead>
                      <TableHead>Est. Total</TableHead>
                      {(canEditRequest() && requestDetail.status === RequestStatus.DRAFT) && (
                        <TableHead className="w-16"></TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestDetail.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.product_name ? (
                            <div>
                              <div className="font-medium">{item.product_name}</div>
                              <div className="text-gray-500 text-sm">
                                {item.description}
                              </div>
                            </div>
                          ) : (
                            item.description
                          )}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          {item.estimated_price != null
                            ? new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                              }).format(item.estimated_price)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {item.estimated_price != null
                            ? new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                              }).format(item.quantity * item.estimated_price)
                            : "—"}
                        </TableCell>
                        {(canEditRequest() && requestDetail.status === RequestStatus.DRAFT) && (
                          <TableCell className="text-right">
                            <Dialog
                              open={deletingItemId === item.id}
                              onOpenChange={(open) => !open && setDeletingItemId(null)}
                            >
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-red-500"
                                  onClick={() => setDeletingItemId(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Confirm Deletion</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to remove this item from the request?
                                    This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="mt-4">
                                  <Button
                                    variant="outline"
                                    onClick={() => setDeletingItemId(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleDeleteItem(item.id)}
                                  >
                                    Delete
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <Separator className="my-4" />

              <div className="flex justify-end">
                <div className="w-1/3">
                  <div className="flex justify-between py-2">
                    <span className="font-medium">Estimated Total:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(calculateTotalValue())}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Approval Chain</CardTitle>
              <CardDescription>
                Track the approval status of this request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center">
                <p className="text-gray-500">
                  Approval chain will appear here once the request is submitted for approval.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Request History</CardTitle>
              <CardDescription>
                Timeline of all activities related to this request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center">
                <p className="text-gray-500">
                  Request history and activity log will appear here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProcurementRequestDetail;
