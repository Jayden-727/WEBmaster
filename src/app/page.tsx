import Link from "next/link";
import { HeroForm } from "@/components/landing/hero-form";
import { MobileNav } from "@/components/landing/mobile-nav";
import {
  Globe,
  Layers,
  Search,
  Gauge,
  LayoutDashboard,
  FileText,
  Code2,
  Grid3X3,
  Link2,
  ImageIcon,
  Zap,
  ArrowRight,
  Monitor,
  Users,
  TrendingUp,
  ShieldCheck,
  ShoppingCart,
  CheckCircle2,
  Sparkles,
  Database,
  Eye,
} from "lucide-react";

/* ═══════════════════════════════════════════
   Landing Page — AttractiveWebAI
   ═══════════════════════════════════════════ */

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ValueCardsSection />
        <FeatureGridSection />
        <WhySection />
        <HowItWorksSection />
        <AudienceSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}

/* ─── Navbar ─── */

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
            <Globe className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">AttractiveWebAI</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-slate-400 transition hover:text-white">Features</a>
          <a href="#how-it-works" className="text-sm text-slate-400 transition hover:text-white">How It Works</a>
          <a href="#audience" className="text-sm text-slate-400 transition hover:text-white">Use Cases</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm text-slate-400 transition hover:text-white sm:block">
            Log in
          </Link>
          <Link
            href="/dashboard"
            className="hidden rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 sm:inline-flex"
          >
            Dashboard
          </Link>
          <MobileNav />
        </div>
      </div>
    </nav>
  );
}

/* ─── 1. Hero Section ─── */

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-500/5 blur-3xl" />
        <div className="absolute right-0 top-20 h-[400px] w-[400px] rounded-full bg-purple-500/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-[300px] w-[500px] rounded-full bg-blue-500/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 md:pb-28 md:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-medium text-indigo-300 sm:px-4 sm:py-1.5 sm:text-xs">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              AI-Powered Website Intelligence
            </div>

            <h1 className="text-balance text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              Understand any website{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                instantly
              </span>
            </h1>

            <p className="max-w-lg text-base leading-relaxed text-slate-400 sm:text-lg">
              AttractiveWebAI reveals a site&apos;s structure, content, technology stack, metadata,
              links, images, and performance — all in one clear, intelligent dashboard.
            </p>

            <HeroForm />

            <div className="flex flex-wrap gap-3 pt-1 sm:gap-4 sm:pt-2">
              {[
                { icon: CheckCircle2, text: "No sign-up" },
                { icon: Zap, text: "Results in seconds" },
                { icon: ShieldCheck, text: "100% private" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Icon className="h-3.5 w-3.5 text-slate-600" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Dashboard Preview (Visual) ─── */

function DashboardPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 blur-xl" />
      <div className="relative rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500/60" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
          <div className="h-3 w-3 rounded-full bg-green-500/60" />
          <div className="ml-4 h-5 flex-1 rounded bg-slate-800/80 px-3 text-[10px] leading-5 text-slate-500">
            attractivewebai.app/analysis/abc123
          </div>
        </div>

        <div className="mb-3 grid grid-cols-4 gap-2">
          {[
            { label: "Performance", value: "96", color: "text-green-400" },
            { label: "SEO", value: "91", color: "text-green-400" },
            { label: "Accessibility", value: "88", color: "text-orange-400" },
            { label: "Best Practices", value: "100", color: "text-green-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-[9px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MockCard title="Stack Detected" items={["Next.js", "React", "Tailwind CSS", "Vercel"]} color="indigo" />
          <MockCard title="Structure" items={["Header", "Hero Banner", "FAQ Section", "Footer"]} color="purple" />
          <MockCard title="Metadata" items={["Title ✓", "Description ✓", "OG Image ✓", "Canonical ✓"]} color="blue" />
          <MockCard title="Content" items={["3,240 words", "12 headings", "Markdown ✓", "Clean text ✓"]} color="emerald" />
        </div>
      </div>
    </div>
  );
}

function MockCard({ title, items, color }: { title: string; items: string[]; color: string }) {
  const dotColor = color === "indigo" ? "bg-indigo-400" : color === "purple" ? "bg-purple-400" : color === "blue" ? "bg-blue-400" : "bg-emerald-400";
  return (
    <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-2.5">
      <p className="mb-1.5 text-[10px] font-medium text-slate-400">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
            <span className="text-[10px] text-slate-300">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 2. Value Cards Section ─── */

function ValueCardsSection() {
  const values = [
    {
      icon: Globe,
      title: "Deep Crawl & Extract",
      description: "Fetch and parse any public webpage. Extract clean text, structured HTML, and full markdown — ready for analysis.",
    },
    {
      icon: Layers,
      title: "Stack & Structure Detection",
      description: "Identify the technology stack (React, WordPress, Shopify…) and map UI components like headers, heroes, and CTAs.",
    },
    {
      icon: Search,
      title: "SEO & Metadata Analysis",
      description: "Audit title tags, descriptions, Open Graph, canonical URLs, robots directives, and structured data (JSON-LD).",
    },
    {
      icon: Gauge,
      title: "Lighthouse Performance",
      description: "Run full Lighthouse audits locally. Get performance, accessibility, SEO, and best practices scores with Core Web Vitals.",
    },
  ];

  return (
    <section className="relative border-t border-slate-800/60 bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-28">
        <div className="mb-10 text-center sm:mb-12">
          <p className="mb-3 text-sm font-medium text-indigo-400">Core Capabilities</p>
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Everything you need to understand a webpage
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:mt-4 sm:text-base">
            Go beyond &quot;View Source&quot;. AttractiveWebAI combines crawling, parsing, detection, and performance auditing
            into one streamlined workflow.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group relative rounded-xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-slate-700 hover:bg-slate-900 sm:p-6"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 transition group-hover:bg-indigo-500/20 sm:mb-4 sm:h-11 sm:w-11">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 3. Feature Grid Section ─── */

function FeatureGridSection() {
  const features = [
    { icon: LayoutDashboard, title: "Overview Dashboard", description: "Executive summary with key metrics, error counts, and quick navigation to every section.", color: "from-indigo-500/20 to-indigo-500/5" },
    { icon: FileText, title: "Metadata Analysis", description: "Title, description, OG tags, canonical, robots, language, charset, and JSON-LD structured data.", color: "from-blue-500/20 to-blue-500/5" },
    { icon: Database, title: "Content Extraction", description: "Clean text, rendered markdown, heading hierarchy, and word count — ready for downstream use.", color: "from-cyan-500/20 to-cyan-500/5" },
    { icon: Code2, title: "Stack Detection", description: "Identify frameworks, CMS platforms, analytics tools, and libraries with confidence scoring.", color: "from-purple-500/20 to-purple-500/5" },
    { icon: Grid3X3, title: "Structure Mapping", description: "Detect UI patterns — headers, heroes, CTAs, FAQs, forms, galleries — with matched selectors.", color: "from-pink-500/20 to-pink-500/5" },
    { icon: Link2, title: "Links Explorer", description: "Browse all links with internal/external classification, anchor text, and search & filter controls.", color: "from-amber-500/20 to-amber-500/5" },
    { icon: ImageIcon, title: "Images Explorer", description: "Thumbnail grid with preview modal, alt text audit, lazy-load detection, and download options.", color: "from-emerald-500/20 to-emerald-500/5" },
    { icon: Gauge, title: "Lighthouse Insights", description: "Full performance audit with scores, Core Web Vitals (LCP, CLS, FCP, TBT, INP), and actionable tips.", color: "from-orange-500/20 to-orange-500/5" },
  ];

  return (
    <section id="features" className="border-t border-slate-800/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-28">
        <div className="mb-10 text-center sm:mb-12">
          <p className="mb-3 text-sm font-medium text-indigo-400">Product Modules</p>
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Eight analysis modules. One dashboard.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:mt-4 sm:text-base">
            Every analysis runs all eight modules simultaneously, giving you a complete picture in seconds.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description, color }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-slate-700 sm:p-5"
            >
              <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${color} opacity-0 blur-2xl transition group-hover:opacity-100`} />
              <div className="relative">
                <Icon className="mb-2 h-5 w-5 text-slate-400 transition group-hover:text-indigo-400 sm:mb-3" />
                <h3 className="mb-1 text-xs font-semibold sm:mb-1.5 sm:text-sm">{title}</h3>
                <p className="text-[11px] leading-relaxed text-slate-500 sm:text-xs">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 4. Why AttractiveWebAI Section ─── */

function WhySection() {
  const comparisons = [
    { before: "View source and guess the stack", after: "Detect frameworks, CMS, and libraries automatically" },
    { before: "Manually check meta tags one by one", after: "Full metadata audit in one structured view" },
    { before: "Run Lighthouse in a separate tool", after: "Integrated Lighthouse with Core Web Vitals dashboard" },
    { before: "Copy-paste content from pages manually", after: "Clean text + markdown extraction in seconds" },
    { before: "Guess what UI components a page uses", after: "Automated structure detection with confidence scores" },
  ];

  return (
    <section className="border-t border-slate-800/60 bg-slate-900/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-28">
        <div className="mb-10 text-center sm:mb-12">
          <p className="mb-3 text-sm font-medium text-indigo-400">Why AttractiveWebAI</p>
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Go beyond source code. See the full picture.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:mt-4 sm:text-base">
            Traditional methods are fragmented and manual. AttractiveWebAI combines everything into one intelligent workflow.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-3">
          {comparisons.map(({ before, after }, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4">
              <div className="grid items-center gap-3 sm:gap-4 md:grid-cols-2">
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-[10px] text-red-400">✕</span>
                  <p className="text-xs text-slate-500 line-through decoration-slate-700 sm:text-sm">{before}</p>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-[10px] text-green-400">✓</span>
                  <p className="text-xs text-slate-200 sm:text-sm">{after}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 5. How It Works Section ─── */

function HowItWorksSection() {
  const steps = [
    { step: "01", icon: Globe, title: "Enter a URL", description: "Paste any public webpage URL into the analysis input. No setup, no API keys, no configuration needed." },
    { step: "02", icon: Eye, title: "Automatic Analysis", description: "AttractiveWebAI crawls the page and runs all eight analysis modules simultaneously — stack, structure, metadata, content, links, images, and Lighthouse." },
    { step: "03", icon: LayoutDashboard, title: "Explore the Dashboard", description: "Browse the results in a clear, organized dashboard. Drill into any section, copy data, preview images, and export insights." },
  ];

  return (
    <section id="how-it-works" className="border-t border-slate-800/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-28">
        <div className="mb-10 text-center sm:mb-14">
          <p className="mb-3 text-sm font-medium text-indigo-400">How It Works</p>
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Three steps. Full intelligence.
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map(({ step, icon: Icon, title, description }) => (
            <div key={step} className="relative text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 sm:mb-5 sm:h-14 sm:w-14">
                <Icon className="h-5 w-5 text-indigo-400 sm:h-6 sm:w-6" />
              </div>
              <div className="mb-2 inline-flex rounded-full bg-indigo-500/10 px-3 py-0.5 text-xs font-semibold text-indigo-400 sm:mb-3">
                Step {step}
              </div>
              <h3 className="mb-2 text-base font-semibold sm:text-lg">{title}</h3>
              <p className="text-xs leading-relaxed text-slate-400 sm:text-sm">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 hidden justify-center sm:flex">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Paste URL</span>
            <ArrowRight className="h-3 w-3" />
            <span>Automated Analysis</span>
            <ArrowRight className="h-3 w-3" />
            <span>Actionable Dashboard</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 6. Target Users / Audience Section ─── */

function AudienceSection() {
  const audiences = [
    { icon: Code2, title: "Developers", description: "Reverse-engineer any site's stack and structure. Understand what frameworks and libraries power the page." },
    { icon: Monitor, title: "Product Managers", description: "Quickly analyze competitor pages. Understand structure, content strategy, and user-facing components." },
    { icon: TrendingUp, title: "SEO Marketers", description: "Audit meta tags, Open Graph, structured data, and Lighthouse scores for any URL in seconds." },
    { icon: ShieldCheck, title: "QA Teams", description: "Verify page structure, detect missing metadata, broken images, and performance regressions." },
    { icon: ShoppingCart, title: "E-Commerce Operators", description: "Analyze product pages, compare competitor layouts, and audit page speed for conversion optimization." },
    { icon: Users, title: "Agencies & Consultants", description: "Generate instant site audits for client presentations. Professional analysis in a shareable dashboard." },
  ];

  return (
    <section id="audience" className="border-t border-slate-800/60 bg-slate-900/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-28">
        <div className="mb-10 text-center sm:mb-12">
          <p className="mb-3 text-sm font-medium text-indigo-400">Built For</p>
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            The tool every web professional needs
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:mt-4 sm:text-base">
            Whether you&apos;re building, marketing, or auditing — AttractiveWebAI gives you the intelligence you need.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {audiences.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-slate-700 sm:gap-4 sm:p-5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400 sm:h-10 sm:w-10">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="mb-1 text-sm font-semibold sm:text-base">{title}</h3>
                <p className="text-xs leading-relaxed text-slate-400 sm:text-sm">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 7. Final CTA Section ─── */

function CTASection() {
  return (
    <section className="border-t border-slate-800/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-28">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center sm:p-10 md:p-16">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
          </div>

          <div className="relative space-y-5 sm:space-y-6">
            <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              Ready to analyze your first page?
            </h2>
            <p className="mx-auto max-w-lg text-sm text-slate-400 sm:text-base">
              Paste any URL and get a complete analysis in seconds — structure, stack, content, metadata, performance, and more.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/dashboard"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-400 sm:w-auto"
              >
                Start Analyzing
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-8 py-3.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white sm:w-auto"
              >
                Explore Features
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */

function Footer() {
  return (
    <footer className="border-t border-slate-800/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 sm:flex-row sm:justify-between sm:px-6 sm:py-8">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-500/80">
            <Globe className="h-3 w-3 text-white" />
          </div>
          <span>AttractiveWebAI</span>
        </div>
        <p className="text-xs text-slate-600">
          &copy; {new Date().getFullYear()} AttractiveWebAI. Built with Next.js &amp; Supabase.
        </p>
      </div>
    </footer>
  );
}
