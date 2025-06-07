import * as React from "react";
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
  Calendar,
  RefreshCw,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Brain,
  Cog,
  BotIcon,
  FileText,
  GitBranch,
  Shield,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  Clock,
  Target,
  PieChart,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useModulePermissions, useMultiplePermissions } from "@/hooks/use-permissions";

type SubNavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
};

type NavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
  module: string;
  subItems?: SubNavItem[];
};

// All available navigation modules with their permission module names
const allModules: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: <LayoutDashboard className="h-5 w-5 mr-3 text-slate-500" />,
    module: "dashboard",
  },
  {
    title: "Setup",
    href: "/setup",
    icon: <Settings className="h-5 w-5 mr-3 text-slate-500" />,
    module: "setup",
  },
  {
    title: "Clients",
    href: "/clients",
    icon: <UsersRound className="h-5 w-5 mr-3 text-slate-500" />,
    module: "clients",
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: <ClipboardCheck className="h-5 w-5 mr-3 text-slate-500" />,
    module: "tasks",
  },
  {
    title: "Auto Generated Tasks",
    href: "/auto-generated-tasks",
    icon: <RefreshCw className="h-5 w-5 mr-3 text-slate-500" />,
    module: "auto-generated-tasks",
  },
  {
    title: "Compliance Calendar",
    href: "/compliance-calendar",
    icon: <Calendar className="h-5 w-5 mr-3 text-slate-500" />,
    module: "compliance-calendar",
  },
  {
    title: "Finance",
    href: "/finance",
    icon: <CreditCard className="h-5 w-5 mr-3 text-slate-500" />,
    module: "finance",
  },
  {
    title: "AI Reporting",
    href: "/ai-reporting",
    icon: <BarChart2 className="h-5 w-5 mr-3 text-slate-500" />,
    module: "ai-reporting",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: <FileText className="h-5 w-5 mr-3 text-slate-500" />,
    module: "reports",
    subItems: [
      {
        title: "Task Performance Analytics",
        href: "/reports/task-performance",
        icon: <TrendingUp className="h-4 w-4" />,
      },
      {
        title: "Compliance Overview",
        href: "/reports/compliance-overview",
        icon: <AlertTriangle className="h-4 w-4" />,
      },
      {
        title: "Team Efficiency Report",
        href: "/reports/team-efficiency",
        icon: <Target className="h-4 w-4" />,
      },
      {
        title: "Task Lifecycle Analysis",
        href: "/reports/task-lifecycle",
        icon: <Clock className="h-4 w-4" />,
      },
      {
        title: "Risk Assessment Report",
        href: "/reports/risk-assessment",
        icon: <Shield className="h-4 w-4" />,
      },
      {
        title: "Jurisdiction Analysis",
        href: "/reports/jurisdiction-analysis",
        icon: <PieChart className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Users",
    href: "/users",
    icon: <Users className="h-5 w-5 mr-3 text-slate-500" />,
    module: "users",
  },
  {
    title: "Workflow",
    href: "/workflow",
    icon: <Zap className="h-5 w-5 mr-3 text-slate-500" />,
    module: "workflow-automation",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: <Cog className="h-5 w-5 mr-3 text-slate-500" />,
    module: "settings",
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [expandedMenus, setExpandedMenus] = React.useState<string[]>([]);

  // Get all module names for permission checking
  const moduleNames = allModules.map(module => module.module);
  const permissions = useMultiplePermissions(moduleNames);

  // Filter modules based on permissions - only show if user has access (not restricted)
  const visibleModules = React.useMemo(() => {
    return allModules.filter(module => {
      // Super Admins see everything
      if (user?.isSuperAdmin) return true;
      
      // For regular users, check if they have access to this module
      const modulePermission = permissions[module.module];
      // User has access if they have any access level other than "restricted"
      return modulePermission && modulePermission.accessLevel !== "restricted";
    });
  }, [user?.isSuperAdmin, permissions, allModules]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Toggle desktop sidebar collapse state
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  // Toggle mobile sidebar open state
  const toggleMobile = () => {
    setMobileOpen(!mobileOpen);
  };

  // Toggle sub-menu expansion
  const toggleSubMenu = (moduleTitle: string) => {
    setExpandedMenus(prev => 
      prev.includes(moduleTitle) 
        ? prev.filter(item => item !== moduleTitle)
        : [...prev, moduleTitle]
    );
  };

  // Check if current location matches any sub-item
  const isSubItemActive = (subItems: SubNavItem[] | undefined) => {
    return subItems?.some(subItem => location === subItem.href) || false;
  };

  // Auto-expand menu if sub-item is active
  React.useEffect(() => {
    visibleModules.forEach(module => {
      if (module.subItems && isSubItemActive(module.subItems)) {
        if (!expandedMenus.includes(module.title)) {
          setExpandedMenus(prev => [...prev, module.title]);
        }
      }
    });
  }, [location, visibleModules]);

  return (
    <>
      {/* Mobile Overlay - shown when sidebar is open on mobile */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden" 
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={toggleMobile}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white shadow-md border-r border-slate-200 flex-shrink-0 flex flex-col z-50 transition-all duration-300 ease-in-out",
          // Mobile styles
          "fixed inset-y-0 left-0 transform md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop styles
          "md:relative md:z-0",
          collapsed ? "md:w-20" : "md:w-64"
        )}
      >
        {/* Header with title */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className={cn("overflow-hidden", collapsed && "md:hidden")}>
            <h1 className="text-xl font-bold text-slate-800">AccFirm</h1>
            <p className="text-xs text-slate-500">Accounting Firm Management</p>
          </div>
          {collapsed && (
            <div className="hidden md:flex justify-center w-full">
              <h1 className="text-xl font-bold text-slate-800">AF</h1>
            </div>
          )}
          {/* Desktop collapse toggle button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={toggleCollapse}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <div className={cn("px-3 mb-3", collapsed && "md:hidden")}>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-3">
              {user?.isSuperAdmin ? "All Modules" : "Available Modules"}
            </p>
          </div>

          {visibleModules.map((item) => (
            <div key={item.href}>
              {/* Main menu item */}
              {item.subItems ? (
                <button
                  onClick={() => toggleSubMenu(item.title)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 mx-2 text-sm font-medium rounded-md",
                    collapsed && "md:justify-center md:px-2 md:mx-1",
                    (location === item.href || isSubItemActive(item.subItems))
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center">
                    {React.cloneElement(item.icon as React.ReactElement, {
                      className: cn(
                        "h-5 w-5",
                        collapsed ? "mr-0" : "mr-3", 
                        "text-slate-500",
                        (location === item.href || isSubItemActive(item.subItems)) ? "text-blue-500" : ""
                      ),
                    })}
                    {(!collapsed || !window.matchMedia('(min-width: 768px)').matches) && (
                      <span>{item.title}</span>
                    )}
                  </div>
                  {(!collapsed || !window.matchMedia('(min-width: 768px)').matches) && (
                    expandedMenus.includes(item.title) ? 
                      <ChevronUp className="h-4 w-4 text-slate-400" /> : 
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              ) : (
                <Link 
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 mx-2 text-sm font-medium rounded-md",
                    collapsed && "md:justify-center md:px-2 md:mx-1",
                    location === item.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                  onClick={() => {
                    // Only close mobile sidebar on mobile devices
                    if (window.innerWidth < 768) {
                      setMobileOpen(false);
                    }
                  }}
                >
                  {React.cloneElement(item.icon as React.ReactElement, {
                    className: cn(
                      "h-5 w-5",
                      collapsed ? "mr-0" : "mr-3", 
                      "text-slate-500",
                      location === item.href ? "text-blue-500" : ""
                    ),
                  })}
                  {(!collapsed || !window.matchMedia('(min-width: 768px)').matches) && (
                    <span>{item.title}</span>
                  )}
                </Link>
              )}

              {/* Sub-menu items */}
              {item.subItems && expandedMenus.includes(item.title) && (!collapsed || !window.matchMedia('(min-width: 768px)').matches) && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.subItems.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={cn(
                        "flex items-center px-3 py-2 mx-2 text-sm rounded-md",
                        location === subItem.href
                          ? "bg-blue-100 text-blue-800"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                      )}
                      onClick={() => {
                        // Only close mobile sidebar on mobile devices
                        if (window.innerWidth < 768) {
                          setMobileOpen(false);
                        }
                      }}
                    >
                      {React.cloneElement(subItem.icon as React.ReactElement, {
                        className: cn(
                          "h-4 w-4 mr-3",
                          location === subItem.href ? "text-blue-600" : "text-slate-400"
                        ),
                      })}
                      <span>{subItem.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {visibleModules.length === 0 && !user?.isSuperAdmin && (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-slate-500">No modules available</p>
              <p className="text-xs text-slate-400 mt-1">Contact your administrator for access</p>
            </div>
          )}

          {!user?.isSuperAdmin && visibleModules.length > 0 && (
            <div className={cn("px-3 mt-6 mb-3", collapsed && "md:hidden")}>
              <div className="flex items-center gap-2 px-3">
                <Shield className="h-3 w-3 text-slate-400" />
                <p className="text-xs text-slate-400">Permission-based access</p>
              </div>
            </div>
          )}
        </nav>

        <div className={cn("p-4 border-t border-slate-200", collapsed && "md:p-2")}>
          <div className={cn("flex items-center", collapsed && "md:justify-center")}>
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center text-sm font-medium text-slate-600 hover:text-slate-900",
                collapsed && "md:justify-center md:w-full"
              )}
            >
              <LogOut className={cn("h-5 w-5", collapsed ? "mr-0" : "mr-3", "text-slate-500")} />
              {(!collapsed || !window.matchMedia('(min-width: 768px)').matches) && (
                <span>Logout</span>
              )}
            </button>
          </div>
          <a
            href="#help"
            className={cn(
              "flex items-center mt-3 text-sm font-medium text-slate-600 hover:text-slate-900",
              collapsed && "md:justify-center"
            )}
            onClick={() => setMobileOpen(false)}
          >
            <HelpCircle className={cn("h-5 w-5", collapsed ? "mr-0" : "mr-3", "text-slate-500")} />
            {(!collapsed || !window.matchMedia('(min-width: 768px)').matches) && (
              <span>Help</span>
            )}
          </a>
        </div>
      </aside>
    </>
  );
}
