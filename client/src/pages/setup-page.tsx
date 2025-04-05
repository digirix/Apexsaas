import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { SetupNavigation } from "@/components/setup/setup-navigation";
import { CountriesManager } from "@/components/setup/countries-manager";
import { CurrenciesManager } from "@/components/setup/currencies-manager";
import { StatesManager } from "@/components/setup/states-manager";
import { EntityTypesManager } from "@/components/setup/entity-types-manager";
import { TaskStatusesManager } from "@/components/setup/task-statuses-manager";
import { ServiceTypesManager } from "@/components/setup/service-types-manager";

type SetupSection = 'countries' | 'currencies' | 'states' | 'entity-types' | 'task-statuses' | 'service-types';

export default function SetupPage() {
  const [activeSection, setActiveSection] = useState<SetupSection>('countries');

  return (
    <AppLayout title="Setup">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 flex-shrink-0">
          <SetupNavigation 
            activeSection={activeSection} 
            onSectionChange={setActiveSection} 
          />
        </div>
        
        <div className="flex-1">
          {activeSection === 'countries' && <CountriesManager />}
          {activeSection === 'currencies' && <CurrenciesManager />}
          {activeSection === 'states' && <StatesManager />}
          {activeSection === 'entity-types' && <EntityTypesManager />}
          {activeSection === 'task-statuses' && <TaskStatusesManager />}
          {activeSection === 'service-types' && <ServiceTypesManager />}
        </div>
      </div>
    </AppLayout>
  );
}
