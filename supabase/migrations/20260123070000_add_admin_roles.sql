-- Create a table for public profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies for Profiles
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Admins can update all profiles" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Grant Admin permissions on Rooms table
-- (First, ensure RLS is enabled on rooms - it is in previous migration)

create policy "Admins can insert rooms" on public.rooms
  for insert with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can update rooms" on public.rooms
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can delete rooms" on public.rooms
  for delete using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Backfill profiles for existing users (if any)
insert into public.profiles (id, email, role)
select id, email, 'user'
from auth.users
on conflict (id) do nothing;
