
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppHeader from "@/components/layout/AppHeader";
import AppSidebar from "@/components/layout/AppSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

const Layout = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex flex-col w-full">
        <AppHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset className="flex-1 bg-gray-50">
            <ScrollArea className="h-[calc(100vh-4rem)]">
              <main className="p-6">
                <Outlet />
              </main>
            </ScrollArea>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
