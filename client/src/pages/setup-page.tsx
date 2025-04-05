import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { SetupNavigation } from "@/components/setup/setup-navigation";
import { CountriesManager } from "@/components/setup/countries-manager";
import { CurrenciesManager } from "@/components/setup/currencies-manager";
import { StatesManager } from "@/components/setup/states-manager";

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
          {activeSection === 'entity-types' && (
            <div className="bg-white shadow rounded-md p-6">
              <h2 className="text-lg font-semibold mb-4">Entity Types</h2>
              <p className="text-slate-500">Entity Types management coming soon</p>
            </div>
          )}
          {activeSection === 'task-statuses' && (
            <div className="bg-white shadow rounded-md p-6">
              <h2 className="text-lg font-semibold mb-4">Task Statuses</h2>
              <p className="text-slate-500">Task Statuses management coming soon</p>
            </div>
          )}
          {activeSection === 'service-types' && (
            <div className="bg-white shadow rounded-md p-6">
              <h2 className="text-lg font-semibold mb-4">Service Types</h2>
              <p className="text-slate-500">Service Types management coming soon</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
