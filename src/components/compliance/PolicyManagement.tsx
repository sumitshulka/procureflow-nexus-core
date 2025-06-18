
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, FileText, Users, AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";

const policySchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  content: z.string().min(1, "Content is required"),
  version: z.string().min(1, "Version is required"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  reviewDate: z.string().min(1, "Review date is required"),
  owner: z.string().min(1, "Owner is required"),
  status: z.string().min(1, "Status is required"),
});

type PolicyForm = z.infer<typeof policySchema>;

const PolicyManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);

  const form = useForm<PolicyForm>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      title: "",
      category: "",
      description: "",
      content: "",
      version: "1.0",
      effectiveDate: "",
      reviewDate: "",
      owner: "",
      status: "draft",
    },
  });

  // Mock policy data
  const policies = [
    {
      id: "1",
      title: "Procurement Policy",
      category: "Procurement",
      version: "2.1",
      status: "active",
      effectiveDate: "2024-01-01",
      reviewDate: "2024-12-31",
      owner: "Procurement Manager",
      lastUpdated: "2024-01-15",
      description: "Guidelines for procurement processes and vendor management",
      complianceRate: 95,
    },
    {
      id: "2",
      title: "Information Security Policy",
      category: "Security",
      version: "1.5",
      status: "active",
      effectiveDate: "2024-02-01",
      reviewDate: "2024-11-30",
      owner: "IT Security Manager",
      lastUpdated: "2024-02-10",
      description: "Data protection and information security requirements",
      complianceRate: 88,
    },
    {
      id: "3",
      title: "Vendor Code of Conduct",
      category: "Vendor Management",
      version: "1.0",
      status: "draft",
      effectiveDate: "2024-07-01",
      reviewDate: "2024-06-30",
      owner: "Vendor Relations Manager",
      lastUpdated: "2024-06-01",
      description: "Ethical standards and requirements for vendor partners",
      complianceRate: null,
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      draft: "secondary",
      archived: "outline",
      review: "outline",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const columns = [
    {
      id: "title",
      header: "Policy Title",
      cell: (row: any) => (
        <div>
          <div className="font-medium">{row.title}</div>
          <div className="text-sm text-muted-foreground">v{row.version}</div>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: (row: any) => row.category,
    },
    {
      id: "status",
      header: "Status",
      cell: (row: any) => getStatusBadge(row.status),
    },
    {
      id: "owner",
      header: "Owner",
      cell: (row: any) => row.owner,
    },
    {
      id: "effectiveDate",
      header: "Effective Date",
      cell: (row: any) => format(new Date(row.effectiveDate), "MMM dd, yyyy"),
    },
    {
      id: "reviewDate",
      header: "Review Date",
      cell: (row: any) => (
        <div className={new Date(row.reviewDate) < new Date() ? "text-red-600" : ""}>
          {format(new Date(row.reviewDate), "MMM dd, yyyy")}
        </div>
      ),
    },
    {
      id: "compliance",
      header: "Compliance",
      cell: (row: any) => 
        row.complianceRate !== null ? `${row.complianceRate}%` : "N/A",
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row: any) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleEdit = (policy: any) => {
    setEditingPolicy(policy);
    form.reset({
      title: policy.title,
      category: policy.category,
      description: policy.description,
      content: policy.content || "",
      version: policy.version,
      effectiveDate: policy.effectiveDate,
      reviewDate: policy.reviewDate,
      owner: policy.owner,
      status: policy.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    console.log("Delete policy:", id);
  };

  const onSubmit = (data: PolicyForm) => {
    console.log("Policy data:", data);
    setIsDialogOpen(false);
    setEditingPolicy(null);
    form.reset();
  };

  const showDetailPanel = (row: any) => (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold mb-2">Policy Details</h4>
        <div className="space-y-2 text-sm">
          <div><strong>Title:</strong> {row.title}</div>
          <div><strong>Version:</strong> {row.version}</div>
          <div><strong>Category:</strong> {row.category}</div>
          <div><strong>Status:</strong> {getStatusBadge(row.status)}</div>
          <div><strong>Owner:</strong> {row.owner}</div>
          <div><strong>Effective Date:</strong> {format(new Date(row.effectiveDate), "PPP")}</div>
          <div><strong>Review Date:</strong> {format(new Date(row.reviewDate), "PPP")}</div>
          <div><strong>Last Updated:</strong> {format(new Date(row.lastUpdated), "PPP")}</div>
          {row.complianceRate !== null && (
            <div><strong>Compliance Rate:</strong> {row.complianceRate}%</div>
          )}
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold mb-2">Description</h4>
        <p className="text-sm">{row.description}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Policy Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage organizational policies and compliance requirements
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPolicy ? "Edit Policy" : "Create New Policy"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Policy Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter policy title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Procurement">Procurement</SelectItem>
                            <SelectItem value="Security">Security</SelectItem>
                            <SelectItem value="Vendor Management">Vendor Management</SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                            <SelectItem value="HR">Human Resources</SelectItem>
                            <SelectItem value="Operations">Operations</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter policy description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Policy Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter detailed policy content"
                          className="min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="version"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Version</FormLabel>
                        <FormControl>
                          <Input placeholder="1.0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="effectiveDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Effective Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reviewDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Review Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="owner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Policy Owner</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter policy owner" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="review">Under Review</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingPolicy ? "Update" : "Create"} Policy
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="policies" className="w-full">
        <TabsList>
          <TabsTrigger value="policies">All Policies</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Status</TabsTrigger>
          <TabsTrigger value="reviews">Pending Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="policies">
          <Card>
            <CardContent className="p-6">
              <DataTable
                columns={columns}
                data={policies}
                emptyMessage="No policies found"
                showDetailPanel={showDetailPanel}
                detailPanelTitle="Policy Details"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">Currently in effect</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Compliance</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">91.5%</div>
                <p className="text-xs text-muted-foreground">Across all policies</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Reviews</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">3</div>
                <p className="text-xs text-muted-foreground">Require immediate attention</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Policies Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policies
                  .filter(policy => new Date(policy.reviewDate) < new Date())
                  .map((policy) => (
                    <div key={policy.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{policy.title}</h4>
                          <p className="text-sm text-muted-foreground">{policy.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                            <span>Version: {policy.version}</span>
                            <span>Owner: {policy.owner}</span>
                            <span className="text-red-600">
                              Review Due: {format(new Date(policy.reviewDate), "MMM dd, yyyy")}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          Schedule Review
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PolicyManagement;
