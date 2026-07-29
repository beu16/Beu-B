import { createClient } from "@supabase/supabase-js";

// Read Supabase environment variables safely
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || "placeholder-key";

export const isSupabaseConfigured = Boolean(
  metaEnv.VITE_SUPABASE_URL && metaEnv.VITE_SUPABASE_ANON_KEY
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SupabaseStatusResponse {
  configured: boolean;
  url: string;
  hasAnonKey: boolean;
  ping: boolean;
  message: string;
}

export async function checkSupabaseServerStatus(): Promise<SupabaseStatusResponse> {
  try {
    const res = await fetch("/api/supabase/status");
    if (!res.ok) {
      return {
        configured: isSupabaseConfigured,
        url: supabaseUrl,
        hasAnonKey: Boolean(supabaseAnonKey),
        ping: false,
        message: `HTTP ${res.status}: Server unreachable`
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      configured: isSupabaseConfigured,
      url: supabaseUrl,
      hasAnonKey: Boolean(supabaseAnonKey),
      ping: false,
      message: err?.message || "Connection check failed"
    };
  }
}

export async function syncStateToSupabase(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch("/api/supabase/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to trigger sync" };
  }
}
