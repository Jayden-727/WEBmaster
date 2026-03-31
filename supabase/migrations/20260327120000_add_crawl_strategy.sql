-- Add crawl strategy preference to jobs (fetch = HTML-only, strong = fetch + render fallback)
alter table public.deep_jobs
  add column if not exists crawl_strategy text not null default 'fetch'
  check (crawl_strategy in ('fetch', 'strong'));

-- Add per-page crawl strategy and content score to pages
alter table public.deep_pages
  add column if not exists crawl_strategy text default 'fetch',
  add column if not exists content_score real default null;
