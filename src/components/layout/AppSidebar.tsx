
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Archive,
  BookText,
  Box,
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

const AppSidebar: React.FC = () => {
  // Using `state` instead of `collapsed` based on SidebarContext definition
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

  const mainItems = [
    { title: "Dashboard", url: "/", icon: Home },
    {
      title: "User Management",
      url: "/users",
      icon: Users,
      adminOnly: true,
    },
    {
      title: "Product Catalog",
      url: "/catalog",
      icon: ListFilter,
    },
    {
      title: "Procurement Requests",
      url: "/requests",
      icon: ShoppingCart,
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: Warehouse,
    },
    {
      title: "Vendor Management",
      url: "/vendors",
      icon: BookText,
    },
    {
      title: "RFP Management",
      url: "/rfps",
      icon: FileText,
    },
    {
      title: "Purchase Orders",
      url: "/purchase-orders",
      icon: ClipboardCheck,
    },
    {
      title: "Invoices & Payments",
      url: "/invoices",
      icon: CreditCard,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: Archive,
    },
    // Only show settings for admin users
    ...(isAdmin ? [
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
      }
    ] : []),
  ];

  // Filter items based on admin status
  const filteredItems = mainItems.filter(item => !item.adminOnly || isAdmin);

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
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={getNavCls}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
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
