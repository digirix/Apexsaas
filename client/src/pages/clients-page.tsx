import { AppLayout } from "@/components/layout/app-layout";
import { ClientList } from "@/components/clients/client-list";

export default function ClientsPage() {
  return (
    <AppLayout title="Clients">
      <ClientList />
    </AppLayout>
  );
}
