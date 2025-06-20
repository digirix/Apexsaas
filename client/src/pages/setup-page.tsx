import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { SetupNavigation } from "@/components/setup/setup-navigation";
import { CountriesManager } from "@/components/setup/countries-manager";
import { CurrenciesManager } from "@/components/setup/currencies-manager";
import { StatesManager } from "@/components/setup/states-manager";
import { EntityTypesManager } from "@/components/setup/entity-types-manager";
import { TaskStatusesManager } from "@/components/setup/task-statuses-manager";
import { TaskStatusWorkflowManager } from "@/components/setup/task-status-workflow-manager";
import { TaskCategoriesManager } from "@/components/setup/task-categories-manager";
import { ServiceTypesManager } from "@/components/setup/service-types-manager";
import { TaxJurisdictionsManager } from "@/components/setup/tax-jurisdictions-manager";
import DesignationsManager from "@/components/setup/designations-manager";
import DepartmentsManager from "@/components/setup/departments-manager";
import AiConfigurationsManager from "@/components/setup/ai-configurations-manager";
import { SetupSection } from "@/types/setup";

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
          {activeSection === 'task-status-workflow' && <TaskStatusWorkflowManager />}
          {activeSection === 'task-categories' && <TaskCategoriesManager />}
          {activeSection === 'service-types' && <ServiceTypesManager />}
          {activeSection === 'tax-jurisdictions' && <TaxJurisdictionsManager />}
          {activeSection === 'ai-configurations' && <AiConfigurationsManager />}
          {activeSection === 'designations' && <DesignationsManager />}
          {activeSection === 'departments' && <DepartmentsManager />}
        </div>
      </div>
    </AppLayout>
  );
}
