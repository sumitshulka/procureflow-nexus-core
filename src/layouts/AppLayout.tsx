
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppHeader from "@/components/layout/AppHeader";
import AppSidebar from "@/components/layout/AppSidebar";

// This component is a duplicate of Layout.tsx
// It's kept for backward compatibility but should be consolidated in the future
const AppLayout = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex flex-col w-full">
        <AppHeader />
        <div className="flex flex-1 pt-16">
          <AppSidebar />
          <SidebarInset className="flex-1 bg-gray-50">
            <div className="h-[calc(100vh-8rem)] overflow-auto">
              <div className="p-6">
                <Outlet />
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
