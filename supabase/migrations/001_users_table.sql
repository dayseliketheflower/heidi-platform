-- Create public users table that mirrors auth.users
-- with role and verification status for the client onboarding flow.

create table if not exists public.users (
  id       uuid references auth.users on delete cascade primary key,
  email    text not null,
  role     text not null default 'client',
  verified boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.users enable row level security;

-- Clients can read their own row
create policy "users: select own" on public.users
  for select
  using (auth.uid() = id);

-- Clients can update their own row
create policy "users: update own" on public.users
  for update
  using (auth.uid() = id);

-- Insert is handled by the trigger below (security definer bypasses RLS)
-- Clients cannot insert directly — the trigger does it for them.

-- ---------------------------------------------------------------------------
-- Trigger: auto-create a public.users row when a new auth user signs up.
-- This fires synchronously after INSERT on auth.users, so by the time
-- signUp() returns on the client the row already exists.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, role, verified, created_at)
  values (new.id, new.email, 'client', false, now())
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop trigger first in case this migration is run more than once
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_auth_user();
