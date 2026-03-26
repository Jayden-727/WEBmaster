"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AnalyzeApiResponse, SectionError } from "@/types/analysis";

type Tab = "overview" | "metadata" | "content" | "stack" | "structure" | "links" | "images" | "lighthouse";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "metadata", label: "Metadata" },
  { key: "content", label: "Content" },
  { key: "stack", label: "Stack" },
  { key: "structure", label: "Structure" },
  { key: "links", label: "Links" },
  { key: "images", label: "Images" },
  { key: "lighthouse", label: "Lighthouse" },
];

/* ─── Helpers ─── */

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="min-h-[32px] rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-700 active:bg-slate-600 sm:min-h-0"
    >
      {copied ? "Copied!" : label ?? "Copy"}
    </button>
  );
}

function Badge({ children, color = "slate" }: { children: React.ReactNode; color?: "green" | "blue" | "orange" | "red" | "yellow" | "indigo" | "slate" }) {
  const colors: Record<string, string> = {
    green: "bg-green-900/60 text-green-300 border-green-800",
    blue: "bg-blue-900/60 text-blue-300 border-blue-800",
    orange: "bg-orange-900/60 text-orange-300 border-orange-800",
    red: "bg-red-900/60 text-red-300 border-red-800",
    yellow: "bg-yellow-900/60 text-yellow-300 border-yellow-800",
    indigo: "bg-indigo-900/60 text-indigo-300 border-indigo-800",
    slate: "bg-slate-800 text-slate-300 border-slate-700",
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 ${colors[color]}`}>{children}</span>;
}

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: "green" | "orange" | "red" | "slate" }) {
  const c = color ?? "slate";
  const textColor = c === "green" ? "text-green-400" : c === "orange" ? "text-orange-400" : c === "red" ? "text-red-400" : "text-white";
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-2.5 sm:p-3">
      <p className={`truncate text-lg font-bold sm:text-2xl ${textColor}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-400 sm:text-xs">{label}</p>
      {sub && <p className="truncate text-[10px] text-slate-500 sm:text-xs">{sub}</p>}
    </div>
  );
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-800 bg-slate-900 p-3 sm:p-4 ${className ?? ""}`}>{children}</div>;
}

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded border border-slate-800">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full min-h-[40px] items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800/50 active:bg-slate-800 sm:min-h-0"
      >
        <span className="min-w-0 break-words">{title}</span>
        <span className="shrink-0 text-xs text-slate-500">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="border-t border-slate-800 px-3 py-2">{children}</div>}
    </div>
  );
}

function scoreColor(s: number | null): "green" | "orange" | "red" | "slate" {
  if (s === null) return "slate";
  if (s >= 90) return "green";
  if (s >= 50) return "orange";
  return "red";
}

/* ─── Main Component ─── */

export function AnalysisDetail({ analysisId }: { analysisId: string }) {
  const [data, setData] = useState<AnalyzeApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    const stored = sessionStorage.getItem(`analysis:${analysisId}`);
    if (stored) {
      try { setData(JSON.parse(stored)); setLoading(false); return; } catch { /* fetch instead */ }
    }
    fetch(`/api/analyses/${analysisId}`)
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [analysisId]);

  if (loading) {
    return (
      <section className="space-y-4 sm:space-y-6">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-800 sm:h-8 sm:w-72" />
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-800 sm:h-20" />)}
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-semibold sm:text-2xl">Analysis not found</h1>
        <p className="text-sm text-red-400">{error ?? "No data."}</p>
        <Link href="/dashboard" className="inline-block min-h-[40px] leading-[40px] text-sm text-indigo-400 underline sm:min-h-0 sm:leading-normal">← Dashboard</Link>
      </section>
    );
  }

  const sectionHasError = (section: string) => data.errors.some((e) => e.section === section);

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Link href="/dashboard" className="min-h-[32px] text-xs text-slate-500 hover:text-slate-300 active:text-slate-200 sm:min-h-0">← Dashboard</Link>
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 active:bg-slate-600"
          >
            Open URL ↗
          </a>
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold sm:text-2xl">{data.title ?? (() => { try { return new URL(data.url).hostname; } catch { return data.url; } })()}</h1>
          <p className="mt-0.5 truncate text-xs text-slate-400 sm:text-sm">{data.url}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Badge color={data.success ? "green" : "red"}>{data.success ? "Completed" : "Failed"}</Badge>
          <Badge>{data.mode} mode</Badge>
          <Badge color={data.persisted ? "green" : "yellow"}>{data.persisted ? "Saved" : "Not persisted"}</Badge>
          {data.errors.length > 0 && <Badge color="red">{data.errors.length} error{data.errors.length > 1 ? "s" : ""}</Badge>}
        </div>
      </div>

      {/* Tabs — horizontally scrollable */}
      <div className="relative">
        <nav className="scrollbar-hide flex gap-0.5 overflow-x-auto border-b border-slate-800 sm:gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative shrink-0 whitespace-nowrap px-3 py-2.5 text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm ${
                activeTab === tab.key ? "text-white" : "text-slate-500 hover:text-slate-300 active:text-slate-200"
              }`}
            >
              {tab.label}
              {sectionHasError(tab.key) && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />}
              {activeTab === tab.key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-indigo-500" />}
            </button>
          ))}
        </nav>
        {/* Scroll fade hints */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-slate-950 sm:hidden" />
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "overview" && <OverviewTab data={data} onNavigate={setActiveTab} />}
        {activeTab === "metadata" && <MetadataTab data={data} />}
        {activeTab === "content" && <ContentTab data={data} />}
        {activeTab === "stack" && <StackTab data={data} />}
        {activeTab === "structure" && <StructureTab data={data} />}
        {activeTab === "links" && <LinksTab data={data} />}
        {activeTab === "images" && <ImagesTab data={data} />}
        {activeTab === "lighthouse" && <LighthouseTab data={data} />}
      </div>
    </section>
  );
}

/* ─── OVERVIEW TAB ─── */

function OverviewTab({ data, onNavigate }: { data: AnalyzeApiResponse; onNavigate: (tab: Tab) => void }) {
  const lh = data.data.lighthouse;
  const domain = (() => { try { return new URL(data.url).hostname; } catch { return data.url; } })();

  return (
    <div className="space-y-4 sm:space-y-6">
      {data.errors.length > 0 && <ErrorPanel errors={data.errors} />}

      {data.warnings.length > 0 && (
        <div className="rounded-lg border border-yellow-800/50 bg-yellow-950/30 p-3">
          <p className="text-sm font-medium text-yellow-400">Warnings</p>
          {data.warnings.map((w, i) => <p key={i} className="mt-1 break-words text-xs text-yellow-300/80">⚠ {w}</p>)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
        <MetricCard label="Domain" value={domain} />
        <MetricCard label="Page Title" value={data.title ?? "—"} />
        <MetricCard label="Stack Detected" value={data.data.stack.length} sub={data.data.stack.map((s) => s.detectedTool).join(", ") || "None"} />
        <MetricCard label="Links" value={data.data.links.length}
          sub={`${data.data.links.filter((l) => l.isInternal).length} int · ${data.data.links.filter((l) => !l.isInternal).length} ext`} />
        <MetricCard label="Images" value={data.data.images.length}
          sub={`${data.data.images.filter((i) => i.isLazy).length} lazy`} />
        <MetricCard label="Performance" value={lh.performanceScore ?? "—"} color={scoreColor(lh.performanceScore)} />
        <MetricCard label="SEO" value={lh.seoScore ?? "—"} color={scoreColor(lh.seoScore)} />
        <MetricCard label="Errors" value={data.errors.length} color={data.errors.length > 0 ? "red" : "green"}
          sub={data.errors.length === 0 ? "All OK" : data.errors.map((e) => e.section).join(", ")} />
      </div>

      <SectionCard>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-medium text-slate-200 sm:text-sm">Metadata Health</h3>
          <button onClick={() => onNavigate("metadata")} className="min-h-[32px] text-xs text-indigo-400 hover:text-indigo-300 active:text-indigo-200 sm:min-h-0">View details →</button>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Title", ok: !!data.data.metadata.title },
            { label: "Description", ok: !!data.data.metadata.description },
            { label: "Canonical", ok: !!data.data.metadata.canonical },
            { label: "OG Image", ok: !!data.data.metadata.ogImage },
            { label: "Robots", ok: !!data.data.metadata.robots },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-1.5 rounded border border-slate-800 px-2 py-1.5 sm:gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${m.ok ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-[11px] text-slate-300 sm:text-xs">{m.label}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <h3 className="mb-3 text-xs font-medium text-slate-200 sm:text-sm">Explore Sections</h3>
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 sm:grid-cols-4">
          {TABS.filter((t) => t.key !== "overview").map((tab) => {
            const hasError = data.errors.some((e) => e.section === tab.key);
            return (
              <button key={tab.key} onClick={() => onNavigate(tab.key)}
                className={`min-h-[44px] rounded-lg border px-3 py-2.5 text-left text-xs transition hover:bg-slate-800/80 active:bg-slate-800 sm:text-sm ${
                  hasError ? "border-red-800/50 bg-red-950/20" : "border-slate-800 bg-slate-900/50"
                }`}
              >
                <span className="font-medium text-white">{tab.label}</span>
                {hasError && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />}
              </button>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─── ERROR PANEL ─── */

function ErrorPanel({ errors }: { errors: SectionError[] }) {
  return (
    <div className="rounded-lg border border-red-800/50 bg-red-950/30 p-3 sm:p-4">
      <h3 className="text-sm font-semibold text-red-400">{errors.length} Error{errors.length > 1 ? "s" : ""} Detected</h3>
      <div className="mt-3 space-y-2">
        {errors.map((e, i) => (
          <Collapsible key={i} title={`${e.section} — ${e.message.slice(0, 60)}${e.message.length > 60 ? "…" : ""}`}>
            <div className="space-y-1.5">
              <div className="flex gap-2"><span className="text-xs text-slate-500">Module</span><Badge color="red">{e.section}</Badge></div>
              <div><span className="text-xs text-slate-500">Message</span><p className="break-words text-xs text-red-300">{e.message}</p></div>
              {e.detail && (
                <div><span className="text-xs text-slate-500">Technical detail</span>
                  <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-950 p-2 text-xs text-slate-400">{e.detail}</pre>
                </div>
              )}
              {e.fallbackUsed && <p className="break-words text-xs text-yellow-400">Fallback: {e.fallbackUsed}</p>}
              {e.timestamp && <p className="text-xs text-slate-600">{new Date(e.timestamp).toLocaleString()}</p>}
            </div>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}

/* ─── METADATA TAB ─── */

function MetadataTab({ data }: { data: AnalyzeApiResponse }) {
  const m = data.data.metadata;
  if (!m) return <EmptyState text="No metadata extracted." />;

  const rows: [string, string | null][] = [
    ["Title", m.title], ["Description", m.description], ["Canonical", m.canonical],
    ["OG Title", m.ogTitle], ["OG Description", m.ogDescription], ["OG Image", m.ogImage],
    ["Robots", m.robots], ["Language", m.language], ["Charset", m.charset],
  ];

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="divide-y divide-slate-800">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="shrink-0 text-xs font-medium text-slate-400 sm:text-sm">{label}</span>
              <div className="flex items-start gap-2">
                {value ? (
                  <>
                    <span className="min-w-0 break-all text-xs text-white sm:text-sm sm:text-right">{value}</span>
                    <CopyButton text={value} />
                  </>
                ) : (
                  <span className="text-xs text-slate-600 sm:text-sm">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {m.ogImage && (
        <SectionCard>
          <p className="mb-2 text-xs font-medium text-slate-400">OG Image Preview</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.ogImage} alt="OG Image" className="max-h-48 w-full rounded border border-slate-700 object-contain sm:w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </SectionCard>
      )}

      {m.jsonLd.length > 0 && (
        <SectionCard>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">JSON-LD ({m.jsonLd.length})</p>
            <CopyButton text={JSON.stringify(m.jsonLd, null, 2)} />
          </div>
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-950 p-2 text-[11px] text-slate-300 sm:p-3 sm:text-xs">{JSON.stringify(m.jsonLd, null, 2)}</pre>
        </SectionCard>
      )}
    </div>
  );
}

/* ─── CONTENT TAB ─── */

function ContentTab({ data }: { data: AnalyzeApiResponse }) {
  const c = data.data.content;
  if (!c?.cleanText && !c?.markdownText) return <EmptyState text="No content extracted." />;

  return (
    <div className="space-y-4">
      {data.title && (
        <SectionCard>
          <p className="text-xs font-medium text-slate-400">Extracted Title</p>
          <p className="mt-1 break-words text-base font-semibold text-white sm:text-lg">{data.title}</p>
        </SectionCard>
      )}

      {c.cleanText && (
        <SectionCard>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-400">Clean Text <span className="text-slate-600">({c.cleanText.length.toLocaleString()} chars)</span></p>
            <CopyButton text={c.cleanText} />
          </div>
          <Collapsible title="Preview (first 2000 chars)" defaultOpen>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">
              {c.cleanText.slice(0, 2000)}{c.cleanText.length > 2000 ? "\n\n…" : ""}
            </pre>
          </Collapsible>
        </SectionCard>
      )}

      {c.markdownText && (
        <SectionCard>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-400">Markdown <span className="text-slate-600">({c.markdownText.length.toLocaleString()} chars)</span></p>
            <CopyButton text={c.markdownText} />
          </div>
          <Collapsible title="Preview (first 2000 chars)">
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-950 p-2 text-xs leading-relaxed text-slate-300 font-mono sm:p-3">
              {c.markdownText.slice(0, 2000)}{c.markdownText.length > 2000 ? "\n\n…" : ""}
            </pre>
          </Collapsible>
        </SectionCard>
      )}
    </div>
  );
}

/* ─── STACK TAB ─── */

function StackTab({ data }: { data: AnalyzeApiResponse }) {
  const stack = data.data.stack;
  if (!stack.length) return <EmptyState text="No stack technologies detected." />;

  const byCategory = stack.reduce<Record<string, typeof stack>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  const categoryColors: Record<string, "indigo" | "blue" | "orange" | "green"> = {
    framework: "indigo", cms: "blue", analytics: "orange", infrastructure: "green",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {stack.map((s, i) => (
          <Badge key={i} color={categoryColors[s.category] ?? "slate"}>{s.detectedTool}</Badge>
        ))}
      </div>

      {Object.entries(byCategory).map(([category, items]) => (
        <SectionCard key={category}>
          <h3 className="mb-3 text-xs font-medium capitalize text-slate-200 sm:text-sm">{category}</h3>
          <div className="space-y-3">
            {items.map((s, i) => (
              <div key={i} className="rounded border border-slate-800 p-2.5 sm:p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-medium text-white sm:text-sm">{s.detectedTool}</span>
                  <span className={`shrink-0 text-xs font-bold sm:text-sm ${s.confidence >= 0.8 ? "text-green-400" : s.confidence >= 0.5 ? "text-orange-400" : "text-red-400"}`}>
                    {(s.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${s.confidence * 100}%` }} />
                </div>
                <Collapsible title={`Matched signals (${s.matchedSignals.length})`}>
                  <div className="flex flex-wrap gap-1">
                    {s.matchedSignals.map((sig, j) => <code key={j} className="break-all rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300">{sig}</code>)}
                  </div>
                </Collapsible>
              </div>
            ))}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

/* ─── STRUCTURE TAB ─── */

function StructureTab({ data }: { data: AnalyzeApiResponse }) {
  const detected = data.data.structure.filter((s) => s.detectedCount > 0);
  const undetected = data.data.structure.filter((s) => s.detectedCount === 0);

  if (!detected.length) return <EmptyState text="No UI components detected." />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
        {detected.map((s, i) => (
          <SectionCard key={i}>
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-xs font-medium capitalize text-white sm:text-sm">{s.componentName.replace(/_/g, " ")}</span>
              <Badge color="green">×{s.detectedCount}</Badge>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1 flex-1 rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${s.confidence * 100}%` }} />
              </div>
              <span className="shrink-0 text-xs text-slate-400">{(s.confidence * 100).toFixed(0)}%</span>
            </div>
            <Collapsible title={`Matched patterns (${s.matchedPatterns.length})`}>
              <div className="flex flex-wrap gap-1">
                {s.matchedPatterns.map((p, j) => <code key={j} className="break-all rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-400">{p}</code>)}
              </div>
            </Collapsible>
          </SectionCard>
        ))}
      </div>

      {undetected.length > 0 && (
        <Collapsible title={`Not detected (${undetected.length})`}>
          <div className="flex flex-wrap gap-2">
            {undetected.map((s, i) => (
              <span key={i} className="rounded bg-slate-800/50 px-2 py-1 text-xs text-slate-500 capitalize">{s.componentName.replace(/_/g, " ")}</span>
            ))}
          </div>
        </Collapsible>
      )}
    </div>
  );
}

/* ─── LINKS TAB ─── */

function LinksTab({ data }: { data: AnalyzeApiResponse }) {
  const allLinks = data.data.links;
  const [filter, setFilter] = useState<"all" | "internal" | "external">("all");
  const [search, setSearch] = useState("");

  const filtered = allLinks.filter((l) => {
    if (filter === "internal" && !l.isInternal) return false;
    if (filter === "external" && l.isInternal) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.href.toLowerCase().includes(q) || l.text.toLowerCase().includes(q);
    }
    return true;
  });

  if (!allLinks.length) return <EmptyState text="No links found." />;

  const internal = allLinks.filter((l) => l.isInternal).length;
  const external = allLinks.length - internal;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="scrollbar-hide flex gap-1 overflow-x-auto">
          {(["all", "internal", "external"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`min-h-[36px] shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition sm:min-h-0 sm:py-1 ${
                filter === f ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 active:bg-slate-600"
              }`}
            >
              {f === "all" ? `All (${allLinks.length})` : f === "internal" ? `Internal (${internal})` : `External (${external})`}
            </button>
          ))}
        </div>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search links…"
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white placeholder:text-slate-500 sm:w-48 sm:py-1"
        />
      </div>

      <div className="max-h-[60vh] space-y-1 overflow-auto sm:max-h-[500px]">
        {filtered.slice(0, 200).map((l, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded border border-slate-800/50 px-3 py-2 sm:flex-row sm:items-center sm:gap-2 sm:py-1.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Badge color={l.isInternal ? "green" : "blue"}>{l.isInternal ? "INT" : "EXT"}</Badge>
              <a href={l.href} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-xs text-indigo-400 underline active:text-indigo-200" title={l.href}>
                {l.href}
              </a>
            </div>
            <div className="flex items-center gap-1.5 sm:shrink-0">
              {l.text && <span className="min-w-0 truncate text-[11px] text-slate-500 max-w-[150px] sm:max-w-[200px]">{l.text}</span>}
              <div className="ml-auto flex shrink-0 gap-1">
                <CopyButton text={l.href} label="Copy" />
                <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[32px] items-center rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 active:bg-slate-600 sm:min-h-0">Open ↗</a>
              </div>
            </div>
          </div>
        ))}
        {filtered.length > 200 && <p className="pt-2 text-xs text-slate-500">Showing 200 of {filtered.length}</p>}
        {filtered.length === 0 && <p className="py-4 text-center text-xs text-slate-500">No links match your filter.</p>}
      </div>
    </div>
  );
}

/* ─── IMAGES TAB ─── */

function ImagesTab({ data }: { data: AnalyzeApiResponse }) {
  const images = data.data.images;
  const [preview, setPreview] = useState<string | null>(null);

  if (!images.length) return <EmptyState text="No images found." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs text-slate-300 sm:gap-4 sm:text-sm">
        <span>{images.length} images</span>
        <span>·</span>
        <span>{images.filter((i) => i.isLazy).length} lazy-loaded</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {images.slice(0, 60).map((img, i) => (
          <div key={i} className="group rounded-lg border border-slate-800 bg-slate-900 overflow-hidden">
            <button
              type="button"
              className="relative aspect-video w-full bg-slate-950 flex items-center justify-center"
              onClick={() => setPreview(img.src)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src} alt={img.alt || img.filename} loading="lazy"
                className="h-full w-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-xs text-slate-600">Failed to load</span>'; }}
              />
              {img.isLazy && <span className="absolute right-1 top-1 rounded bg-yellow-900/80 px-1 py-0.5 text-[10px] text-yellow-300">LAZY</span>}
            </button>
            <div className="p-2 space-y-1">
              <p className="truncate text-[11px] font-medium text-slate-300 sm:text-xs" title={img.filename}>{img.filename || "unnamed"}</p>
              {img.alt && <p className="truncate text-[10px] text-slate-500 sm:text-xs" title={img.alt}>alt: {img.alt}</p>}
              <div className="flex gap-1 pt-0.5">
                <a href={img.src} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[28px] items-center rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-slate-700 active:bg-slate-600 sm:min-h-0">Open ↗</a>
                <CopyButton text={img.src} label="Copy URL" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {images.length > 60 && <p className="text-xs text-slate-500">Showing 60 of {images.length}</p>}

      {/* Preview modal — full-screen on mobile */}
      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-2 sm:p-4" onClick={() => setPreview(null)}>
          <div className="relative flex max-h-full w-full max-w-4xl flex-1 flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="max-h-[75vh] max-w-full rounded-lg object-contain sm:max-h-[80vh]" />
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <a href={preview} target="_blank" rel="noopener noreferrer" className="min-h-[40px] rounded bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 active:bg-indigo-400 sm:min-h-0 sm:px-3 sm:py-1.5">Open original ↗</a>
              <CopyButton text={preview} label="Copy URL" />
              <button onClick={() => setPreview(null)} className="min-h-[40px] rounded bg-slate-700 px-4 py-2 text-xs text-slate-300 hover:bg-slate-600 active:bg-slate-500 sm:min-h-0 sm:px-3 sm:py-1.5">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── LIGHTHOUSE TAB ─── */

function formatMs(v: number | null): string {
  if (v === null) return "—";
  return v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`;
}

function LighthouseTab({ data }: { data: AnalyzeApiResponse }) {
  const lh = data.data.lighthouse;
  if (!lh) return <EmptyState text="No Lighthouse data available." />;

  const allNull = lh.performanceScore === null && lh.accessibilityScore === null;
  if (allNull) {
    const lhError = data.errors.find((e) => e.section === "lighthouse");
    return (
      <SectionCard>
        <p className="text-sm font-medium text-red-400">Lighthouse analysis unavailable</p>
        {lhError && <p className="mt-1 break-words text-xs text-red-300">{lhError.message}</p>}
        <p className="mt-2 text-xs text-slate-500">Ensure Google Chrome is installed locally, or configure a PAGESPEED_API_KEY.</p>
      </SectionCard>
    );
  }

  const insights = data.data.lighthouseInsights ?? [];
  const categories = [
    { label: "Performance", value: lh.performanceScore },
    { label: "Accessibility", value: lh.accessibilityScore },
    { label: "Best Practices", value: lh.bestPracticesScore },
    { label: "SEO", value: lh.seoScore },
  ];
  const vitals = [
    { label: "LCP", full: "Largest Contentful Paint", value: lh.lcp, format: formatMs, good: 2500, poor: 4000 },
    { label: "FCP", full: "First Contentful Paint", value: lh.fcp, format: formatMs, good: 1800, poor: 3000 },
    { label: "TBT", full: "Total Blocking Time", value: lh.tbt, format: formatMs, good: 200, poor: 600 },
    { label: "CLS", full: "Cumulative Layout Shift", value: lh.cls, format: (v: number | null) => (v !== null ? v.toFixed(3) : "—"), good: 0.1, poor: 0.25 },
    { label: "INP", full: "Interaction to Next Paint", value: lh.inp, format: formatMs, good: 200, poor: 500 },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
        {categories.map((cat) => (
          <MetricCard key={cat.label} label={cat.label} value={cat.value ?? "—"} color={scoreColor(cat.value)} />
        ))}
      </div>

      <SectionCard>
        <h3 className="mb-3 text-xs font-medium text-slate-200 sm:text-sm">Core Web Vitals</h3>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2 lg:grid-cols-3">
          {vitals.map((v) => {
            const status = v.value === null ? "unknown" : v.value > v.poor ? "poor" : v.value > v.good ? "needs-work" : "good";
            const dot = status === "good" ? "bg-green-500" : status === "needs-work" ? "bg-orange-500" : status === "poor" ? "bg-red-500" : "bg-slate-600";
            return (
              <div key={v.label} className="flex items-center gap-2 rounded border border-slate-800 px-2.5 py-2 sm:gap-3 sm:px-3">
                <div className={`h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5 ${dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1 sm:gap-2">
                    <span className="text-xs font-medium text-white sm:text-sm">{v.label}</span>
                    <span className="shrink-0 text-xs font-mono text-white sm:text-sm">{v.format(v.value)}</span>
                  </div>
                  <p className="truncate text-[10px] text-slate-500 sm:text-xs">{v.full}</p>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {insights.length > 0 && (
        <SectionCard>
          <h3 className="mb-3 text-xs font-medium text-slate-200 sm:text-sm">Opportunities &amp; Diagnostics ({insights.length})</h3>
          <div className="space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-2 rounded border border-slate-800 px-2.5 py-2 sm:px-3">
                <Badge color={ins.severity === "high" ? "red" : ins.severity === "medium" ? "orange" : "yellow"}>{ins.severity}</Badge>
                <div className="min-w-0">
                  <p className="break-words text-xs text-white sm:text-sm">{ins.title}</p>
                  {ins.description && <p className="mt-0.5 break-words text-[11px] text-slate-500 sm:text-xs">{ins.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ─── EMPTY STATE ─── */

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-800 py-10 sm:py-12">
      <p className="text-xs text-slate-500 sm:text-sm">{text}</p>
    </div>
  );
}
