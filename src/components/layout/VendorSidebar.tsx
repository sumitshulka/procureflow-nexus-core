import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  User,
  FileText,
  ShoppingCart,
  DollarSign,
  Settings,
  Building2,
  Package,
  MessageSquare,
  BarChart3,
  Receipt,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVendorApprovalStatus } from "@/hooks/useVendorApprovalStatus";

const VendorSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();

  // Use shared vendor approval status hook (with refetchInterval for live updates)
  const { isApproved } = useVendorApprovalStatus();

  // Fetch unread message count for badge
  const { data: messageCount } = useQuery({
    queryKey: ["vendor_message_count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { count, error } = await supabase
        .from("vendor_communications")
        .select("*", { count: 'exact', head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/vendor-dashboard",
      requiresApproval: false, // Always accessible
    },
    {
      title: "Profile",
      icon: User,
      href: "/vendor/profile",
      requiresApproval: false, // Always accessible for editing
    },
    {
      title: "Messages",
      icon: MessageSquare,
      href: "/vendor/messages",
      requiresApproval: false, // Allow messages for communication about registration
    },
    {
      title: "RFPs",
      icon: FileText,
      href: "/vendor/rfps",
      requiresApproval: true,
    },
    {
      title: "Purchase Orders",
      icon: ShoppingCart,
      href: "/vendor/purchase-orders",
      requiresApproval: true,
    },
    {
      title: "Invoices",
      icon: Receipt,
      href: "/vendor/invoices",
      requiresApproval: true,
    },
    {
      title: "Products",
      icon: Package,
      href: "/vendor/products",
      requiresApproval: true,
    },
    {
      title: "Finances",
      icon: DollarSign,
      href: "/vendor/finances",
      requiresApproval: true,
    },
    {
      title: "Analytics",
      icon: BarChart3,
      href: "/vendor/analytics",
      requiresApproval: true,
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/vendor/settings",
      requiresApproval: true,
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar-background">
      <SidebarContent className="bg-sidebar-background">
        {/* Header section with title when expanded */}
        {state === "expanded" && (
          <div className="px-4 py-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-primary">Vendor Portal</h1>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Active
              </Badge>
            </div>
          </div>
        )}
        
        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto">
          <SidebarGroup className="px-2 py-4">
            <SidebarGroupContent>
              <SidebarMenu>
              {menuItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  const showBadge = item.href === '/vendor/messages' && messageCount && messageCount > 0;
                  const isDisabled = item.requiresApproval && !isApproved;
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild disabled={isDisabled}>
                        {isDisabled ? (
                          <div
                            className={cn(
                              "flex items-center justify-between space-x-3 rounded-md px-3 py-2 text-sm font-medium",
                              "text-sidebar-foreground/40 cursor-not-allowed"
                            )}
                            title="Available after vendor approval"
                          >
                            <div className="flex items-center space-x-3">
                              <item.icon className="h-4 w-4 shrink-0 opacity-40" />
                              {state === "expanded" && <span>{item.title}</span>}
                            </div>
                            {state === "expanded" && (
                              <Badge variant="outline" className="ml-auto text-[10px] px-1 py-0 opacity-60">
                                Locked
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <NavLink
                            to={item.href}
                            className={cn(
                              "flex items-center justify-between space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                              isActive 
                                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              <item.icon className="h-4 w-4 shrink-0" />
                              {state === "expanded" && <span>{item.title}</span>}
                            </div>
                            {state === "expanded" && showBadge && (
                              <Badge variant="destructive" className="ml-auto h-5 w-5 p-0 text-xs">
                                {messageCount}
                              </Badge>
                            )}
                          </NavLink>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Footer section */}
          {state === "expanded" && (
            <SidebarGroup className="mt-auto px-2 py-4 border-t border-sidebar-border">
              <SidebarGroupContent>
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-sidebar-foreground/60" />
                    <span className="text-sidebar-foreground/60">Company Portal</span>
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default VendorSidebar;