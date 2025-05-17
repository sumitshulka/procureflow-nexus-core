
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfDay } from "date-fns";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Filter, CheckSquare } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ProcurementRequestSelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (request: ProcurementRequest) => void;
}

interface ProcurementRequest {
  id: string;
  request_number: string;
  title: string;
  date_created: string;
  requester_name: string | null;
  department: string | null;
  items?: {
    id: string;
    product_id: string;
    quantity: number;
    product_name: string;
  }[];
}

interface FilterState {
  searchTerm: string;
  department: string;
  requester: string;
  dateRange: string;
  customStartDate: string;
  customEndDate: string;
}

const dateRangeOptions = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "custom", label: "Custom range" },
];

const ProcurementRequestSelector: React.FC<ProcurementRequestSelectorProps> = ({
  isOpen,
  onOpenChange,
  onSelect,
}) => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    department: "",
    requester: "",
    dateRange: "week",
    customStartDate: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    customEndDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filteredRequests, setFilteredRequests] = useState<ProcurementRequest[]>([]);

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

  // Fetch requesters
  const { data: requesters = [] } = useQuery({
    queryKey: ["requesters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch approved procurement requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["approved_procurement_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procurement_request_details")
        .select(`
          id, 
          request_number, 
          title, 
          date_created, 
          requester_name,
          department
        `)
        .eq("status", "approved")
        .order("date_created", { ascending: false });
      
      if (error) throw error;

      const requestsWithItems = await Promise.all(data.map(async (request) => {
        const { data: items, error: itemsError } = await supabase
          .from("procurement_request_items")
          .select(`
            id,
            product_id,
            quantity,
            product:product_id (name)
          `)
          .eq("request_id", request.id);
        
        if (itemsError) {
          console.error("Error fetching request items:", itemsError);
          return request;
        }

        return {
          ...request,
          items: items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            quantity: item.quantity,
            product_name: item.product?.name || "Unknown Product"
          }))
        };
      }));

      return requestsWithItems;
    },
    enabled: isOpen,
  });

  // Apply filters
  useEffect(() => {
    if (!requests) return;
    
    let results = [...requests];
    
    // Apply search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      results = results.filter(
        (request) =>
          request.request_number.toLowerCase().includes(searchLower) ||
          request.title.toLowerCase().includes(searchLower) ||
          (request.requester_name && 
            request.requester_name.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply department filter
    if (filters.department) {
      results = results.filter(
        (request) => request.department === filters.department
      );
    }
    
    // Apply requester filter
    if (filters.requester) {
      results = results.filter(
        (request) => request.requester_name === filters.requester
      );
    }
    
    // Apply date filters
    const now = new Date();
    let startDate: Date;
    let endDate = now;
    
    switch (filters.dateRange) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "yesterday":
        startDate = startOfDay(subDays(now, 1));
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "week":
        startDate = subDays(now, 7);
        break;
      case "month":
        startDate = subDays(now, 30);
        break;
      case "custom":
        startDate = new Date(filters.customStartDate);
        endDate = new Date(filters.customEndDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = subDays(now, 7);
    }
    
    results = results.filter((request) => {
      const requestDate = new Date(request.date_created);
      return requestDate >= startDate && requestDate <= endDate;
    });
    
    setFilteredRequests(results);
  }, [requests, filters]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      searchTerm: "",
      department: "",
      requester: "",
      dateRange: "week",
      customStartDate: format(subDays(new Date(), 7), "yyyy-MM-dd"),
      customEndDate: format(new Date(), "yyyy-MM-dd"),
    });
  };

  const handleSelectRequest = (request: ProcurementRequest) => {
    onSelect(request);
    onOpenChange(false);
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b">
          <DrawerTitle className="text-xl">Select a Procurement Request</DrawerTitle>
          <DrawerDescription>
            Find and select an approved procurement request to associate with your checkout
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="px-4 py-2 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(90vh - 200px)" }}>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, title or requester..."
                name="searchTerm"
                value={filters.searchTerm}
                onChange={handleInputChange}
                className="pl-8"
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-muted" : ""}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          
          {showFilters && (
            <div className="p-4 border rounded-md space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <Select
                    value={filters.department}
                    onValueChange={(value) => handleSelectChange("department", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Requester</label>
                  <Select
                    value={filters.requester}
                    onValueChange={(value) => handleSelectChange("requester", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All requesters" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All requesters</SelectItem>
                      {requesters.map((requester) => (
                        <SelectItem key={requester.id} value={requester.full_name || ""}>
                          {requester.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Date Range</label>
                <Select
                  value={filters.dateRange}
                  onValueChange={(value) => handleSelectChange("dateRange", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Last 7 days" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateRangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {filters.dateRange === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <Input
                      type="date"
                      name="customStartDate"
                      value={filters.customStartDate}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <Input
                      type="date"
                      name="customEndDate"
                      value={filters.customEndDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Reset Filters
                </Button>
              </div>
            </div>
          )}
          
          <Separator />
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No approved procurement requests found matching your filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-md p-4 cursor-pointer hover:bg-accent/10 transition-colors"
                  onClick={() => handleSelectRequest(request)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          {request.request_number}
                        </Badge>
                        <h4 className="font-medium">{request.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {request.requester_name} • {request.department || "No department"}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(request.date_created), "MMM dd, yyyy")}
                    </div>
                  </div>
                  
                  {request.items && request.items.length > 0 && (
                    <Accordion type="single" collapsible className="mt-2">
                      <AccordionItem value="items" className="border-0">
                        <AccordionTrigger className="py-1 text-sm text-muted-foreground">
                          {request.items.length} items
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-1">
                            {request.items.map((item) => (
                              <li key={item.id} className="text-sm flex justify-between">
                                <span>{item.product_name}</span>
                                <span>{item.quantity} units</span>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}

                  <div className="mt-2 flex justify-end">
                    <Button size="sm" className="gap-2">
                      <CheckSquare className="h-4 w-4" /> Select
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <DrawerFooter className="border-t">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default ProcurementRequestSelector;
