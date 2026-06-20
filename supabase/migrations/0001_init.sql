-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  icon text not null default 'wallet',
  color text not null default '#6366F1',
  monthly_limit numeric,
  kind text not null default 'expense' check (kind in ('expense','income')),
  created_at timestamptz not null default now()
);

-- Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  category_id uuid references public.categories on delete set null,
  amount numeric not null check (amount > 0),
  direction text not null check (direction in ('in','out')),
  note text,
  occurred_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- Employers
create table public.employers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  color text not null default '#6366F1',
  created_at timestamptz not null default now()
);

-- Shifts
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  employer_id uuid references public.employers on delete set null,
  shift_type text,
  clock_in timestamptz not null,
  clock_out timestamptz not null,
  pay numeric,
  note text,
  worked_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- Helpful indexes for the common queries (own rows, by date)
create index transactions_user_date_idx on public.transactions (user_id, occurred_at);
create index shifts_user_date_idx on public.shifts (user_id, worked_on);
create index categories_user_idx on public.categories (user_id);
create index employers_user_idx on public.employers (user_id);

-- Row Level Security
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.employers enable row level security;
alter table public.shifts enable row level security;

create policy "own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own employers" on public.employers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own shifts" on public.shifts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed default categories on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.categories (user_id, name, icon, color, kind) values
    (new.id, 'Travel', 'plane', '#3B82F6', 'expense'),
    (new.id, 'Food & Dining', 'utensils', '#F97316', 'expense'),
    (new.id, 'Groceries', 'shopping-basket', '#22C55E', 'expense'),
    (new.id, 'Rent/Housing', 'home', '#8B5CF6', 'expense'),
    (new.id, 'Transport', 'bus', '#06B6D4', 'expense'),
    (new.id, 'Shopping', 'shopping-bag', '#EC4899', 'expense'),
    (new.id, 'Bills & Utilities', 'receipt', '#EAB308', 'expense'),
    (new.id, 'Entertainment', 'clapperboard', '#A855F7', 'expense'),
    (new.id, 'Health', 'heart-pulse', '#EF4444', 'expense'),
    (new.id, 'Income', 'wallet', '#10B981', 'income');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
