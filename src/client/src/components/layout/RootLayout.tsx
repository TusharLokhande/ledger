import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export function RootLayout() {

  return (
    <SidebarProvider>
      <AppSidebar />
      {/* Fixed to the viewport so only the content area between header and footer scrolls. */}
      <SidebarInset className="h-svh overflow-hidden">
        <Header />
        <main className="flex min-h-0 flex-1 flex-col overflow-auto">
          <Outlet />
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
