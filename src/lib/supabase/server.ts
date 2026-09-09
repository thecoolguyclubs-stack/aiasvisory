import "server-only";

import { createClient } from "@supabase/supabase-js";

const APP_API_SCHEMA = "app_api";

function createAppApiServerClient(url: string, secretKey: string) {
  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    db: { schema: APP_API_SCHEMA },
  });
}

type AppApiServerClient = ReturnType<typeof createAppApiServerClient>;

let serverClient: AppApiServerClient | undefined;

export function getServerSupabaseClient(): AppApiServerClient {
  if (serverClient) return serverClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Server database configuration is unavailable.");
  }

  const client = createAppApiServerClient(url, secretKey);
  serverClient = client;

  return client;
}
