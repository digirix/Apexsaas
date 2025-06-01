import { Sidebar } from "@/components/ui/sidebar";

interface ReportsLayoutProps {
  children: React.ReactNode;
}

export function ReportsLayout({ children }: ReportsLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 ml-64 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}