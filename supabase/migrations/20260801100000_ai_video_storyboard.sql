begin;

-- Storyboard step: before HeyGen/Higgsfield render a child's video, the
-- parent's uploaded photo of the child is combined with the theme's VO
-- (voice-over) script template and the parent's personalization answers to
-- generate multi-angle character reference images and scene images. The
-- Make.com scenario performs the actual generation call; these columns hold
-- the inputs it needs and the outputs it returns.

alter table public.children
  add column if not exists photo_url text;

comment on column public.children.photo_url is
  'Storage path (child-photos bucket) to the parent-uploaded photo used as the character reference for child_ai_video generation. Never a public URL — resolve via a signed URL server-side.';

alter table public.theme_entitlements
  add column if not exists vo_template text,
  add column if not exists answers jsonb;

comment on column public.theme_entitlements.vo_template is
  'Voice-over script template for this theme instance, sent to the storyboard/render pipeline.';
comment on column public.theme_entitlements.answers is
  'Parent-provided personalization answers for this theme instance (jsonb), sent alongside the VO template and child photo to the storyboard pipeline.';

create table if not exists public.video_storyboards (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null unique references public.theme_entitlements(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  character_images jsonb not null default '[]'::jsonb,
  scene_images jsonb not null default '[]'::jsonb,
  error_detail jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_storyboards_child_idx on public.video_storyboards(child_id);

drop trigger if exists video_storyboards_set_updated_at on public.video_storyboards;
create trigger video_storyboards_set_updated_at
before update on public.video_storyboards
for each row execute function public.set_updated_at();

alter table public.video_storyboards enable row level security;

drop policy if exists "video_storyboards_select_own_or_admin" on public.video_storyboards;
create policy "video_storyboards_select_own_or_admin"
on public.video_storyboards for select to authenticated
using (
  exists (
    select 1 from public.children c
    where c.id = video_storyboards.child_id and c.parent_id = auth.uid()
  )
  or public.is_admin()
);

grant select on public.video_storyboards to authenticated;
revoke all on public.video_storyboards from anon;

-- Keeps the finished storyboard image URLs (character multi-angle + scene)
-- alongside the rendered video asset for whichever job used them.
alter table public.ai_video_jobs
  add column if not exists storyboard_urls jsonb;

-- Private bucket for parent-uploaded child photos (SECURITY.md: no permanent
-- public URLs for child photos; access must go through signed URLs). Objects
-- are stored under `{parent_id}/{child_id}/...` so RLS can scope by folder.
insert into storage.buckets (id, name, public)
values ('child-photos', 'child-photos', false)
on conflict (id) do nothing;

drop policy if exists "child_photos_parent_rw" on storage.objects;
create policy "child_photos_parent_rw"
on storage.objects for all to authenticated
using (bucket_id = 'child-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'child-photos' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
