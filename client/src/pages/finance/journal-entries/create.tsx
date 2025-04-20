import React from 'react';
import JournalEntryCreateUpdated from '@/components/finance/journal-entry-create-updated';
import { AppLayout } from '@/components/layout/app-layout';

export default function CreateJournalEntryPage() {
  return (
    <AppLayout title="Create Journal Entry">
      <div className="container py-6">
        <JournalEntryCreateUpdated />
      </div>
    </AppLayout>
  );
}