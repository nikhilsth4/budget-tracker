import { createServerSupabase } from "@/lib/supabase/server";
import { listTasks, listCompletions } from "@/lib/data/tasks";
import { TasksView } from "@/components/tasks/TasksView";
import { toDateStr, addDays } from "@/lib/tasks";

export default async function TasksPage() {
  const supabase = await createServerSupabase();
  const windowStart = addDays(toDateStr(new Date()), -366);
  const [tasks, completions] = await Promise.all([
    listTasks(supabase),
    listCompletions(supabase, windowStart),
  ]);
  return <TasksView tasks={tasks} completions={completions} />;
}
