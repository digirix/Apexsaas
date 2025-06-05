import React from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Bell, 
  Database, 
  FileText, 
  Layers,
  Settings2, 
  Shield, 
  Workflow
} from "lucide-react";

type SettingCategory = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
};

// Define all setting categories
// Removed duplicates that exist in Setup Module:
// - Reports (reporting is in setup)
// - Integrations (AI configs and payment gateways in setup)
const settingCategories: SettingCategory[] = [
  {
    id: "general",
    name: "General",
    description: "Basic account settings and preferences",
    icon: <Settings2 className="h-5 w-5" />,
  },
  {
    id: "security",
    name: "Security",
    description: "Password and authentication options",
    icon: <Shield className="h-5 w-5" />,
  },
  {
    id: "display",
    name: "Display",
    description: "Appearance and theme customization",
    icon: <Layers className="h-5 w-5" />,
  },
  {
    id: "notifications",
    name: "Notifications",
    description: "Notification system removed",
    icon: <Bell className="h-5 w-5" />,
  },
  {
    id: "backup",
    name: "Backup & Restore",
    description: "Data backup and recovery options",
    icon: <Database className="h-5 w-5" />,
  },
  {
    id: "tasks",
    name: "Task Settings",
    description: "Configure task behavior and defaults",
    icon: <Workflow className="h-5 w-5" />,
  },
  {
    id: "invoices",
    name: "Invoice Settings",
    description: "Invoice templates and payment options",
    icon: <FileText className="h-5 w-5" />,
  },
];

type SettingsNavigationProps = {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
};

export function SettingsNavigation({ activeCategory, onCategoryChange }: SettingsNavigationProps) {
  const [_, setLocation] = useLocation();
  
  const handleCategoryClick = (categoryId: string) => {
    onCategoryChange(categoryId);
    setLocation(`/settings?category=${categoryId}`, { replace: true });
  };
  
  return (
    <div className="w-full md:w-64 flex-shrink-0 border-r border-border bg-card rounded-l-lg overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your account settings</p>
        <a href="/setup" className="block mt-2 text-sm text-blue-500 hover:underline">
          System setup options →
        </a>
      </div>
      
      <nav className="space-y-1 p-2">
        {settingCategories.map((category) => (
          <button
            key={category.id}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              activeCategory === category.id
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground"
            )}
            onClick={() => handleCategoryClick(category.id)}
          >
            {category.icon}
            <div className="text-left">
              <p className="font-medium">{category.name}</p>
              <p className="text-xs text-muted-foreground hidden md:block">{category.description}</p>
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
}