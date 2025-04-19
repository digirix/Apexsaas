import { ReactNode } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex bg-slate-50 relative">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen md:ml-0 transition-all duration-300 ease-in-out">
        <Header title={title} />
        
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 pt-24 md:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
