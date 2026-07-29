begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'parent' check (role in ('parent', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 1 and 40),
  birth_year integer check (birth_year between 2000 and 2100),
  age_group text check (age_group in ('3-5', '6-8', '9-12', '13+')),
  interests text[] not null default '{}',
  preferred_language text not null default 'zh-HK' check (preferred_language in ('zh-HK', 'zh-CN', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists children_parent_id_idx on public.children(parent_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists children_set_updated_at on public.children;
create trigger children_set_updated_at
before update on public.children
for each row execute function public.set_updated_at();

create or replace function public.enforce_three_children()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.parent_id::text, 0));
  if (select count(*) from public.children where parent_id = new.parent_id) >= 3 then
    raise exception 'A parent account can manage at most three children';
  end if;
  return new;
end;
$$;

drop trigger if exists children_limit_three on public.children;
create trigger children_limit_three
before insert on public.children
for each row execute function public.enforce_three_children();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (
    new.id,
    case when lower(coalesce(new.email, '')) = 'minimee.kidz@gmail.com' then 'admin' else 'parent' end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, display_name)
select
  id,
  nullif(trim(coalesce(raw_user_meta_data ->> 'display_name', '')), '')
from auth.users
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select
  id,
  case when lower(coalesce(email, '')) = 'minimee.kidz@gmail.com' then 'admin' else 'parent' end
from auth.users
on conflict (user_id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.children enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "roles_select_own_or_admin" on public.user_roles;
create policy "roles_select_own_or_admin"
on public.user_roles for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "children_select_own_or_admin" on public.children;
create policy "children_select_own_or_admin"
on public.children for select to authenticated
using (parent_id = auth.uid() or public.is_admin());

drop policy if exists "children_insert_own" on public.children;
create policy "children_insert_own"
on public.children for insert to authenticated
with check (parent_id = auth.uid());

drop policy if exists "children_update_own" on public.children;
create policy "children_update_own"
on public.children for update to authenticated
using (parent_id = auth.uid())
with check (parent_id = auth.uid());

drop policy if exists "children_delete_own" on public.children;
create policy "children_delete_own"
on public.children for delete to authenticated
using (parent_id = auth.uid());

grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.children to authenticated;

revoke all on public.profiles from anon;
revoke all on public.user_roles from anon;
revoke all on public.children from anon;

commit;
