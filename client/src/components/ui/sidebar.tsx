import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Settings,
  Users,
  ClipboardCheck,
  CreditCard,
  Zap,
  HelpCircle,
  LogOut,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type NavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
};

const coreModules: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: <LayoutDashboard className="h-5 w-5 mr-3 text-slate-500" />,
  },
  {
    title: "Setup",
    href: "/setup",
    icon: <Settings className="h-5 w-5 mr-3 text-slate-500" />,
  },
  {
    title: "Clients",
    href: "/clients",
    icon: <UsersRound className="h-5 w-5 mr-3 text-slate-500" />,
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: <ClipboardCheck className="h-5 w-5 mr-3 text-slate-500" />,
  },
  {
    title: "Finance",
    href: "/finance",
    icon: <CreditCard className="h-5 w-5 mr-3 text-slate-500" />,
  },
];

const adminModules: NavItem[] = [
  {
    title: "Users",
    href: "/users",
    icon: <Users className="h-5 w-5 mr-3 text-slate-500" />,
  },
  {
    title: "Workflow",
    href: "/workflow",
    icon: <Zap className="h-5 w-5 mr-3 text-slate-500" />,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: <Settings className="h-5 w-5 mr-3 text-slate-500" />,
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-slate-200 flex-shrink-0 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800">AccFirm</h1>
        <p className="text-xs text-slate-500">Accounting Firm Management</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 mb-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-3">
            Core Modules
          </p>
        </div>

        {coreModules.map((item) => (
          <Link key={item.href} href={item.href}>
            <a
              className={cn(
                "flex items-center px-3 py-2 mx-2 text-sm font-medium rounded-md",
                location === item.href
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {React.cloneElement(item.icon as React.ReactElement, {
                className: cn(
                  (item.icon as React.ReactElement).props.className,
                  location === item.href ? "text-blue-500" : ""
                ),
              })}
              {item.title}
            </a>
          </Link>
        ))}

        <div className="px-3 mt-6 mb-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-3">
            Administration
          </p>
        </div>

        {adminModules.map((item) => (
          <Link key={item.href} href={item.href}>
            <a
              className={cn(
                "flex items-center px-3 py-2 mx-2 text-sm font-medium rounded-md",
                location === item.href
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {React.cloneElement(item.icon as React.ReactElement, {
                className: cn(
                  (item.icon as React.ReactElement).props.className,
                  location === item.href ? "text-blue-500" : ""
                ),
              })}
              {item.title}
            </a>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleLogout}
            className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <LogOut className="h-5 w-5 mr-3 text-slate-500" />
            Logout
          </button>
        </div>
        <a
          href="#help"
          className="flex items-center mt-3 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <HelpCircle className="h-5 w-5 mr-3 text-slate-500" />
          Help & Support
        </a>
      </div>
    </aside>
  );
}
