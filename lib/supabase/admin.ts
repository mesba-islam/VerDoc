// import { createClient } from "@supabase/supabase-js";

// export default function supabaseAdmin() {
// 	return createClient(
// 		process.env.NEXT_PUBLIC_SUPABASE_URL!,
// 		process.env.SUPABAE_ADMIN!,
// 		{
// 			auth: {
// 				autoRefreshToken: false,
// 				persistSession: false,
// 			},
// 		}
// 	);
// }

// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-side only!
);

export default supabaseAdmin;

