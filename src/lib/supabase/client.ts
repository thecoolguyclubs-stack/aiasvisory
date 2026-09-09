import { createClient } from "@supabase/supabase-js";

const APP_API_SCHEMA = "app_api";

function createAppApiClient(url: string, publishableKey: string) {
  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    db: { schema: APP_API_SCHEMA },
  });
}

type PublicSupabaseClient = ReturnType<typeof createAppApiClient>;

let publicClient: PublicSupabaseClient | undefined;

function getPublicSupabaseConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Public database configuration is unavailable.");
  }

  return { publishableKey, url };
}

/**
 * Shared anonymous client for browser-safe calls through the exposed app_api
 * schema. It intentionally accepts only the public publishable key.
 */
export function getPublicSupabaseClient(): PublicSupabaseClient {
  if (publicClient) return publicClient;

  const { publishableKey, url } = getPublicSupabaseConfiguration();

  const client = createAppApiClient(url, publishableKey);

  publicClient = client;
  return client;
}
