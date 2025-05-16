
import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, BarChart4, ArrowRightLeft, Warehouse } from "lucide-react";
import { useLocation } from "react-router-dom";

const InventoryIndex = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Determine the active tab based on the current path
  const getActiveTab = () => {
    if (currentPath.includes("/inventory/warehouses")) {
      return "warehouses";
    } else if (currentPath.includes("/inventory/transactions")) {
      return "transactions";
    } else if (currentPath.includes("/inventory/reports")) {
      return "reports";
    } else {
      return "items"; // Default tab
    }
  };
  
  const activeTab = getActiveTab();

  return (
    <div className="space-y-6 p-6 pb-16">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Inventory Management</h2>
        <p className="text-muted-foreground">
          Manage your inventory items, warehouses, and track inventory movements
        </p>
      </div>

      <Tabs value={activeTab} className="space-y-4">
        <TabsList className="bg-muted h-10">
          <TabsTrigger value="items" asChild>
            <NavLink to="/inventory" end className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span>Inventory Items</span>
            </NavLink>
          </TabsTrigger>
          <TabsTrigger value="warehouses" asChild>
            <NavLink to="/inventory/warehouses" className="flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              <span>Warehouses</span>
            </NavLink>
          </TabsTrigger>
          <TabsTrigger value="transactions" asChild>
            <NavLink to="/inventory/transactions" className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              <span>Transactions</span>
            </NavLink>
          </TabsTrigger>
          <TabsTrigger value="reports" asChild>
            <NavLink to="/inventory/reports" className="flex items-center gap-2">
              <BarChart4 className="h-4 w-4" />
              <span>Reports</span>
            </NavLink>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div>
        <Outlet />
      </div>
    </div>
  );
};

export default InventoryIndex;
