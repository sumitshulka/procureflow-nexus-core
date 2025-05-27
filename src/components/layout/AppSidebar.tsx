
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BarChart,
  Building2,
  Package,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  Settings,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const AppSidebar = () => {
  const { hasRole } = useAuth();
  const { state } = useSidebar();

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/",
      roles: ["admin", "procurement_officer", "requester", "approver", "vendor"],
    },
    {
      title: "Product Catalog",
      icon: ShoppingBag,
      href: "/catalog",
      roles: ["admin", "procurement_officer", "requester", "approver", "vendor"],
    },
    {
      title: "Inventory Management",
      icon: Package,
      href: "/inventory",
      roles: ["admin", "procurement_officer"],
      subItems: [
        {
          title: "Inventory Items",
          href: "/inventory/items",
        },
        {
          title: "Inventory Transactions",
          href: "/inventory/transactions",
        },
        {
          title: "Warehouses",
          href: "/inventory/warehouses",
        },
        {
          title: "Inventory Reports",
          href: "/inventory/reports",
        },
      ],
    },
    {
      title: "Procurement Requests",
      icon: ListChecks,
      href: "/requests",
      roles: ["admin", "procurement_officer", "requester", "approver"],
    },
    {
      title: "Approvals",
      icon: ClipboardList,
      href: "/approvals",
      roles: ["admin", "procurement_officer", "approver"],
    },
    {
      title: "Vendor Management",
      icon: Building2,
      href: "/vendors",
      roles: ["admin", "procurement_officer"],
    },
    {
      title: "Vendor Portal",
      icon: Store,
      href: "/vendor-portal",
      roles: ["vendor"],
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/settings",
      roles: ["admin"],
    },
    {
      title: "User Management",
      icon: Users,
      href: "/users",
      roles: ["admin"],
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                if (item.roles && !item.roles.some((role) => hasRole(role as any))) {
                  return null;
                }

                if (item.subItems) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value={item.title} className="border-0">
                          <AccordionTrigger className="flex items-center justify-between py-2 px-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md [&[data-state=open]>svg]:rotate-180">
                            <div className="flex items-center space-x-3">
                              <item.icon className="h-4 w-4" />
                              {state === "expanded" && <span>{item.title}</span>}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-1">
                            <div className="ml-6 space-y-1">
                              {item.subItems.map((subItem) => (
                                <SidebarMenuButton key={subItem.title} asChild>
                                  <NavLink
                                    to={subItem.href}
                                    className={({ isActive }) =>
                                      cn(
                                        "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                        isActive 
                                          ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                      )
                                    }
                                  >
                                    {subItem.title}
                                  </NavLink>
                                </SidebarMenuButton>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.href}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center space-x-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                            isActive 
                              ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )
                        }
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
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
