import { AppLayout } from "@/components/layout/app-layout";
import { TaskList } from "@/components/tasks/task-list";
import { useParams } from "wouter";

export default function TasksPage() {
  const { id } = useParams<{ id?: string }>();
  
  return (
    <AppLayout title="Tasks">
      <TaskList highlightTaskId={id ? parseInt(id) : undefined} />
    </AppLayout>
  );
}
