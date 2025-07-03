import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import VendorHeader from "@/components/layout/VendorHeader";
import VendorSidebar from "@/components/layout/VendorSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VendorLayoutProps {
  children: React.ReactNode;
}

const VendorLayout = ({ children }: VendorLayoutProps) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex flex-col w-full">
        <VendorHeader />
        <div className="flex flex-1">
          <VendorSidebar />
          <SidebarInset className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100">
            <ScrollArea className="h-[calc(100vh-4rem)]">
              <div className="p-6 pt-20">
                {children}
              </div>
            </ScrollArea>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default VendorLayout;