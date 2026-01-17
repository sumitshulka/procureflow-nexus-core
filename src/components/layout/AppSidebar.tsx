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
  BookOpen,
  Receipt,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const AppSidebar = () => {
  const { hasRole, userData } = useAuth();
  const { hasModuleAccess, isLoading: permissionsLoading } = useModulePermissions();
  const { state } = useSidebar();

  // Check if user is admin (case-insensitive)
  const isAdmin = userData?.roles?.some(r => r.toLowerCase() === 'admin');

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      title: "Product Catalog",
      icon: ShoppingBag,
      href: "/products",
      moduleRoute: "/catalog", // Maps to system_modules route_path
    },
    {
      title: "Inventory Management",
      icon: Package,
      href: "/inventory",
      subItems: [
        { title: "Inventory Items", href: "/inventory/items" },
        { title: "Inventory Transactions", href: "/inventory/transactions" },
        { title: "Warehouses", href: "/inventory/warehouses" },
        { title: "Inventory Reports", href: "/inventory/reports" },
      ],
    },
    {
      title: "Procurement Requests",
      icon: ListChecks,
      href: "/requests",
    },
    {
      title: "RFP Management",
      icon: FileText,
      href: "/rfp",
      subItems: [
        { title: "Create RFP", href: "/rfp/create" },
        { title: "Active RFPs", href: "/rfp/active" },
        { title: "RFP Responses", href: "/rfp/responses" },
        { title: "RFP Templates", href: "/rfp/templates" },
      ],
    },
    {
      title: "Purchase Orders",
      icon: ShoppingCart,
      href: "/purchase-orders",
    },
    {
      title: "Invoice Management",
      icon: Receipt,
      href: "/invoices",
    },
    {
      title: "Approvals",
      icon: ClipboardList,
      href: "/approvals",
    },
    {
      title: "Budget Management",
      icon: Calculator,
      href: "/budget",
      subItems: [
        { title: "Budget Overview", href: "/budget/overview" },
        { title: "Budget Allocation", href: "/budget/allocation" },
        { title: "Budget Reports", href: "/budget/reports" },
      ],
    },
    {
      title: "Compliance & Audit",
      icon: Shield,
      href: "/compliance",
      subItems: [
        { title: "Audit Trail", href: "/compliance/audit-trail" },
        { title: "Compliance Reports", href: "/compliance/reports" },
        { title: "Policy Management", href: "/compliance/policies" },
      ],
    },
    {
      title: "Risk Management",
      icon: AlertTriangle,
      href: "/risk",
      subItems: [
        { title: "Risk Assessment", href: "/risk/assessment" },
        { title: "Risk Monitoring", href: "/risk/monitoring" },
        { title: "Risk Reports", href: "/risk/reports" },
      ],
    },
    {
      title: "Reports",
      icon: BarChart,
      href: "/reports",
      moduleRoute: "/analytics", // Maps to Analytics & Reports module
    },
    {
      title: "Vendor Management",
      icon: Building2,
      href: "/vendors",
    },
    {
      title: "Vendor Portal",
      icon: Store,
      href: "/vendor-portal",
      vendorOnly: true,
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/settings",
    },
    {
      title: "User Management",
      icon: Users,
      href: "/users",
    },
  ];

  const documentationItems = [
    {
      title: "Feature Documentation",
      icon: BookOpen,
      href: "/documentation/features",
    },
  ];

  // Check if user can see a menu item based on module permissions
  const canAccessMenuItem = (item: typeof menuItems[0]): boolean => {
    // Admin can access everything
    if (isAdmin) return true;

    // Vendor-only items - check if user has vendor role
    if ((item as any).vendorOnly) {
      return userData?.roles?.some(r => r.toLowerCase() === 'vendor') || false;
    }

    // Check module access using the route path
    const routeToCheck = (item as any).moduleRoute || item.href;
    return hasModuleAccess(routeToCheck);
  };

  // Show loading state briefly
  if (permissionsLoading) {
    return (
      <Sidebar collapsible="icon" className="border-r mt-16">
        <SidebarContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" className="border-r mt-16">
      <SidebarContent>
        <ScrollArea className="flex-1 px-2">
          <SidebarGroup className="pt-4">
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => {
                  if (!canAccessMenuItem(item)) {
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

          {/* Documentation Section */}
          <SidebarGroup className="mt-6 pt-4 border-t border-sidebar-border">
            <SidebarGroupContent>
              <SidebarMenu>
                {documentationItems.map((item) => (
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
