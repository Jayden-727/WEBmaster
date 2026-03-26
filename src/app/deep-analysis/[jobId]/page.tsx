"use client";

import { useState, useEffect, useCallback, useMemo, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Layers,
  List,
  Network,
  FileCode,
  FileText,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronRight,
  Search,
  Check,
  AlertTriangle,
} from "lucide-react";
import type {
  DeepAnalysisJob,
  CrawledPage,
  RefinedPage,
} from "@/types/deep-analysis";

type Tab = "inventory" | "structure" | "raw" | "refinement";

const PAGE_TYPE_COLORS: Record<string, string> = {
  homepage: "bg-indigo-500/15 text-indigo-300",
  category: "bg-blue-500/15 text-blue-300",
  product: "bg-emerald-500/15 text-emerald-300",
  article: "bg-amber-500/15 text-amber-300",
  policy: "bg-slate-500/15 text-slate-300",
  contact: "bg-pink-500/15 text-pink-300",
  search: "bg-cyan-500/15 text-cyan-300",
  login: "bg-violet-500/15 text-violet-300",
  other: "bg-slate-500/15 text-slate-400",
};

export default function DeepAnalysisPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const [job, setJob] = useState<DeepAnalysisJob | null>(null);
  const [tab, setTab] = useState<Tab>("inventory");
  const [refinedPages, setRefinedPages] = useState<RefinedPage[]>([]);
  const [refining, setRefining] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`deep-analysis:${jobId}`);
      if (stored) {
        setJob(JSON.parse(stored));
      }
    } catch {}
  }, [jobId]);

  if (!job) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle className="h-8 w-8 text-slate-500" />
        <p className="text-sm text-slate-400">Analysis not found or session expired.</p>
        <Link
          href="/dashboard"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof List }[] = [
    { id: "inventory", label: "Inventory", icon: List },
    { id: "structure", label: "Site Structure", icon: Network },
    { id: "raw", label: "Raw Data", icon: FileCode },
    { id: "refinement", label: "Refinement", icon: FileText },
  ];

  const successPages = job.pages.filter((p) => p.status === "success");
  const errorPages = job.pages.filter((p) => p.status === "error");
  const typeStats = job.pages.reduce(
    (acc, p) => {
      const t = p.pageTypeGuess ?? "other";
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
                <Globe className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold tracking-tight sm:text-lg">AttractiveWebAI</span>
            </Link>
            <span className="hidden text-slate-700 sm:inline">/</span>
            <span className="hidden text-sm text-slate-400 sm:inline">DeepAnalyzer</span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-400 transition hover:border-slate-700 hover:text-white sm:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
              DeepAnalyzer
            </span>
            <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-[10px] font-medium text-green-300">
              {job.status}
            </span>
          </div>
          <h1 className="break-all text-lg font-bold tracking-tight sm:text-xl md:text-2xl">
            {job.rootUrl}
          </h1>
          <p className="mt-1 text-xs text-slate-500">{job.domain}</p>

          {/* Summary cards */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <SummaryCard label="Pages Crawled" value={job.pages.length} />
            <SummaryCard label="Successful" value={successPages.length} color="text-green-400" />
            <SummaryCard label="Errors" value={errorPages.length} color="text-red-400" />
            <SummaryCard
              label="Max Depth"
              value={Math.max(0, ...job.pages.map((p) => p.depth))}
            />
          </div>

          {/* Type breakdown */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(typeStats).map(([type, count]) => (
              <span
                key={type}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${PAGE_TYPE_COLORS[type] ?? PAGE_TYPE_COLORS.other}`}
              >
                {count} {type}
              </span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50 p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${
                tab === id
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "inventory" && <InventoryTab pages={job.pages} />}
        {tab === "structure" && <StructureTab pages={job.pages} rootUrl={job.rootUrl} />}
        {tab === "raw" && <RawDataTab pages={job.pages} />}
        {tab === "refinement" && (
          <RefinementTab
            pages={job.pages}
            refinedPages={refinedPages}
            setRefinedPages={setRefinedPages}
            refining={refining}
            setRefining={setRefining}
          />
        )}
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
      <p className={`text-lg font-bold ${color} sm:text-xl`}>{value}</p>
      <p className="text-[10px] text-slate-500 sm:text-[11px]">{label}</p>
    </div>
  );
}

/* ─── Inventory Tab ─── */

function InventoryTab({ pages }: { pages: CrawledPage[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return pages.filter((p) => {
      if (typeFilter !== "all" && p.pageTypeGuess !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.url.toLowerCase().includes(q) ||
          (p.title ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [pages, search, typeFilter]);

  const types = useMemo(() => {
    const set = new Set(pages.map((p) => p.pageTypeGuess ?? "other"));
    return ["all", ...Array.from(set).sort()];
  }, [pages]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by URL or title…"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-slate-700 focus:outline-none sm:text-sm"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none sm:text-sm"
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All Types" : t}
            </option>
          ))}
        </select>
      </div>

      {/* Page table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="border-b border-slate-800 bg-slate-900">
            <tr>
              <th className="px-3 py-2.5 font-medium text-slate-400 sm:px-4">#</th>
              <th className="px-3 py-2.5 font-medium text-slate-400 sm:px-4">URL</th>
              <th className="hidden px-3 py-2.5 font-medium text-slate-400 sm:table-cell sm:px-4">Title</th>
              <th className="px-3 py-2.5 font-medium text-slate-400 sm:px-4">Type</th>
              <th className="px-3 py-2.5 font-medium text-slate-400 sm:px-4">Depth</th>
              <th className="px-3 py-2.5 font-medium text-slate-400 sm:px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map((p, i) => (
              <tr
                key={p.url}
                className="transition hover:bg-slate-800/30"
              >
                <td className="px-3 py-2.5 text-slate-500 sm:px-4">{i + 1}</td>
                <td className="max-w-[200px] truncate px-3 py-2.5 sm:max-w-[350px] sm:px-4">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 hover:underline"
                  >
                    {new URL(p.url).pathname || "/"}
                  </a>
                </td>
                <td className="hidden max-w-[200px] truncate px-3 py-2.5 text-slate-300 sm:table-cell sm:px-4">
                  {p.title ?? "—"}
                </td>
                <td className="px-3 py-2.5 sm:px-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PAGE_TYPE_COLORS[p.pageTypeGuess ?? "other"] ?? PAGE_TYPE_COLORS.other}`}
                  >
                    {p.pageTypeGuess ?? "other"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-400 sm:px-4">{p.depth}</td>
                <td className="px-3 py-2.5 sm:px-4">
                  {p.status === "success" ? (
                    <span className="text-green-400">✓</span>
                  ) : (
                    <span className="text-red-400">✗</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No pages match filter.</p>
        )}
      </div>
    </div>
  );
}

/* ─── Structure Tab ─── */

function StructureTab({ pages, rootUrl }: { pages: CrawledPage[]; rootUrl: string }) {
  const tree = useMemo(() => buildTree(pages, rootUrl), [pages, rootUrl]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 sm:text-sm">
        Visual hierarchy based on crawl depth and parent-child link relationships.
      </p>
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 sm:p-5">
        {tree.map((node) => (
          <TreeNode key={node.url} node={node} />
        ))}
        {tree.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">No structure data available.</p>
        )}
      </div>
    </div>
  );
}

interface TreeNodeData {
  url: string;
  title: string | null;
  pageTypeGuess: string | null;
  depth: number;
  children: TreeNodeData[];
}

function buildTree(pages: CrawledPage[], rootUrl: string): TreeNodeData[] {
  const byUrl = new Map<string, CrawledPage>();
  for (const p of pages) byUrl.set(p.url, p);

  const childMap = new Map<string, CrawledPage[]>();
  const hasParent = new Set<string>();

  for (const p of pages) {
    if (p.parentUrl && byUrl.has(p.parentUrl)) {
      hasParent.add(p.url);
      const children = childMap.get(p.parentUrl) ?? [];
      children.push(p);
      childMap.set(p.parentUrl, children);
    }
  }

  function toNode(p: CrawledPage): TreeNodeData {
    const children = (childMap.get(p.url) ?? []).map(toNode);
    return {
      url: p.url,
      title: p.title,
      pageTypeGuess: p.pageTypeGuess,
      depth: p.depth,
      children,
    };
  }

  const roots = pages.filter((p) => !hasParent.has(p.url));
  return roots.map(toNode);
}

function TreeNode({ node }: { node: TreeNodeData }) {
  const [open, setOpen] = useState(node.depth < 2);
  const hasChildren = node.children.length > 0;
  const typeCls = PAGE_TYPE_COLORS[node.pageTypeGuess ?? "other"] ?? PAGE_TYPE_COLORS.other;
  let pathname = "/";
  try { pathname = new URL(node.url).pathname || "/"; } catch {}

  return (
    <div className="ml-0" style={{ paddingLeft: `${node.depth * 16}px` }}>
      <div className="flex items-center gap-1.5 py-1.5">
        {hasChildren ? (
          <button onClick={() => setOpen(!open)} className="shrink-0 text-slate-500 hover:text-slate-300">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-3.5" />
        )}
        <a
          href={node.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 truncate text-xs text-indigo-400 hover:text-indigo-300 hover:underline sm:text-sm"
        >
          {pathname}
        </a>
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${typeCls}`}>
          {node.pageTypeGuess ?? "other"}
        </span>
        {node.title && (
          <span className="hidden truncate text-[11px] text-slate-500 sm:inline">
            — {node.title}
          </span>
        )}
      </div>
      {open && node.children.map((child) => <TreeNode key={child.url} node={child} />)}
    </div>
  );
}

/* ─── Raw Data Tab ─── */

function RawDataTab({ pages }: { pages: CrawledPage[] }) {
  return (
    <div className="space-y-3">
      {pages.map((p) => (
        <RawPageCard key={p.url} page={p} />
      ))}
      {pages.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">No pages available.</p>
      )}
    </div>
  );
}

function RawPageCard({ page }: { page: CrawledPage }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  let pathname = "/";
  try { pathname = new URL(page.url).pathname || "/"; } catch {}

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(page, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [page]);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-3 text-left sm:px-4"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
        )}
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-white sm:text-sm">
          {pathname}
        </span>
        {page.status === "success" ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-green-400" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
        )}
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${PAGE_TYPE_COLORS[page.pageTypeGuess ?? "other"] ?? PAGE_TYPE_COLORS.other}`}
        >
          {page.pageTypeGuess ?? "other"}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-800 px-3 pb-4 pt-3 sm:px-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <a
              href={page.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-400 hover:underline"
            >
              {page.url} <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              <Copy className="h-3 w-3" />
              {copied ? "Copied!" : "Copy JSON"}
            </button>
          </div>

          {page.error && (
            <div className="mb-3 rounded-md border border-red-800/40 bg-red-950/30 p-2 text-xs text-red-300">
              {page.error}
            </div>
          )}

          {page.title && (
            <DataSection title="Title">
              <p className="text-xs text-slate-300 sm:text-sm">{page.title}</p>
            </DataSection>
          )}

          {Object.keys(page.rawMetadata).length > 0 && (
            <DataSection title="Metadata">
              <div className="grid gap-1">
                {Object.entries(page.rawMetadata).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs">
                    <span className="shrink-0 font-medium text-slate-400">{k}:</span>
                    <span className="min-w-0 break-all text-slate-300">{v ?? "—"}</span>
                  </div>
                ))}
              </div>
            </DataSection>
          )}

          {page.rawHeadings.length > 0 && (
            <DataSection title={`Headings (${page.rawHeadings.length})`}>
              <div className="space-y-0.5">
                {page.rawHeadings.map((h, i) => (
                  <p key={i} className="text-xs text-slate-300" style={{ paddingLeft: `${(h.level - 1) * 12}px` }}>
                    <span className="mr-1 text-slate-500">H{h.level}</span> {h.text}
                  </p>
                ))}
              </div>
            </DataSection>
          )}

          {page.rawLinks.length > 0 && (
            <DataSection title={`Links (${page.rawLinks.length})`}>
              <div className="max-h-[200px] space-y-0.5 overflow-y-auto">
                {page.rawLinks.slice(0, 30).map((l, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${l.isInternal ? "bg-blue-500/15 text-blue-300" : "bg-slate-500/15 text-slate-400"}`}>
                      {l.isInternal ? "int" : "ext"}
                    </span>
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-indigo-400 hover:underline">
                      {l.href}
                    </a>
                  </div>
                ))}
                {page.rawLinks.length > 30 && (
                  <p className="text-[11px] text-slate-500">+{page.rawLinks.length - 30} more</p>
                )}
              </div>
            </DataSection>
          )}

          {page.rawImages.length > 0 && (
            <DataSection title={`Images (${page.rawImages.length})`}>
              <div className="max-h-[200px] space-y-0.5 overflow-y-auto">
                {page.rawImages.slice(0, 20).map((img, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <a href={img.src} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-indigo-400 hover:underline">
                      {img.src}
                    </a>
                    {img.alt && <span className="shrink-0 text-slate-500">(alt: {img.alt})</span>}
                  </div>
                ))}
              </div>
            </DataSection>
          )}

          {page.rawTextPreview && (
            <DataSection title="Text Preview">
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-400">
                {page.rawTextPreview}
              </p>
            </DataSection>
          )}
        </div>
      )}
    </div>
  );
}

function DataSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h4>
      {children}
    </div>
  );
}

/* ─── Refinement Tab ─── */

function RefinementTab({
  pages,
  refinedPages,
  setRefinedPages,
  refining,
  setRefining,
}: {
  pages: CrawledPage[];
  refinedPages: RefinedPage[];
  setRefinedPages: (p: RefinedPage[]) => void;
  refining: boolean;
  setRefining: (b: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const handleRefine = useCallback(async () => {
    setRefining(true);
    setError(null);
    try {
      const res = await fetch("/api/deep-analyze/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: pages.filter((p) => p.status === "success") }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Server error (${res.status})`);
      }
      const data = await res.json();
      setRefinedPages(data.pages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refinement failed");
    } finally {
      setRefining(false);
    }
  }, [pages, setRefinedPages, setRefining]);

  const successCount = pages.filter((p) => p.status === "success").length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-white sm:text-base">
          Refine All Pages
        </h3>
        <p className="mt-1 text-xs text-slate-400 sm:text-sm">
          Generate cleaned Markdown reports for all {successCount} successfully crawled pages.
          This processes raw HTML data into a structured, readable format.
        </p>
        <button
          onClick={handleRefine}
          disabled={refining || successCount === 0}
          className="mt-4 flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40"
        >
          {refining ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Refining…
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Refine All Pages ({successCount})
            </>
          )}
        </button>
        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
      </div>

      {refinedPages.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">
            Refined Output ({refinedPages.length} pages)
          </h3>
          {refinedPages.map((rp) => (
            <RefinedPageCard key={rp.url} refined={rp} />
          ))}
        </div>
      )}
    </div>
  );
}

function RefinedPageCard({ refined }: { refined: RefinedPage }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  let pathname = "/";
  try { pathname = new URL(refined.url).pathname || "/"; } catch {}

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-3 text-left sm:px-4"
      >
        {open ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
        <FileText className="h-3.5 w-3.5 text-purple-400" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-white sm:text-sm">{pathname}</span>
      </button>
      {open && (
        <div className="border-t border-slate-800 px-3 pb-4 pt-3 sm:px-4">
          <div className="mb-2 flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(refined.markdown).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              <Copy className="h-3 w-3" />
              {copied ? "Copied!" : "Copy Markdown"}
            </button>
          </div>
          <pre className="max-h-[400px] overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-relaxed text-slate-300">
            {refined.markdown}
          </pre>
        </div>
      )}
    </div>
  );
}
