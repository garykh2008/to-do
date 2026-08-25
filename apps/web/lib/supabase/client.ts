"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SCHEMA, type Database } from "@to-do/shared";

let browserClient: ReturnType<typeof createBrowserClient<Database, "todo">> | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database, "todo">(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { db: { schema: SCHEMA } },
    );
  }
  return browserClient;
}
