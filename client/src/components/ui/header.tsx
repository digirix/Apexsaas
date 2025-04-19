import { Bell, ChevronDown, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  function getInitials(name: string): string {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }

  return (
    <header className={cn(
      "bg-white shadow-sm z-20 border-b border-slate-200",
      "fixed top-0 left-0 right-0 md:sticky"
    )}>
      <div className="px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="flex justify-between h-16">
          {/* Left side - Title (hidden on mobile) */}
          <div className="hidden md:flex items-center">
            <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
          </div>

          {/* Center - Search */}
          <div className="flex-1 md:flex-initial flex items-center justify-center md:ml-8 max-w-lg">
            <div className="relative w-full max-w-md mx-auto md:mx-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <Input 
                type="search" 
                placeholder="Search..." 
                className="pl-10 h-9 md:w-64 lg:w-72 bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          {/* Right side - User actions */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <span className="sr-only">View notifications</span>
              <div className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              </div>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-3 focus:outline-none h-auto px-2 hover:bg-slate-100"
                >
                  <Avatar className="h-8 w-8 border-2 border-slate-200">
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                      {user ? getInitials(user.displayName) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden md:block">
                    <p className="text-sm font-medium text-slate-700">
                      {user?.displayName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {user?.isSuperAdmin ? "Super Admin" : "Member"}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Mobile title - visible only on mobile */}
        <div className="md:hidden -mt-3 pb-2">
          <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
        </div>
      </div>
    </header>
  );
}
