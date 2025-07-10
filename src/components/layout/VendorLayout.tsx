import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import VendorHeader from "@/components/layout/VendorHeader";
import VendorSidebar from "@/components/layout/VendorSidebar";

interface VendorLayoutProps {
  children: React.ReactNode;
}

const VendorLayout = ({ children }: VendorLayoutProps) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex">
        <VendorSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <VendorHeader />
          <SidebarInset className="flex-1">
            <main className="flex-1 p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-[calc(100vh-4rem)]">
              <div className="w-full max-w-none text-left">
                {children}
              </div>
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default VendorLayout;