import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { SettingsNavigation } from "@/components/settings/settings-navigation";
import { GeneralSettings } from "@/components/settings/general-settings";
import { SecuritySettings } from "@/components/settings/security-settings";
import { DisplaySettings } from "@/components/settings/display-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { BackupSettings } from "@/components/settings/backup-settings";
import { TaskSettings } from "@/components/settings/task-settings";
import { InvoiceSettings } from "@/components/settings/invoice-settings";
import { IntegrationSettings } from "@/components/settings/integration-settings";

export type SettingsSection = 
  'general' | 
  'security' | 
  'display' | 
  'notifications' | 
  'backup' | 
  'tasks' | 
  'invoices' | 
  'integrations';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  return (
    <AppLayout title="Settings">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 flex-shrink-0">
          <SettingsNavigation 
            activeSection={activeSection} 
            onSectionChange={setActiveSection} 
          />
        </div>
        
        <div className="flex-1">
          {activeSection === 'general' && <GeneralSettings />}
          {activeSection === 'security' && <SecuritySettings />}
          {activeSection === 'display' && <DisplaySettings />}
          {activeSection === 'notifications' && <NotificationSettings />}
          {activeSection === 'backup' && <BackupSettings />}
          {activeSection === 'tasks' && <TaskSettings />}
          {activeSection === 'invoices' && <InvoiceSettings />}
          {activeSection === 'integrations' && <IntegrationSettings />}
        </div>
      </div>
    </AppLayout>
  );
}