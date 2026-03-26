"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
        aria-label="Toggle menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl space-y-1 px-4 py-4">
            <a
              href="#features"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              How It Works
            </a>
            <a
              href="#audience"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              Use Cases
            </a>
            <hr className="border-slate-800" />
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              Log in
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block rounded-lg bg-indigo-500 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-indigo-400"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
