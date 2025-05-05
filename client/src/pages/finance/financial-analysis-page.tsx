import { AppLayout } from "@/components/layout/app-layout";
import { AIFinancialAnalysis } from "@/components/finance/ai-financial-analysis";

export default function FinancialAnalysisPage() {
  return (
    <AppLayout title="Financial Analysis">
      <AIFinancialAnalysis />
    </AppLayout>
  );
}