import { memoryDeepJobStore } from "./memory-job-store";
import { createSupabaseDeepJobStore } from "./supabase-job-store";
import type { DeepJobStore } from "./job-store";

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getDeepJobStore(): DeepJobStore {
  if (isSupabaseConfigured()) {
    try {
      return createSupabaseDeepJobStore();
    } catch (error) {
      console.warn(
        "[DeepAnalyzer] Supabase store unavailable. Falling back to memory store.",
        error
      );
      return memoryDeepJobStore;
    }
  }

  console.warn(
    "[DeepAnalyzer] Supabase env not configured. Using memory job store."
  );
  return memoryDeepJobStore;
}
