import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AiConfigurationsManager from "@/components/setup/ai-configurations-manager";
import AiAssistantCustomizationManager from "@/components/setup/ai-assistant-customization-manager";
import { Brain, Settings, User } from "lucide-react";
import { SetupNavigation } from "@/components/setup/setup-navigation";
import { SetupSection } from "@/types/setup";
import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";

export default function AiCustomizationPage() {
  const [activeSection, setActiveSection] = useState<SetupSection>('ai-configurations');

  return (
    <AppLayout title="AI Configuration">
      <div className="flex">
        <div className="w-64 flex-shrink-0">
          <SetupNavigation activeSection={activeSection} onSectionChange={setActiveSection} />
        </div>
        <div className="flex-1 p-6">
          <h1 className="text-3xl font-bold mb-6">AI Configuration</h1>
          
          <Tabs defaultValue="providers" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="providers" className="flex items-center">
                <Brain className="mr-2 h-4 w-4" />
                AI Provider Settings
              </TabsTrigger>
              <TabsTrigger value="assistant" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                Assistant Customization
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="providers" className="mt-0">
              <AiConfigurationsManager />
            </TabsContent>
            
            <TabsContent value="assistant" className="mt-0">
              <AiAssistantCustomizationManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}