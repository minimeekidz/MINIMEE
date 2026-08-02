begin;

-- Each released theme entitlement drives two AI production jobs: one
-- templated learning video (HeyGen HyperFrames) and one personalized child
-- video (Higgsfield, from the child's photo). Kept as one row per
-- (entitlement, video_type) so retries after a failed job update the same
-- row instead of creating duplicates.
create table if not exists public.ai_video_jobs (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  entitlement_id uuid not null references public.theme_entitlements(id) on delete cascade,
  video_type text not null check (video_type in ('learning_video', 'child_ai_video')),
  provider text not null check (provider in ('heygen_hyperframes', 'higgsfield')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  provider_job_id text,
  asset_url text,
  customer_message text,
  error_detail jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entitlement_id, video_type)
);

create index if not exists ai_video_jobs_parent_child_idx on public.ai_video_jobs(parent_id, child_id, created_at desc);
create index if not exists ai_video_jobs_entitlement_idx on public.ai_video_jobs(entitlement_id);

drop trigger if exists ai_video_jobs_set_updated_at on public.ai_video_jobs;
create trigger ai_video_jobs_set_updated_at
before update on public.ai_video_jobs
for each row execute function public.set_updated_at();

alter table public.ai_video_jobs enable row level security;

drop policy if exists "ai_video_jobs_select_own_or_admin" on public.ai_video_jobs;
create policy "ai_video_jobs_select_own_or_admin"
on public.ai_video_jobs for select to authenticated
using (parent_id = auth.uid() or public.is_admin());

grant select on public.ai_video_jobs to authenticated;
revoke all on public.ai_video_jobs from anon;

commit;
