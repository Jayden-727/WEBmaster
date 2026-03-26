"use client";

import Link from "next/link";
import { Search, Clock, BookOpen } from "lucide-react";

export function QuickActionsSection() {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:text-sm">
        Quick Actions
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="group rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-left transition hover:border-slate-700 hover:bg-slate-900 active:bg-slate-800 sm:p-4"
        >
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 transition group-hover:scale-105 sm:mb-3 sm:h-10 sm:w-10">
            <Search className="h-4 w-4 text-indigo-400 sm:h-5 sm:w-5" />
          </div>
          <p className="text-xs font-semibold text-white sm:text-sm">New Analysis</p>
          <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">Analyze a URL</p>
        </button>

        <Link
          href="/history"
          className="group rounded-xl border border-slate-800 bg-slate-900/50 p-3 transition hover:border-slate-700 hover:bg-slate-900 active:bg-slate-800 sm:p-4"
        >
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 transition group-hover:scale-105 sm:mb-3 sm:h-10 sm:w-10">
            <Clock className="h-4 w-4 text-purple-400 sm:h-5 sm:w-5" />
          </div>
          <p className="text-xs font-semibold text-white sm:text-sm">History</p>
          <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">Past results</p>
        </Link>

        <Link
          href="/"
          className="group rounded-xl border border-slate-800 bg-slate-900/50 p-3 transition hover:border-slate-700 hover:bg-slate-900 active:bg-slate-800 sm:p-4"
        >
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 transition group-hover:scale-105 sm:mb-3 sm:h-10 sm:w-10">
            <BookOpen className="h-4 w-4 text-blue-400 sm:h-5 sm:w-5" />
          </div>
          <p className="text-xs font-semibold text-white sm:text-sm">Product Info</p>
          <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">Learn more</p>
        </Link>
      </div>
    </section>
  );
}
