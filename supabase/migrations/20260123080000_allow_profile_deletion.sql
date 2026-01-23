
-- Allow admins to delete profiles
create policy "Admins can delete all profiles" on public.profiles
  for delete using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
