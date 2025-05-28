import { useParams } from "wouter";
import { EntityDetail } from "@/components/entities/entity-detail";
import { AppLayout } from "@/components/layout/app-layout";

export function EntityDetailPage() {
  const { entityId } = useParams<{ entityId: string }>();

  if (!entityId) {
    return (
      <AppLayout title="Entity Detail">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Invalid Entity</h3>
          <p className="text-gray-600">No entity ID provided.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Entity Detail">
      <EntityDetail entityId={entityId} />
    </AppLayout>
  );
}