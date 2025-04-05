import { useParams } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { ClientDetail } from "@/components/clients/client-detail";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = parseInt(params.id);

  if (isNaN(clientId)) {
    return (
      <AppLayout title="Client Detail">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-slate-500 mb-4">Invalid client ID</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Client Detail">
      <ClientDetail clientId={clientId} />
    </AppLayout>
  );
}
