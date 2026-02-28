import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ensureActiveSubscription } from '@/app/lib/subscriptionHelpers';

export async function GET() {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
            async getAll() {
            const cookieStore =await cookies();
            return cookieStore.getAll();
          },
          async setAll(cookiesToSet) {
            const cookieStore =await cookies();
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Handle error or ignore in Server Components
            }
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan } = await ensureActiveSubscription(user.id);
    const archiveAllowed = plan?.archive_access ?? false;
    if (!archiveAllowed) {
      return NextResponse.json({ error: "Archive access requires a paid plan" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('summaries')
      .select('id, title, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);

  } catch (error) {
    // Properly use the error variable
    console.error('Error fetching summaries:', error);
    return NextResponse.json(
      { error: "Failed to fetch summaries", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
