import { ReactNode, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { TenantSetting } from "@shared/schema";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const [designStyle, setDesignStyle] = useState("classic");
  const [themeMode, setThemeMode] = useState("light");
  const [primaryColor, setPrimaryColor] = useState("blue");
  const [fontSize, setFontSize] = useState("medium");
  const [borderRadius, setBorderRadius] = useState(8);
  const [compactMode, setCompactMode] = useState(false);
  const [enableAnimations, setEnableAnimations] = useState(true);

  // Fetch settings to determine all display preferences
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

  // Generate dynamic classes based on settings
  const getThemeClasses = () => {
    const classes = [];
    
    // Font size classes
    switch (fontSize) {
      case "small":
        classes.push("text-sm");
        break;
      case "large":
        classes.push("text-lg");
        break;
      default:
        classes.push("text-base");
    }
    
    // Compact mode
    if (compactMode) {
      classes.push("compact-mode");
    }
    
    // Border radius
    const radiusClass = `rounded-${borderRadius === 4 ? "sm" : borderRadius === 12 ? "lg" : "md"}`;
    
    // Primary color theme
    const colorTheme = `theme-${primaryColor}`;
    
    // Dark mode
    if (themeMode === "dark") {
      classes.push("dark");
    }
    
    return classes.join(" ");
  };

  const dynamicStyles = {
    "--border-radius": `${borderRadius}px`,
    "--primary-color": primaryColor === "blue" ? "#3b82f6" : 
                      primaryColor === "green" ? "#10b981" : 
                      primaryColor === "purple" ? "#8b5cf6" : "#3b82f6",
  } as React.CSSProperties;

  // Classic layout with integrated display settings
  if (designStyle === "classic") {
    const bgColor = themeMode === "dark" ? "bg-gray-900" : "bg-slate-50";
    const textColor = themeMode === "dark" ? "text-white" : "text-gray-900";
    const borderColor = themeMode === "dark" ? "border-gray-700" : "border-gray-200";
    const cardBg = themeMode === "dark" ? "bg-gray-800" : "bg-white";
    
    const padding = compactMode ? "p-2 sm:p-3 lg:p-4" : "p-4 sm:p-6 lg:p-8";
    const headerPadding = compactMode ? "pt-20 md:pt-4" : "pt-24 md:pt-6";
    
    const primaryColorClasses = {
      blue: themeMode === "dark" ? "accent-blue-400" : "accent-blue-600",
      green: themeMode === "dark" ? "accent-green-400" : "accent-green-600", 
      purple: themeMode === "dark" ? "accent-purple-400" : "accent-purple-600"
    };

    return (
      <div 
        className={`min-h-screen flex ${bgColor} ${textColor} relative ${getThemeClasses()}`}
        style={dynamicStyles}
      >
        <Sidebar />
        
        <div className={`flex-1 flex flex-col min-h-screen md:ml-0 ${enableAnimations ? "transition-all duration-300 ease-in-out" : ""}`}>
          <Header title={title} />
          
          <main className={`flex-1 overflow-y-auto ${bgColor} ${padding} ${headerPadding}`}>
            <div style={{ borderRadius: `${borderRadius}px` }} className={`${primaryColorClasses[primaryColor as keyof typeof primaryColorClasses]}`}>
              {children}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Elegant layout with sophisticated design and integrated settings
  if (designStyle === "elegant") {
    const bgGradient = themeMode === "dark" 
      ? "bg-gradient-to-br from-gray-900 via-slate-900/80 to-gray-800/60" 
      : "bg-gradient-to-br from-white via-slate-50/80 to-gray-100/60";
    
    const textColor = themeMode === "dark" ? "text-gray-100" : "text-gray-900";
    const sidebarBg = themeMode === "dark" ? "bg-gray-800/60" : "bg-white/60";
    const headerBg = themeMode === "dark" ? "bg-gray-800/70" : "bg-white/70";
    const borderColor = themeMode === "dark" ? "border-gray-700/40" : "border-gray-200/40";
    
    const padding = compactMode ? "p-4 sm:p-5 lg:p-8" : "p-6 sm:p-8 lg:p-12";
    const headerPadding = compactMode ? "pt-24 md:pt-6" : "pt-28 md:pt-8";
    
    const fontWeight = fontSize === "large" ? "font-extralight" : "font-light";
    
    // Primary color for background elements
    const primaryBgElements = primaryColor === "blue" ? "from-blue-50/40 to-indigo-50/30" :
                             primaryColor === "green" ? "from-green-50/40 to-emerald-50/30" :
                             "from-purple-50/40 to-violet-50/30";

    return (
      <div 
        className={`min-h-screen ${bgGradient} relative ${fontWeight} ${textColor} ${getThemeClasses()}`}
        style={dynamicStyles}
      >
        {/* Elegant Background Elements with subtle animations */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {enableAnimations ? (
            <>
              <motion.div
                className={`absolute top-0 right-0 w-[32rem] h-[32rem] bg-gradient-to-bl ${primaryBgElements} rounded-full blur-3xl`}
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{ transform: "translate(25%, -25%)" }}
              />
              <motion.div
                className={`absolute bottom-0 left-0 w-[28rem] h-[28rem] bg-gradient-to-tr ${primaryBgElements} rounded-full blur-3xl`}
                animate={{
                  scale: [1.05, 1, 1.05],
                  opacity: [0.4, 0.6, 0.4],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{ transform: "translate(-25%, 25%)" }}
              />
            </>
          ) : (
            <>
              <div className={`absolute top-0 right-0 w-[32rem] h-[32rem] bg-gradient-to-bl ${primaryBgElements} rounded-full blur-3xl opacity-40`} style={{ transform: "translate(25%, -25%)" }} />
              <div className={`absolute bottom-0 left-0 w-[28rem] h-[28rem] bg-gradient-to-tr ${primaryBgElements} rounded-full blur-3xl opacity-50`} style={{ transform: "translate(-25%, 25%)" }} />
            </>
          )}
        </div>

        <div className="min-h-screen flex relative z-10">
          {/* Sidebar with drawer-like appearance */}
          {enableAnimations ? (
            <motion.div
              className={`hidden md:block shadow-2xl border-r ${borderColor} backdrop-blur-sm ${sidebarBg}`}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ borderRadius: `0 ${borderRadius}px ${borderRadius}px 0` }}
            >
              <Sidebar />
            </motion.div>
          ) : (
            <div className={`hidden md:block shadow-2xl border-r ${borderColor} backdrop-blur-sm ${sidebarBg}`} style={{ borderRadius: `0 ${borderRadius}px ${borderRadius}px 0` }}>
              <Sidebar />
            </div>
          )}
          
          {enableAnimations ? (
            <motion.div 
              className="flex-1 flex flex-col min-h-screen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <motion.div
                className={`shadow-lg border-b ${borderColor} backdrop-blur-md ${headerBg}`}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Header title={title} />
              </motion.div>
              
              <motion.main 
                className={`flex-1 overflow-y-auto ${padding} ${headerPadding}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <motion.div
                  className="max-w-7xl mx-auto"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  style={{ borderRadius: `${borderRadius}px` }}
                >
                  {children}
                </motion.div>
              </motion.main>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col min-h-screen">
              <div className={`shadow-lg border-b ${borderColor} backdrop-blur-md ${headerBg}`}>
                <Header title={title} />
              </div>
              
              <main className={`flex-1 overflow-y-auto ${padding} ${headerPadding}`}>
                <div className="max-w-7xl mx-auto" style={{ borderRadius: `${borderRadius}px` }}>
                  {children}
                </div>
              </main>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Animated layout with stunning effects and integrated settings
  const bgGradient = themeMode === "dark" 
    ? "bg-gradient-to-br from-gray-900 via-slate-900/30 to-gray-800/40" 
    : `bg-gradient-to-br from-slate-50 via-${primaryColor}-50/30 to-indigo-50/40`;
  
  const textColor = themeMode === "dark" ? "text-gray-100" : "text-gray-900";
  const padding = compactMode ? "p-3 sm:p-4 lg:p-6" : "p-4 sm:p-6 lg:p-8";
  const headerPadding = compactMode ? "pt-20 md:pt-4" : "pt-24 md:pt-6";
  
  // Primary color for animated elements
  const primaryAnimatedColors = primaryColor === "blue" ? "from-blue-400/20 to-purple-400/20" :
                               primaryColor === "green" ? "from-green-400/20 to-emerald-400/20" :
                               "from-purple-400/20 to-violet-400/20";
  
  const secondaryAnimatedColors = primaryColor === "blue" ? "from-purple-400/20 to-pink-400/20" :
                                 primaryColor === "green" ? "from-emerald-400/20 to-teal-400/20" :
                                 "from-violet-400/20 to-indigo-400/20";

  return (
    <div 
      className={`min-h-screen ${bgGradient} relative overflow-hidden ${textColor} ${getThemeClasses()}`}
      style={dynamicStyles}
    >
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {enableAnimations ? (
          <>
            <motion.div
              className={`absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-br ${primaryAnimatedColors} rounded-full blur-3xl`}
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <motion.div
              className={`absolute -bottom-4 -left-4 w-96 h-96 bg-gradient-to-br ${secondaryAnimatedColors} rounded-full blur-3xl`}
              animate={{
                scale: [1.1, 1, 1.1],
                rotate: [360, 180, 0],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <motion.div
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br ${primaryAnimatedColors} rounded-full blur-3xl`}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </>
        ) : (
          <>
            <div className={`absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-br ${primaryAnimatedColors} rounded-full blur-3xl opacity-40`} />
            <div className={`absolute -bottom-4 -left-4 w-96 h-96 bg-gradient-to-br ${secondaryAnimatedColors} rounded-full blur-3xl opacity-30`} />
            <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br ${primaryAnimatedColors} rounded-full blur-3xl opacity-50`} />
          </>
        )}
      </div>

      <div className="min-h-screen flex relative z-10">
        {enableAnimations ? (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ borderRadius: `0 ${borderRadius}px ${borderRadius}px 0` }}
          >
            <Sidebar />
          </motion.div>
        ) : (
          <div style={{ borderRadius: `0 ${borderRadius}px ${borderRadius}px 0` }}>
            <Sidebar />
          </div>
        )}
        
        {enableAnimations ? (
          <motion.div 
            className="flex-1 flex flex-col min-h-screen md:ml-0 transition-all duration-300 ease-in-out"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Header title={title} />
            </motion.div>
            
            <motion.main 
              className={`flex-1 overflow-y-auto ${padding} ${headerPadding}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                style={{ borderRadius: `${borderRadius}px` }}
              >
                {children}
              </motion.div>
            </motion.main>
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col min-h-screen md:ml-0">
            <Header title={title} />
            
            <main className={`flex-1 overflow-y-auto ${padding} ${headerPadding}`}>
              <div style={{ borderRadius: `${borderRadius}px` }}>
                {children}
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
