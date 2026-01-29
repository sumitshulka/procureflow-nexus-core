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
      moduleRoute: "/dashboard",
    },
    {
      title: "Procurement Requests",
      icon: ListChecks,
      href: "/requests",
      moduleRoute: "/requests",
    },
    {
      title: "Purchase Management",
      icon: ShoppingCart,
      href: "/purchase-management",
      moduleRoute: "/purchase-orders",
      subItems: [
        { title: "Vendor Management", href: "/vendors" },
        { title: "RFP Management", href: "/rfp" },
        { title: "Purchase Orders", href: "/purchase-orders" },
        { title: "Goods Receipt (GRN)", href: "/grn" },
        { title: "Invoice Management", href: "/invoices" },
      ],
    },
    {
      title: "Inventory Management",
      icon: Package,
      href: "/inventory",
      moduleRoute: "/inventory",
      subItems: [
        { title: "Product Catalog", href: "/products" },
        { title: "Inventory Items", href: "/inventory/items" },
        { title: "Batch Management", href: "/inventory/batches" },
        { title: "Inventory Transactions", href: "/inventory/transactions" },
        { title: "Warehouses", href: "/inventory/warehouses" },
        { title: "Inventory Reports", href: "/inventory/reports" },
      ],
    },
    {
      title: "Budget Management",
      icon: Calculator,
      href: "/budget",
      moduleRoute: "/budget",
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
      moduleRoute: "/compliance",
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
      moduleRoute: "/risk",
      subItems: [
        { title: "Risk Assessment", href: "/risk/assessment" },
        { title: "Risk Monitoring", href: "/risk/monitoring" },
        { title: "Risk Reports", href: "/risk/reports" },
      ],
    },
    {
      title: "Approvals",
      icon: ClipboardList,
      href: "/approvals",
      moduleRoute: "/approvals",
    },
    {
      title: "Reports",
      icon: BarChart,
      href: "/reports",
      moduleRoute: "/analytics",
    },
    {
      title: "Vendor Portal",
      icon: Store,
      href: "/vendor-portal",
      moduleRoute: "/vendor-portal",
      vendorOnly: true,
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/settings",
      moduleRoute: "/settings",
    },
    {
      title: "User Management",
      icon: Users,
      href: "/users",
      moduleRoute: "/users",
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
    // Vendor-only items - ONLY show to vendors, never to admins
    // Vendor Portal is a separate system for vendors, not an admin feature
    if ((item as any).vendorOnly) {
      return userData?.roles?.some(r => r.toLowerCase() === 'vendor') || false;
    }

    // Admin can access all other items
    if (isAdmin) return true;

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
