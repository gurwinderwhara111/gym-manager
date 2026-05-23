import { createClient } from "@supabase/supabase-js";

let supabaseClient: any = null;
let lastUrl: string | null = null;

// Helper to get the current Supabase URL based on environment
function getCurrentSupabaseUrl(): string {
  if (typeof window !== "undefined") {
    const isCodespaces = window.location.hostname.includes("app.github.dev");
    if (isCodespaces) {
      // Use the Next.js rewrite proxy to avoid "Private Port" 401 errors in Codespaces
      return `${window.location.origin}/supabase-api`;
    }
  }
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

// Create or recreate the client if URL changes
function getOrCreateSupabase() {
  const currentUrl = getCurrentSupabaseUrl();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!currentUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  // Recreate client if URL has changed (e.g., Codespaces detection)
  if (!supabaseClient || lastUrl !== currentUrl) {
    console.log("Initializing Supabase with URL:", currentUrl);
    supabaseClient = createClient(currentUrl, supabaseAnonKey);
    lastUrl = currentUrl;
  }

  return supabaseClient;
}

// Export lazy-loaded client
export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getOrCreateSupabase();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return (value as any).bind(client);
    }
    return value;
  },
}) as any;
