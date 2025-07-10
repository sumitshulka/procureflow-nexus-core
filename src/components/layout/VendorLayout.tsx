import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import VendorHeader from "@/components/layout/VendorHeader";
import VendorSidebar from "@/components/layout/VendorSidebar";

interface VendorLayoutProps {
  children: React.ReactNode;
}

const VendorLayout = ({ children }: VendorLayoutProps) => {
  return (
    <div className="min-h-screen w-full">
      <VendorHeader />
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-[calc(100vh-4rem)] w-full">
          <VendorSidebar />
          <SidebarInset className="flex-1">
            <main className="flex-1 p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-[calc(100vh-4rem)]">
              <div className="text-left">
                {children}
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default VendorLayout;