import { AppLayout } from "@/components/layout/app-layout";
import { TaskList } from "@/components/tasks/task-list";

export default function TasksPage() {
  return (
    <AppLayout title="Tasks">
      <TaskList />
    </AppLayout>
  );
}
