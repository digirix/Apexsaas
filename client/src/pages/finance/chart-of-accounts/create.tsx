import React from 'react';
import ChartOfAccountsCreateTabular from '@/components/finance/chart-of-accounts-create-tabular';
import { AppLayout } from '@/components/layout/app-layout';

export default function CreateChartOfAccountPage() {
  return (
    <AppLayout title="Create Chart of Account">
      <div className="container py-6">
        <ChartOfAccountsCreateTabular />
      </div>
    </AppLayout>
  );
}