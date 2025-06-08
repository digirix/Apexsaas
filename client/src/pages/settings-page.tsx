import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { SettingsNavigation } from "@/components/settings/settings-navigation";
import { GeneralSettings } from "@/components/settings/general-settings";
import { SecuritySettings } from "@/components/settings/security-settings";
import { DisplaySettings } from "@/components/settings/display-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { BackupSettings } from "@/components/settings/backup-settings";
import { TaskSettings } from "@/components/settings/task-settings";
import { InvoiceSettings } from "@/components/settings/invoice-settings";
import { PaymentGatewaySettings } from "@/components/settings/payment-gateway-settings";

export default function SettingsPage() {
  const [location] = useLocation();
  const [activeCategory, setActiveCategory] = useState("general");

  // Parse category from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const category = urlParams.get('category');
    if (category) {
      setActiveCategory(category);
    }
  }, [location]);

  const renderActiveComponent = () => {
    switch (activeCategory) {
      case "general":
        return <GeneralSettings />;
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
      case "payments":
        return <PaymentGatewaySettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-8rem)]">
          <SettingsNavigation 
            activeCategory={activeCategory} 
            onCategoryChange={setActiveCategory} 
          />
          
          <div className="flex-1 overflow-auto">
            <div className="bg-card rounded-r-lg md:rounded-l-none rounded-lg border min-h-full">
              <div className="p-6">
                {renderActiveComponent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}