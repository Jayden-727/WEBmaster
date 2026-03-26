# AttractiveWebAI MVP Architecture

## High-level modules

- `src/app`: App Router pages and API routes
- `src/components`: UI components grouped by concern (`dashboard`, `analysis`, `ui`)
- `src/lib`: server-side business logic modules
- `src/types`: shared TypeScript interfaces and DB types
- `supabase/migrations`: SQL migrations for schema + RLS policies

## Final folder structure (MVP)

```text
src/
  app/
    (marketing)/
      page.tsx
    login/
      page.tsx
    dashboard/
      page.tsx
    analysis/[id]/
      page.tsx
    history/
      page.tsx
    api/
      analyze/route.ts
      analyses/route.ts
      analyses/[id]/route.ts
      analyses/[id]/export/json/route.ts
      analyses/[id]/export/markdown/route.ts
    layout.tsx
    page.tsx
    globals.css
  components/
    ui/
      card.tsx
      badge.tsx
      button.tsx
      input.tsx
      tabs.tsx
    dashboard/
      analyze-form.tsx
      recent-analyses.tsx
    analysis/
      overview-cards.tsx
      metadata-table.tsx
      html-viewer.tsx
      links-images-table.tsx
      export-panel.tsx
  lib/
    supabase/
      client.ts
      server.ts
    crawler/
      fetch-html.ts
      render-dom.ts
    parser/
      metadata.ts
      content.ts
      links-images.ts
    stack-detection/
      detect-stack.ts
      rules.ts
    structure-detection/
      detect-structure.ts
    lighthouse/
      run-lighthouse.ts
      interpret.ts
    exporters/
      to-json.ts
      to-markdown.ts
    utils/
      timeout.ts
      url.ts
    services/
      analyze-page.ts
  types/
    analysis.ts
    database.ts
```

## Request flow

1. User submits URL from dashboard.
2. `POST /api/analyze` validates input.
3. `analyze-page.ts` orchestrates:
   - Fetch raw HTML
   - Optionally render DOM via Playwright
   - Parse metadata / text / links / images
   - Stack + structure detection
   - Lighthouse analysis
4. Persist all sub-results into normalized Supabase tables.
5. Return analysis ID for detail view.

## Architectural principles

- Server-first analysis logic in `src/lib` for reliability and security.
- Thin route handlers; orchestration inside service module.
- Strongly typed result object (`PageAnalysisResult`) used throughout.
- Graceful degradation: every analyzer returns partial data + warnings instead of crashing.
