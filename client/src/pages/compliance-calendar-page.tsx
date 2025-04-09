import { AppLayout } from '@/components/layout/app-layout';
import { ComplianceCalendar } from '@/components/tasks/compliance-calendar';

export function ComplianceCalendarPage() {
  return (
    <AppLayout title="Compliance Calendar">
      <div className="container mx-auto py-6">
        <ComplianceCalendar />
      </div>
    </AppLayout>
  );
}