// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function createSupabaseServer() {
  const cookieStore = await cookies(); 

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
        },
        async setAll(cookiesToSet: CookieToSet[]) {
          for (const { name, value, options } of cookiesToSet) {
            // ensure persistence
            const fallback = {
              path: "/",
              sameSite: "lax" as const,
              secure: true,
              maxAge: 60 * 60 * 24 * 30,
            };
            cookieStore.set(name, value, { ...fallback, ...(options ?? {}) });
          }
        },
      },
    }
  );
}
