# AttractiveWebAI

Reverse-engineer any webpage with one URL. Analyze metadata, structure, stack signals, content, links/images, and performance scores in a single dashboard.

## Features

- **URL Analysis** — Submit any URL and get a full breakdown
- **Metadata Extraction** — Title, description, OG tags, canonical, JSON-LD
- **Stack Detection** — Identify frameworks, CMS, analytics, infrastructure
- **Structure Detection** — Find headers, heroes, CTAs, FAQs, forms, galleries
- **Links & Images** — Clickable links with filters, image thumbnails with preview
- **Lighthouse Scores** — Local Chrome execution with PageSpeed API fallback
- **Content Extraction** — Clean text and Markdown conversion
- **Executive Dashboard** — Overview with metric cards, error panel, section navigation

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL + RLS)
- **Analysis:** Cheerio, Turndown, Lighthouse, Zod
- **Deployment:** Vercel

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL (enables DB persistence) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key |
| `PAGESPEED_API_KEY` | No | Google PageSpeed API key (higher rate limits) |

The app works fully without Supabase — analysis results are returned via the API and displayed in the dashboard. Supabase enables persistence and history.

## Lighthouse

Lighthouse runs locally using Chrome when available. Install Chrome and the app auto-detects it. If local execution fails, it falls back to the PageSpeed Insights API.

## Supabase Migration

Run the SQL in `supabase/migrations/20260325190000_init_pageintel.sql` in your Supabase SQL editor.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/analyze/        # POST /api/analyze
│   ├── api/analyses/       # GET /api/analyses, GET /api/analyses/[id]
│   ├── analysis/[id]/      # Analysis detail page
│   └── dashboard/          # Dashboard with analyze form
├── components/
│   ├── analysis/           # Analysis detail dashboard
│   └── dashboard/          # Analyze form, recent analyses
├── lib/
│   ├── crawler/            # HTML fetcher
│   ├── lighthouse/         # Local Lighthouse + PageSpeed API
│   ├── parser/             # Metadata, content, links/images
│   ├── services/           # Orchestration + DB persistence
│   ├── stack-detection/    # Tech stack heuristics
│   ├── structure-detection/# UI component detection
│   ├── supabase/           # Server client
│   └── utils/              # URL validation
├── types/                  # TypeScript interfaces
└── app/globals.css         # Tailwind base styles
```

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint
npm run typecheck  # TypeScript type-check
```
