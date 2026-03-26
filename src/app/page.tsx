import Link from "next/link";

export default function LandingPage() {
  return (
    <section className="space-y-6 py-16">
      <p className="inline-block rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">PageIntel MVP</p>
      <h1 className="text-4xl font-semibold tracking-tight">Reverse-engineer any webpage with one URL.</h1>
      <p className="max-w-2xl text-slate-300">
        Analyze metadata, structure, stack signals, content, links/images, and performance scores in one product-minded workflow.
      </p>
      <div className="flex gap-3">
        <Link href="/dashboard" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white">
          Open Dashboard
        </Link>
        <Link href="/login" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium">
          Login
        </Link>
      </div>
    </section>
  );
}
