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
  FileText,
  ShoppingCart,
  TrendingUp,
  Calculator,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      title: "RFP Management",
      icon: FileText,
      href: "/rfp",
      roles: ["admin", "procurement_officer"],
      subItems: [
        {
          title: "Create RFP",
          href: "/rfp/create",
        },
        {
          title: "Active RFPs",
          href: "/rfp/active",
        },
        {
          title: "RFP Responses",
          href: "/rfp/responses",
        },
        {
          title: "RFP Templates",
          href: "/rfp/templates",
        },
      ],
    },
    {
      title: "Purchase Orders",
      icon: ShoppingCart,
      href: "/purchase-orders",
      roles: ["admin", "procurement_officer"],
      subItems: [
        {
          title: "Create PO",
          href: "/purchase-orders/create",
        },
        {
          title: "Pending POs",
          href: "/purchase-orders/pending",
        },
        {
          title: "Active POs",
          href: "/purchase-orders/active",
        },
        {
          title: "PO History",
          href: "/purchase-orders/history",
        },
      ],
    },
    {
      title: "Approvals",
      icon: ClipboardList,
      href: "/approvals",
      roles: ["admin", "procurement_officer", "approver"],
    },
    {
      title: "Budget Management",
      icon: Calculator,
      href: "/budget",
      roles: ["admin", "procurement_officer"],
      subItems: [
        {
          title: "Budget Overview",
          href: "/budget/overview",
        },
        {
          title: "Budget Allocation",
          href: "/budget/allocation",
        },
        {
          title: "Budget Reports",
          href: "/budget/reports",
        },
      ],
    },
    {
      title: "Compliance & Audit",
      icon: Shield,
      href: "/compliance",
      roles: ["admin", "procurement_officer"],
      subItems: [
        {
          title: "Audit Trail",
          href: "/compliance/audit-trail",
        },
        {
          title: "Compliance Reports",
          href: "/compliance/reports",
        },
        {
          title: "Policy Management",
          href: "/compliance/policies",
        },
      ],
    },
    {
      title: "Risk Management",
      icon: AlertTriangle,
      href: "/risk",
      roles: ["admin", "procurement_officer"],
      subItems: [
        {
          title: "Risk Assessment",
          href: "/risk/assessment",
        },
        {
          title: "Risk Monitoring",
          href: "/risk/monitoring",
        },
        {
          title: "Risk Reports",
          href: "/risk/reports",
        },
      ],
    },
    {
      title: "Analytics & Reports",
      icon: TrendingUp,
      href: "/analytics",
      roles: ["admin", "procurement_officer"],
      subItems: [
        {
          title: "Performance Analytics",
          href: "/analytics/performance",
        },
        {
          title: "Spend Analysis",
          href: "/analytics/spend",
        },
        {
          title: "Vendor Performance",
          href: "/analytics/vendor-performance",
        },
        {
          title: "Custom Reports",
          href: "/analytics/custom",
        },
      ],
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
    <Sidebar collapsible="icon" className="border-r mt-16">
      <SidebarContent className="h-[calc(100vh-4rem)]">
        <ScrollArea className="flex-1 h-full">
          <SidebarGroup className="pt-4">
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
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
