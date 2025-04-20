import React from 'react';
import ChartOfAccountsCreate from '@/components/finance/chart-of-accounts-create';
import { AppLayout } from '@/components/layout/app-layout';

export default function CreateChartOfAccountPage() {
  return (
    <AppLayout title="Create Chart of Account">
      <div className="container py-6">
        <ChartOfAccountsCreate />
      </div>
    </AppLayout>
  );
}