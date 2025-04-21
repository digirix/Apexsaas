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
import PaymentGatewaysManager from "@/components/setup/payment-gateways-manager";
import { Button } from "@/components/ui/button";
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
          {activeSection === 'payment-gateways' && <PaymentGatewaysManager />}
          {activeSection === 'designations' && <DesignationsManager />}
          {activeSection === 'departments' && <DepartmentsManager />}
          {activeSection === 'chart-of-accounts' && (
            <div className="w-full">
              <Button 
                variant="outline"
                className="mb-4" 
                onClick={() => window.location.href = '/setup/chart-of-accounts'}
              >
                Go to Chart of Accounts Setup
              </Button>
              <p className="text-gray-600">
                Configure your Chart of Accounts with element groups, sub-element groups, detailed groups, and account heads.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
