import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SCHEMA, type Database } from "@to-do/shared";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database, "todo">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: SCHEMA },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component 呼叫 setAll 會拋錯，因為 middleware 已經負責刷新 session，可以忽略
          }
        },
      },
    },
  );
}
