create extension if not exists "pgcrypto";

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'anonymous',
  url text not null,
  mode text not null check (mode in ('source', 'rendered')),
  status text not null default 'completed' check (status in ('pending', 'running', 'completed', 'failed')),
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analysis_metadata (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  title text,
  description text,
  canonical text,
  og_title text,
  og_description text,
  og_image text,
  robots text,
  language text,
  charset text,
  json_ld jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.analysis_content (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  raw_html text,
  rendered_html text,
  clean_text text,
  markdown_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.analysis_stack (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  category text not null,
  detected_tool text not null,
  confidence numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  matched_signals_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.analysis_structure (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  component_name text not null,
  detected_count integer not null default 0,
  confidence numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  matched_patterns_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.analysis_links (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  href text not null,
  text text,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.analysis_images (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  src text not null,
  alt text,
  is_lazy boolean not null default false,
  filename text,
  created_at timestamptz not null default now()
);

create table if not exists public.analysis_lighthouse (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  performance_score integer,
  accessibility_score integer,
  best_practices_score integer,
  seo_score integer,
  lcp numeric,
  cls numeric,
  inp numeric,
  fcp numeric,
  tbt numeric,
  raw_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analyses_created_at on public.analyses(created_at desc);
create index if not exists idx_analysis_links_analysis_id on public.analysis_links(analysis_id);
create index if not exists idx_analysis_images_analysis_id on public.analysis_images(analysis_id);
