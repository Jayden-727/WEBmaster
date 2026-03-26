import { PropsWithChildren } from "react";

export function Card({ children }: PropsWithChildren) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">{children}</div>;
}
