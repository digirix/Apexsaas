import React from 'react';
import JournalEntryCreate from '@/components/finance/journal-entry-create';
import { AppLayout } from '@/components/layout/app-layout';

export default function CreateJournalEntryPage() {
  return (
    <AppLayout title="Create Journal Entry">
      <div className="container py-6">
        <JournalEntryCreate />
      </div>
    </AppLayout>
  );
}