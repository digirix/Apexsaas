import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { SettingsNavigation } from "@/components/settings/settings-navigation";
import { SecuritySettings } from "@/components/settings/security-settings";
import { DisplaySettings } from "@/components/settings/display-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { BackupSettings } from "@/components/settings/backup-settings";
import { TaskSettings } from "@/components/settings/task-settings";
import { InvoiceSettings } from "@/components/settings/invoice-settings";
import { IntegrationSettings } from "@/components/settings/integration-settings";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [activeCategory, setActiveCategory] = useState("security");
  
  // Extract the category from URL query parameters if present
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1]);
    const category = params.get("category");
    if (category) {
      setActiveCategory(category);
    }
  }, [location]);
  
  // Handle category change
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (!user) {
    // Redirect to login page or show access denied message
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">Please log in to access settings.</p>
      </div>
    );
  }
  
  // Render the appropriate settings component based on active category
  const renderSettingsContent = () => {
    switch (activeCategory) {
      case "security":
        return <SecuritySettings />;
      case "display":
        return <DisplaySettings />;
      case "notifications":
        return <NotificationSettings />;
      case "backup":
        return <BackupSettings />;
      case "tasks":
        return <TaskSettings />;
      case "invoices":
        return <InvoiceSettings />;
      case "integrations":
        return <IntegrationSettings />;
      case "reports":
        return (
          <div className="p-8 text-center">
            <h2 className="text-xl font-semibold">Report Settings</h2>
            <p className="text-muted-foreground mt-2">
              Report settings are coming soon. This feature is under development.
            </p>
          </div>
        );
      default:
        return <SecuritySettings />;
    }
  };
  
  return (
    <AppLayout title="Settings">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 flex-shrink-0">
          <SettingsNavigation 
            activeCategory={activeCategory} 
            onCategoryChange={handleCategoryChange} 
          />
        </div>
        
        <div className="flex-1">
          {renderSettingsContent()}
        </div>
      </div>
    </AppLayout>
  );
}