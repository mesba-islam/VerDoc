// app/api/user/plan/route.ts
import { withSubscription } from '@/app/api/middleware/withSubscription';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  return withSubscription(req, async ({ userId, plan }) => {
    return new Response(
      JSON.stringify({ userId, plan }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  });
}
