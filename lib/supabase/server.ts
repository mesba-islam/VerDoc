import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
				async setAll(cookiesToSet) {
					for (const cookie of cookiesToSet) {
						await cookieStore.set(cookie);
					}
				},
			},
		}
	);
}
