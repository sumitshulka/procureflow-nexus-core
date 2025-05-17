
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DataTable from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Filter, Plus, Search, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { RequestPriority, RequestStatus } from "@/types";
import { useQuery } from "@tanstack/react-query";

// Define the type for procurement requests from database
interface ProcurementRequest {
  id: string;
  request_number: string;
  title: string;
  requester_id: string;
  department: string | null;
  date_created: string;
  date_needed: string;
  priority: RequestPriority;
  status: RequestStatus;
  estimated_value: number | null;
  requester_name: string | null;
}

// Type for department data
interface Department {
  id: string;
  name: string;
}

// Form schema for new requests
const requestFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  department: z.string().optional(),
  date_needed: z.date({
    required_error: "Date needed is required",
  }).refine(date => date > new Date(), {
    message: "Date needed must be in the future",
  }),
  priority: z.enum(["low", "medium", "high", "urgent"]).transform(val => val as RequestPriority),
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

const ProcurementRequests = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openNewRequestDialog, setOpenNewRequestDialog] = useState(false);
  const { user, userData } = useAuth();
  const navigate = useNavigate();

  // Fetch departments for the dropdown
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to load departments",
          variant: "destructive",
        });
        throw error;
      }
      
      return data as Department[];
    },
  });

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      title: "",
      description: "",
      department: userData?.department || "",
      priority: RequestPriority.MEDIUM,
      date_needed: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to one week from now
    },
  });

  // When departments are loaded, set the default department if the user has one
  useEffect(() => {
    if (departments.length > 0 && userData?.department) {
      // Find the department id that matches the user's department name
      const userDept = departments.find(dept => dept.name === userData.department);
      if (userDept) {
        form.setValue("department", userDept.id);
      }
    }
  }, [departments, userData, form]);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      
      // Fetch from the view that joins with profiles
      const { data, error } = await supabase
        .from("procurement_request_details")
        .select("*");

      if (error) throw error;
      
      if (data) {
        // Transform the data to match the expected ProcurementRequest type
        const transformedData: ProcurementRequest[] = data.map(item => ({
          id: item.id,
          request_number: item.request_number,
          title: item.title,
          requester_id: item.requester_id,
          department: item.department,
          date_created: item.date_created,
          date_needed: item.date_needed,
          priority: item.priority as RequestPriority,
          status: item.status as RequestStatus,
          estimated_value: item.estimated_value,
          requester_name: item.requester_name
        }));
        setRequests(transformedData);
      }
    } catch (error: any) {
      console.error("Error fetching procurement requests:", error.message);
      toast({
        title: "Error",
        description: "Failed to load procurement requests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      searchTerm === "" ||
      request.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.requester_name && request.requester_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus =
      statusFilter === "all" || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
            Urgent
          </Badge>
        );
      case "high":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
            Draft
          </Badge>
        );
      case "submitted":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            Submitted
          </Badge>
        );
      case "in_review":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">
            In Review
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
            Rejected
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-teal-50 text-teal-600 border-teal-200">
            Completed
          </Badge>
        );
      case "canceled":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
            Canceled
          </Badge>
        );
      default:
        return null;
    }
  };

  const onSubmit = async (values: RequestFormValues) => {
    try {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a request",
          variant: "destructive",
        });
        return;
      }

      // Get the department name from the selected department id
      let departmentName = null;
      if (values.department) {
        const selectedDepartment = departments.find(dept => dept.id === values.department);
        departmentName = selectedDepartment?.name || null;
      }

      // Insert the new request into the database
      const { data, error } = await supabase
        .from("procurement_requests")
        .insert({
          requester_id: user.id,
          title: values.title,
          description: values.description || null,
          department: departmentName,
          date_needed: values.date_needed.toISOString(),
          priority: values.priority,
          status: "draft" as RequestStatus,
          request_number: null, // Will be generated by the trigger
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Procurement request ${data.request_number} has been created`,
      });

      // Close the dialog and refresh the requests
      setOpenNewRequestDialog(false);
      form.reset();
      fetchRequests();
      
    } catch (error: any) {
      console.error("Error creating procurement request:", error.message);
      toast({
        title: "Error",
        description: "Failed to create procurement request",
        variant: "destructive",
      });
    }
  };

  const requestColumns = [
    {
      id: "request_number",
      header: "Request ID",
      cell: (row: ProcurementRequest) => (
        <span className="font-medium">{row.request_number}</span>
      ),
    },
    {
      id: "title",
      header: "Title",
      cell: (row: ProcurementRequest) => (
        <span className="font-medium">{row.title}</span>
      ),
    },
    {
      id: "requester_name",
      header: "Requester",
      cell: (row: ProcurementRequest) => row.requester_name || "—",
    },
    {
      id: "department",
      header: "Department",
      cell: (row: ProcurementRequest) => row.department || "—",
    },
    {
      id: "date_created",
      header: "Date Created",
      cell: (row: ProcurementRequest) => format(new Date(row.date_created), "MMM dd, yyyy"),
    },
    {
      id: "date_needed",
      header: "Date Needed",
      cell: (row: ProcurementRequest) => format(new Date(row.date_needed), "MMM dd, yyyy"),
    },
    {
      id: "priority",
      header: "Priority",
      cell: (row: ProcurementRequest) => getPriorityBadge(row.priority),
    },
    {
      id: "status",
      header: "Status",
      cell: (row: ProcurementRequest) => getStatusBadge(row.status),
    },
    {
      id: "estimated_value",
      header: "Est. Value",
      cell: (row: ProcurementRequest) =>
        row.estimated_value 
          ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(row.estimated_value)
          : "—",
    },
    {
      id: "actions",
      header: "",
      cell: (row: ProcurementRequest) => (
        <div className="flex justify-end">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => navigate(`/requests/${row.id}`)}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Procurement Requests"
        description="Manage and track all procurement requests"
        actions={
          <Dialog open={openNewRequestDialog} onOpenChange={setOpenNewRequestDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Create New Procurement Request</DialogTitle>
                <DialogDescription>
                  Fill out the form below to create a new procurement request. You can add items to the request after creation.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter request title" {...field} />
                        </FormControl>
                        <FormDescription>
                          Brief title describing what you need
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add details about your procurement request" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="date_needed"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date Needed</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date()
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          When do you need this by?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setOpenNewRequestDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Create Request</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, title, or requester..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={requestColumns}
        data={filteredRequests}
        emptyMessage="No procurement requests found"
        loading={isLoading}
      />
    </div>
  );
};

export default ProcurementRequests;
