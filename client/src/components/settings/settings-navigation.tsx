import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Globe, 
  Shield, 
  Layout, 
  Bell, 
  Database, 
  ClipboardCheck,
  Receipt,
  PlugZap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsSection } from "@/pages/settings-page";

interface SettingsNavigationProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
  description?: string;
}

export function SettingsNavigation({ activeSection, onSectionChange }: SettingsNavigationProps) {
  const settingsItems: NavItem[] = [
    // General settings
    {
      id: 'general',
      label: 'General',
      icon: <Globe className="h-5 w-5" />,
      description: 'Basic application settings'
    },
    {
      id: 'security',
      label: 'Security',
      icon: <Shield className="h-5 w-5" />,
      description: 'Password and access settings'
    },
    {
      id: 'display',
      label: 'Display',
      icon: <Layout className="h-5 w-5" />,
      description: 'Appearance and theme settings'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="h-5 w-5" />,
      description: 'Email and alert preferences'
    },
    {
      id: 'backup',
      label: 'Backup & Restore',
      icon: <Database className="h-5 w-5" />,
      description: 'Data backup and restoration'
    },
    
    // Module-specific settings
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <ClipboardCheck className="h-5 w-5" />,
      description: 'Task management settings'
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: <Receipt className="h-5 w-5" />,
      description: 'Invoice and billing settings'
    },
    {
      id: 'integrations',
      label: 'Integrations',
      icon: <PlugZap className="h-5 w-5" />,
      description: 'External service connections'
    }
  ];

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">Settings</h2>
      <div className="space-y-1">
        {settingsItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              "w-full justify-start",
              activeSection === item.id ? "bg-blue-50 text-blue-700" : "text-slate-600"
            )}
            onClick={() => onSectionChange(item.id)}
          >
            {React.cloneElement(item.icon as React.ReactElement, {
              className: cn(
                (item.icon as React.ReactElement).props.className,
                "mr-2",
                activeSection === item.id ? "text-blue-700" : "text-slate-500"
              ),
            })}
            <div className="flex flex-col items-start">
              <span>{item.label}</span>
              {item.description && (
                <span className="text-xs text-slate-500">{item.description}</span>
              )}
            </div>
          </Button>
        ))}
      </div>
    </Card>
  );
}