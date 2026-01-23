
import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppHeader from "@/components/layout/AppHeader";
import AppSidebar from "@/components/layout/AppSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex flex-col w-full">
        <AppHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset className="flex-1 bg-muted overflow-x-hidden">
            <ScrollArea className="h-[calc(100vh-4rem)] w-full">
              <div className="p-6 pt-20 min-w-0 max-w-full">
                {children}
              </div>
            </ScrollArea>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
