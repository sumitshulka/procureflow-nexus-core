
import { SidebarProvider } from "@/components/ui/sidebar";
import AppHeader from "@/components/layout/AppHeader";
import AppSidebar from "@/components/layout/AppSidebar";
import { Outlet } from "react-router-dom";

const AppLayout = () => {
  return (
    <SidebarProvider collapsedWidth={64} defaultCollapsed={false}>
      <div className="min-h-screen flex flex-col w-full">
        <AppHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <main className="flex-1 overflow-auto bg-gray-50">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
