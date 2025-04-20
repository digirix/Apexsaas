import React from 'react';
import ChartOfAccountsNew from '@/components/finance/chart-of-accounts-new';
import { AppLayout } from '@/components/layout/app-layout';

export default function CreateChartOfAccountPage() {
  return (
    <AppLayout title="Chart of Accounts Management">
      <div className="container py-6">
        <ChartOfAccountsNew />
      </div>
    </AppLayout>
  );
}