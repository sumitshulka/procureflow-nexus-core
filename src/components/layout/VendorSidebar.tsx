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
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const VendorSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/vendor-dashboard",
    },
    {
      title: "Profile",
      icon: User,
      href: "/vendor/profile",
    },
    {
      title: "RFPs",
      icon: FileText,
      href: "/vendor/rfps",
    },
    {
      title: "Purchase Orders",
      icon: ShoppingCart,
      href: "/vendor/purchase-orders",
    },
    {
      title: "Products",
      icon: Package,
      href: "/vendor/products",
    },
    {
      title: "Finances",
      icon: DollarSign,
      href: "/vendor/finances",
    },
    {
      title: "Messages",
      icon: MessageSquare,
      href: "/vendor/messages",
    },
    {
      title: "Analytics",
      icon: BarChart3,
      href: "/vendor/analytics",
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/vendor/settings",
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r mt-16 bg-sidebar-background">
      <SidebarContent className="bg-sidebar-background">
        <ScrollArea className="flex-1 px-2">
          <SidebarGroup className="pt-4">
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.href}
                          className={cn(
                            "flex items-center space-x-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                            isActive 
                              ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {state === "expanded" && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Company Info */}
          {state === "expanded" && (
            <SidebarGroup className="mt-6 pt-4 border-t border-sidebar-border">
              <SidebarGroupContent>
                <div className="px-2 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-sidebar-foreground/60" />
                    <span className="text-sidebar-foreground/60">Company Portal</span>
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
};

export default VendorSidebar;