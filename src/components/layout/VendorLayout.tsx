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
      <div className="min-h-screen w-full">
        <VendorHeader />
        <div className="flex w-full">
          <VendorSidebar />
          <SidebarInset className="flex-1">
            <main className="pt-20 px-6 pb-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-[calc(100vh-4rem)]">
              <div className="w-full max-w-none">
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