import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BarChart,
  Building2,
  Category,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  Settings,
  ShoppingBag,
  Store,
  User,
  Users,
  Menu,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const AppSidebar = () => {
  const { hasRole } = useAuth();
  const location = useLocation();

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
      icon: Category,
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
    <>
      <aside className="fixed left-0 top-0 z-20 flex h-full w-64 flex-col border-r bg-white pt-16 shadow-sm">
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              if (item.roles && !item.roles.some((role) => hasRole(role))) {
                return null;
              }

              if (item.subItems) {
                return (
                  <Accordion type="single" collapsible key={item.title}>
                    <AccordionItem value={item.title}>
                      <AccordionTrigger className="flex items-center justify-between py-2 font-medium">
                        <div className="flex items-center space-x-3">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="mt-2 space-y-1 pl-5">
                          {item.subItems.map((subItem) => (
                            <li key={subItem.title}>
                              <NavLink
                                to={subItem.href}
                                className={({ isActive }) =>
                                  cn(
                                    "block rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100",
                                    isActive ? "bg-gray-100" : "text-gray-700"
                                  )
                                }
                              >
                                {subItem.title}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                );
              }

              return (
                <li key={item.title}>
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100",
                        isActive ? "bg-gray-100" : "text-gray-700"
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      <Sheet>
        <SheetTrigger className="absolute left-4 top-4 z-50 lg:hidden">
          <Menu className="h-6 w-6" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 pt-16">
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                if (item.roles && !item.roles.some((role) => hasRole(role))) {
                  return null;
                }

                if (item.subItems) {
                  return (
                    <Accordion type="single" collapsible key={item.title}>
                      <AccordionItem value={item.title}>
                        <AccordionTrigger className="flex items-center justify-between py-2 font-medium">
                          <div className="flex items-center space-x-3">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="mt-2 space-y-1 pl-5">
                            {item.subItems.map((subItem) => (
                              <li key={subItem.title}>
                                <NavLink
                                  to={subItem.href}
                                  className={({ isActive }) =>
                                    cn(
                                      "block rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100",
                                      isActive ? "bg-gray-100" : "text-gray-700"
                                    )
                                  }
                                >
                                  {subItem.title}
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                }

                return (
                  <li key={item.title}>
                    <NavLink
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100",
                          isActive ? "bg-gray-100" : "text-gray-700"
                        )
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AppSidebar;
