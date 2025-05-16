
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Archive,
  BookText,
  ClipboardCheck,
  CreditCard,
  FileText,
  Home,
  ListFilter,
  Package,
  Settings,
  ShoppingCart,
  Users,
  Warehouse,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SystemModule {
  id: string;
  name: string;
  url: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const AppSidebar: React.FC = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const { userData } = useAuth();

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground";

  // Check if user has admin role
  const isAdmin = userData?.roles?.includes(UserRole.ADMIN);

  // Define our standard menu items
  const standardMenuItems: SystemModule[] = [
    { id: "dashboard", name: "Dashboard", url: "/", icon: Home },
    {
      id: "user_management",
      name: "User Management",
      url: "/users",
      icon: Users,
      adminOnly: true,
    },
    {
      id: "catalog",
      name: "Product Catalog",
      url: "/catalog",
      icon: ListFilter,
    },
    {
      id: "requests",
      name: "Procurement Requests",
      url: "/requests",
      icon: ShoppingCart,
    },
    {
      id: "inventory",
      name: "Inventory",
      url: "/inventory",
      icon: Warehouse,
    },
    {
      id: "vendors",
      name: "Vendor Management",
      url: "/vendors",
      icon: BookText,
    },
    {
      id: "rfps",
      name: "RFP Management",
      url: "/rfps",
      icon: FileText,
    },
    {
      id: "purchase_orders",
      name: "Purchase Orders",
      url: "/purchase-orders",
      icon: ClipboardCheck,
    },
    {
      id: "invoices",
      name: "Invoices & Payments",
      url: "/invoices",
      icon: CreditCard,
    },
    {
      id: "reports",
      name: "Reports",
      url: "/reports",
      icon: Archive,
    },
    // Only show settings for admin users
    ...(isAdmin ? [
      {
        id: "settings",
        name: "Settings",
        url: "/settings",
        icon: Settings,
      }
    ] : []),
  ];

  // Fetch any system modules from the database
  const { data: systemModules = [] } = useQuery({
    queryKey: ["system_modules"],
    queryFn: async () => {
      // This would be used to fetch dynamic modules if needed
      // Currently using the standard menu items above
      return [] as SystemModule[];
    },
    enabled: false, // We're not using this query for now, but it's here for future expansion
  });

  // Combine standard menu items with system modules
  // For now, just use standard menu items
  const allMenuItems = [...standardMenuItems];

  // Filter items based on admin status and permissions
  const filteredItems = allMenuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <Sidebar
      className={`border-r ${collapsed ? "w-16" : "w-64"}`}
      collapsible="icon"
    >
      <SidebarTrigger className="m-2 self-end" />
      <SidebarContent>
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <SidebarGroup>
            <SidebarGroupLabel className={`${collapsed && "sr-only"} pt-6 pb-2 px-2`}>
              Main Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={getNavCls}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.name}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
