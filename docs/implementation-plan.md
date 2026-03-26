# PageIntel MVP Implementation Plan

## Phase 1 - Foundation
1. Initialize Next.js app shell with App Router + Tailwind.
2. Add base layout and MVP pages.
3. Configure Supabase client helpers for server and browser.

## Phase 2 - Data layer
1. Apply initial SQL migration for all analysis tables.
2. Add RLS and ownership policies.
3. Generate TypeScript DB bindings (manual for now, can be generated later).

## Phase 3 - Analyze pipeline
1. Build URL validation and timeout wrappers.
2. Implement raw HTML fetcher.
3. Implement optional rendered DOM capture with Playwright.
4. Implement metadata extraction.
5. Implement readability text + markdown conversion.
6. Implement links/images extraction and classification.
7. Implement stack heuristics engine.
8. Implement structure heuristics engine.
9. Implement Lighthouse metrics + interpretation cards.
10. Orchestrate + persist pipeline in single service.

## Phase 4 - Product UI
1. Dashboard with mode toggle + recent analyses.
2. Analysis detail page with tabbed sections.
3. History page with filtering and quick actions.
4. JSON / Markdown export routes and UI actions.

## Phase 5 - Hardening
1. Add loading/error states and resilient fallbacks.
2. Add edge-case handling (blocked pages, invalid HTML, missing metrics).
3. Add documentation and env setup guide.
