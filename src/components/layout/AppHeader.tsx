
import React from "react";
import { Bell, Menu, Search, Settings, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const AppHeader: React.FC = () => {
  const { userData, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between border-b bg-white px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden">
          <Menu className="h-5 w-5" />
        </SidebarTrigger>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <span className="text-procurement-600">Procurement</span>
          <span className="hidden sm:inline">Management System</span>
        </h1>
      </div>

      <div className="hidden md:flex relative w-96">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search..."
          className="pl-8 h-9 w-full rounded-md border bg-background px-3"
        />
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-72 overflow-y-auto">
              <div className="p-3 hover:bg-muted cursor-pointer">
                <div className="text-sm font-medium">New RFP Response</div>
                <div className="text-xs text-muted-foreground">
                  Vendor ABC submitted a proposal for RFP-2023-001
                </div>
                <div className="text-xs text-muted-foreground mt-1">2 hours ago</div>
              </div>
              <div className="p-3 hover:bg-muted cursor-pointer">
                <div className="text-sm font-medium">Request Approved</div>
                <div className="text-xs text-muted-foreground">
                  Purchase request PR-2023-087 was approved by Finance
                </div>
                <div className="text-xs text-muted-foreground mt-1">3 hours ago</div>
              </div>
              <div className="p-3 hover:bg-muted cursor-pointer">
                <div className="text-sm font-medium">Low Stock Alert</div>
                <div className="text-xs text-muted-foreground">
                  Office supplies (Paper A4) is below reorder level
                </div>
                <div className="text-xs text-muted-foreground mt-1">Yesterday</div>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center cursor-pointer">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Settings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>System Settings</DropdownMenuItem>
            <DropdownMenuItem>User Preferences</DropdownMenuItem>
            <DropdownMenuItem>Notification Settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              {userData?.avatarUrl ? (
                <img
                  src={userData.avatarUrl}
                  alt="User avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                  <User className="h-4 w-4" />
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{userData?.fullName || "My Account"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Activity Log</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AppHeader;
