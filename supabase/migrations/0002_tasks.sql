-- Task definitions
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  kind text not null default 'daily' check (kind in ('daily','once')),
  due_on date,
  time_of_day time,
  sort integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

-- Completion event log (one row per task per day done)
create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  task_id uuid not null references public.tasks on delete cascade,
  done_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (task_id, done_on)
);

create index tasks_user_idx on public.tasks (user_id);
create index task_completions_user_date_idx on public.task_completions (user_id, done_on);

alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;

create policy "own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own task_completions" on public.task_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
