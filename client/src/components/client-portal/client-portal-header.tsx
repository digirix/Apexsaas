import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  LogOut, 
  Settings, 
  Bell, 
  Building, 
  Menu,
  X 
} from "lucide-react";

interface ClientPortalHeaderProps {
  client: any;
  onLogout: () => void;
  onProfileClick: () => void;
}

export function ClientPortalHeader({ client, onLogout, onProfileClick }: ClientPortalHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white/90 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Client Portal</span>
            </div>
            <Badge variant="secondary" className="hidden md:inline-flex">
              {client?.status || 'Active'}
            </Badge>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <nav className="flex space-x-4">
              <Button variant="ghost" size="sm" onClick={() => window.location.href = '/client-portal'}>
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = '/client-portal/entities'}>
                Entities
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = '/client-portal/tasks'}>
                Tasks
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = '/client-portal/invoices'}>
                Invoices
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = '/client-portal/reports'}>
                Reports
              </Button>
            </nav>

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs"></span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {client?.displayName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{client?.displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{client?.displayName}</p>
                  <p className="text-muted-foreground">{client?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onProfileClick}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200 mt-2 pt-4">
            <div className="flex flex-col space-y-2">
              <Button variant="ghost" className="justify-start" onClick={() => window.location.href = '/client-portal'}>
                Dashboard
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => window.location.href = '/client-portal/entities'}>
                Entities
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => window.location.href = '/client-portal/tasks'}>
                Tasks
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => window.location.href = '/client-portal/invoices'}>
                Invoices
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => window.location.href = '/client-portal/reports'}>
                Reports
              </Button>
              <div className="pt-2 border-t border-gray-200">
                <Button variant="ghost" className="justify-start" onClick={onProfileClick}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Button>
                <Button variant="ghost" className="justify-start text-red-600" onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}