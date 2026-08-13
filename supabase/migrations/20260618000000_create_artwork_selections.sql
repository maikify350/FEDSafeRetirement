-- Canonical shared-selection table for the WebSite_Designer review app.
create table if not exists public.artwork_selections (
  id text primary key,
  artwork_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.artwork_selections (id, artwork_ids)
values ('shared', '{}')
on conflict (id) do nothing;

alter table public.artwork_selections enable row level security;

drop policy if exists allow_all on public.artwork_selections;
create policy allow_all
on public.artwork_selections
for all
using (true)
with check (true);

-- Keep updated_at fresh on writes.
create or replace function public.set_updated_at_artwork_selections()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_artwork_selections_updated_at on public.artwork_selections;
create trigger trg_artwork_selections_updated_at
before update on public.artwork_selections
for each row
execute procedure public.set_updated_at_artwork_selections();
