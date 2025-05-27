import { Bell, ChevronDown, Search, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
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
import { TenantSetting } from "@shared/schema";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const tenant = useTenant();
  const [designStyle, setDesignStyle] = useState("classic");
  const [themeMode, setThemeMode] = useState("light");
  const [primaryColor, setPrimaryColor] = useState("blue");
  const [fontSize, setFontSize] = useState("medium");
  const [borderRadius, setBorderRadius] = useState(8);
  const [compactMode, setCompactMode] = useState(false);
  const [enableAnimations, setEnableAnimations] = useState(true);

  // Fetch all display settings
  const { data: settings = [] } = useQuery<TenantSetting[]>({
    queryKey: ["/api/v1/tenant/settings"],
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (settings.length > 0) {
      const styleSettings = settings.find(s => s.key === "design_style");
      const themeModeSettings = settings.find(s => s.key === "theme_mode");
      const primaryColorSettings = settings.find(s => s.key === "primary_color");
      const fontSizeSettings = settings.find(s => s.key === "font_size");
      const borderRadiusSettings = settings.find(s => s.key === "border_radius");
      const compactModeSettings = settings.find(s => s.key === "compact_mode");
      const animationsSettings = settings.find(s => s.key === "enable_animations");
      
      setDesignStyle(styleSettings?.value || "classic");
      setThemeMode(themeModeSettings?.value || "light");
      setPrimaryColor(primaryColorSettings?.value || "blue");
      setFontSize(fontSizeSettings?.value || "medium");
      setBorderRadius(parseInt(borderRadiusSettings?.value || "8"));
      setCompactMode(compactModeSettings?.value === "true");
      setEnableAnimations(animationsSettings?.value !== "false");
    }
  }, [settings]);

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

  // Classic header (original)
  if (designStyle === "classic") {
    return (
      <header className={cn(
        "bg-white shadow-sm z-20 border-b border-slate-200",
        "fixed top-0 left-0 right-0 md:sticky"
      )}>
        <div className="px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="flex justify-between h-16">
            {/* Left side - Title (hidden on mobile) */}
            <div className="hidden md:flex flex-col justify-center">
              <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
              {subtitle && (
                <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
              )}
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
              <NotificationBell />

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

  // Elegant header with sophisticated design
  if (designStyle === "elegant") {
    return (
      <motion.header 
        className={cn(
          "bg-white/80 backdrop-blur-xl shadow-sm z-20 border-b border-gray-100/50 font-light",
          "fixed top-0 left-0 right-0 md:sticky"
        )}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="px-6 sm:px-8 lg:px-12 mx-auto">
          <div className="flex justify-between h-20">
            {/* Left side - Title with large thin font */}
            <motion.div 
              className="hidden md:flex flex-col justify-center"
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <motion.h1 
                className="text-3xl font-extralight tracking-wide bg-gradient-to-r from-gray-700 via-slate-600 to-gray-800 bg-clip-text text-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.4 }}
                whileHover={{ scale: 1.02 }}
              >
                {title}
              </motion.h1>
              {subtitle && (
                <motion.p 
                  className="text-sm font-light text-gray-400 mt-1 tracking-wider"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  {subtitle}
                </motion.p>
              )}
            </motion.div>

            {/* Center - Elegant Search */}
            <motion.div 
              className="flex-1 md:flex-initial flex items-center justify-center md:ml-12 max-w-lg"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="relative w-full max-w-md mx-auto md:mx-0">
                <motion.div 
                  className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
                  whileHover={{ scale: 1.1 }}
                >
                  <Search className="h-5 w-5 text-gray-300" />
                </motion.div>
                <Input 
                  type="search" 
                  placeholder="Search across workspace..." 
                  className="pl-12 h-12 md:w-80 lg:w-96 bg-white/60 backdrop-blur-lg border border-gray-100/60 shadow-sm rounded-2xl hover:bg-white/80 focus:bg-white/90 transition-all duration-300 font-light text-lg placeholder:text-gray-300 placeholder:font-light"
                />
              </div>
            </motion.div>

            {/* Right side - Elegant User actions */}
            <motion.div 
              className="flex items-center space-x-6"
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-300 hover:text-gray-500 hover:bg-gray-50/60 backdrop-blur-lg rounded-2xl transition-all duration-300 h-12 w-12"
                >
                  <span className="sr-only">View notifications</span>
                  <div className="relative">
                    <Bell className="h-6 w-6" />
                    <motion.span 
                      className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-red-400 ring-2 ring-white/80 shadow-sm"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                </Button>
              </motion.div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="ghost"
                      className="flex items-center space-x-4 focus:outline-none h-auto px-3 py-2 hover:bg-gray-50/60 backdrop-blur-lg rounded-2xl transition-all duration-300"
                    >
                      <motion.div
                        whileHover={{ rotate: 3 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <Avatar className="h-10 w-10 border-2 border-gray-100/60 shadow-md">
                          <AvatarFallback className="bg-gradient-to-br from-gray-400 to-slate-500 text-white font-light text-lg">
                            {user ? getInitials(user.displayName) : "?"}
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                      <div className="text-left hidden md:block">
                        <p className="text-lg font-light text-gray-600 tracking-wide">
                          {user?.displayName}
                        </p>
                        <p className="text-sm font-extralight text-gray-400 tracking-wider">
                          {user?.isSuperAdmin ? "Super Admin" : "Member"}
                        </p>
                      </div>
                      <ChevronDown className="h-5 w-5 text-gray-300" />
                    </Button>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-64 bg-white/90 backdrop-blur-xl border border-gray-100/50 shadow-xl rounded-2xl p-2 font-light"
                  asChild
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <DropdownMenuLabel className="text-lg font-light text-gray-600 px-3 py-2">My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-100/50" />
                    <DropdownMenuItem className="hover:bg-gray-50/80 rounded-xl text-base font-light py-3 px-3 text-gray-600">
                      <span>Profile Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-gray-50/80 rounded-xl text-base font-light py-3 px-3 text-gray-600">
                      <span>Preferences</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-100/50" />
                    <DropdownMenuItem onClick={handleLogout} className="hover:bg-red-50/80 rounded-xl text-base font-light py-3 px-3 text-red-500">
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </motion.div>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          </div>
          
          {/* Mobile title with large thin font */}
          <motion.div 
            className="md:hidden -mt-4 pb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h1 className="text-2xl font-extralight tracking-wide bg-gradient-to-r from-gray-700 to-slate-600 bg-clip-text text-transparent">
              {title}
            </h1>
          </motion.div>
        </div>
      </motion.header>
    );
  }

  // Animated header with stunning effects
  return (
    <motion.header 
      className={cn(
        "bg-white/80 backdrop-blur-xl shadow-lg z-20 border-b border-white/20",
        "fixed top-0 left-0 right-0 md:sticky"
      )}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div className="px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="flex justify-between h-16">
          {/* Left side - Title (hidden on mobile) */}
          <motion.div 
            className="hidden md:flex flex-col justify-center"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.h1 
              className="text-xl font-semibold bg-gradient-to-r from-slate-800 via-blue-800 to-purple-800 bg-clip-text text-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                <span>{title}</span>
              </div>
            </motion.h1>
            {subtitle && (
              <motion.p 
                className="text-sm text-slate-500 mt-0.5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                {subtitle}
              </motion.p>
            )}
          </motion.div>

          {/* Center - Search */}
          <motion.div 
            className="flex-1 md:flex-initial flex items-center justify-center md:ml-8 max-w-lg"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="relative w-full max-w-md mx-auto md:mx-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <Input 
                type="search" 
                placeholder="Search..." 
                className="pl-10 h-9 md:w-64 lg:w-72 bg-white/70 backdrop-blur-lg border border-white/30 shadow-lg rounded-xl hover:bg-white/80 transition-all duration-300"
              />
            </div>
          </motion.div>

          {/* Right side - User actions */}
          <motion.div 
            className="flex items-center space-x-4"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-slate-600 hover:bg-white/50 backdrop-blur-lg rounded-xl transition-all duration-300"
              >
                <span className="sr-only">View notifications</span>
                <div className="relative">
                  <Bell className="h-5 w-5" />
                  <motion.span 
                    className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </Button>
            </motion.div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-3 focus:outline-none h-auto px-2 hover:bg-white/50 backdrop-blur-lg rounded-xl transition-all duration-300"
                  >
                    <motion.div
                      whileHover={{ rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <Avatar className="h-8 w-8 border-2 border-white/50 shadow-lg">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                          {user ? getInitials(user.displayName) : "?"}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
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
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white/90 backdrop-blur-xl border border-white/30 shadow-xl rounded-xl">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="hover:bg-blue-50/80 rounded-lg">
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-blue-50/80 rounded-lg">
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="hover:bg-red-50/80 rounded-lg">
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        </div>
        
        {/* Mobile title - visible only on mobile */}
        <motion.div 
          className="md:hidden -mt-3 pb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h1 className="text-lg font-semibold bg-gradient-to-r from-slate-800 to-blue-800 bg-clip-text text-transparent flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span>{title}</span>
          </h1>
        </motion.div>
      </div>
    </motion.header>
  );
}
