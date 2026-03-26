create table if not exists public.deep_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'anonymous',
  root_url text not null,
  domain text not null,
  mode text not null default 'all' check (mode in ('all', 'max')),
  status text not null default 'pending' check (status in ('pending', 'running', 'paused', 'completed', 'failed')),
  max_pages integer not null default 25,
  max_depth integer not null default 3,
  total_discovered integer not null default 0,
  total_processed integer not null default 0,
  total_success integer not null default 0,
  total_failed integer not null default 0,
  current_url text,
  queue_json jsonb not null default '[]'::jsonb,
  visited_json jsonb not null default '[]'::jsonb,
  last_error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.deep_pages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.deep_jobs(id) on delete cascade,
  url text not null,
  parent_url text,
  depth integer not null default 0,
  status text not null default 'queued' check (status in ('queued', 'crawling', 'success', 'failed')),
  title text,
  page_type_guess text,
  raw_metadata jsonb not null default '{}'::jsonb,
  raw_headings jsonb not null default '[]'::jsonb,
  raw_links jsonb not null default '[]'::jsonb,
  raw_images jsonb not null default '[]'::jsonb,
  raw_text_preview text,
  detected_tech jsonb not null default '[]'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_deep_jobs_status on public.deep_jobs(status);
create index if not exists idx_deep_jobs_updated on public.deep_jobs(updated_at desc);
create index if not exists idx_deep_pages_job_id on public.deep_pages(job_id);
create index if not exists idx_deep_pages_status on public.deep_pages(job_id, status);

alter table public.deep_jobs enable row level security;
alter table public.deep_pages enable row level security;

create policy "anon_select_deep_jobs" on public.deep_jobs for select to anon using (true);
create policy "anon_insert_deep_jobs" on public.deep_jobs for insert to anon with check (true);
create policy "anon_update_deep_jobs" on public.deep_jobs for update to anon using (true);
create policy "anon_select_deep_pages" on public.deep_pages for select to anon using (true);
create policy "anon_insert_deep_pages" on public.deep_pages for insert to anon with check (true);
create policy "anon_update_deep_pages" on public.deep_pages for update to anon using (true);
