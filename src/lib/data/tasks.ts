import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskRow, TaskCompletionRow, TaskKind } from "@/lib/supabase/types";

export async function listTasks(sb: SupabaseClient): Promise<TaskRow[]> {
  const { data, error } = await sb
    .from("tasks")
    .select("*")
    .order("sort")
    .order("created_at");
  if (error) throw error;
  return data as TaskRow[];
}

export async function listCompletions(
  sb: SupabaseClient,
  fromDate: string,
): Promise<TaskCompletionRow[]> {
  const { data, error } = await sb
    .from("task_completions")
    .select("*")
    .gte("done_on", fromDate);
  if (error) throw error;
  return data as TaskCompletionRow[];
}

export interface NewTask {
  title: string;
  kind: TaskKind;
  due_on: string | null;
  time_of_day: string | null;
}

export async function createTask(sb: SupabaseClient, input: NewTask): Promise<TaskRow> {
  const { data, error } = await sb.from("tasks").insert(input).select().single();
  if (error) throw error;
  return data as TaskRow;
}

export async function updateTask(
  sb: SupabaseClient,
  id: string,
  patch: Partial<NewTask>,
): Promise<void> {
  const { error } = await sb.from("tasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function archiveTask(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb
    .from("tasks")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTask(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function addCompletion(
  sb: SupabaseClient,
  taskId: string,
  doneOn: string,
): Promise<void> {
  const { error } = await sb
    .from("task_completions")
    .insert({ task_id: taskId, done_on: doneOn });
  if (error && error.code !== "23505") throw error; // ignore "already complete"
}

export async function removeCompletion(
  sb: SupabaseClient,
  taskId: string,
  doneOn: string,
): Promise<void> {
  const { error } = await sb
    .from("task_completions")
    .delete()
    .eq("task_id", taskId)
    .eq("done_on", doneOn);
  if (error) throw error;
}
