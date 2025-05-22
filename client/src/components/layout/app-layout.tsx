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

  // Fetch settings to determine design style
  const { data: settings = [] } = useQuery<TenantSetting[]>({
    queryKey: ["/api/v1/tenant/settings"],
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (settings.length > 0) {
      const styleSettings = settings.find(s => s.key === "design_style");
      setDesignStyle(styleSettings?.value || "classic");
    }
  }, [settings]);

  // Classic layout (original)
  if (designStyle === "classic") {
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

  // Elegant layout with sophisticated design
  if (designStyle === "elegant") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 relative">
        {/* Elegant Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-100/30 to-purple-100/20 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-indigo-100/25 to-blue-100/15 rounded-full blur-3xl transform -translate-x-1/4 translate-y-1/4" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-gray-100/20 to-slate-100/10 rounded-full blur-2xl" />
        </div>

        <div className="min-h-screen flex relative z-10">
          <div className="shadow-xl border-r border-gray-200/50">
            <Sidebar />
          </div>
          
          <div className="flex-1 flex flex-col min-h-screen md:ml-0">
            <div className="shadow-md border-b border-gray-200/30 backdrop-blur-sm">
              <Header title={title} />
            </div>
            
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-24 md:pt-6">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  // Animated layout with stunning effects
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
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
          className="absolute -bottom-4 -left-4 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
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
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-green-400/10 to-blue-400/10 rounded-full blur-3xl"
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
      </div>

      <div className="min-h-screen flex relative z-10">
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Sidebar />
        </motion.div>
        
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
            className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-24 md:pt-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              {children}
            </motion.div>
          </motion.main>
        </motion.div>
      </div>
    </div>
  );
}
