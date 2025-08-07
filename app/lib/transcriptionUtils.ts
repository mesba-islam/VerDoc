// app/lib/transcriptionUtils.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// export async function checkTranscriptionLimit(userId: string) {
//   console.log('Checking subscription for user:', userId);
//   try {
//     // const { data: allSubs, error: allSubsError } = await supabase
//     //   .from('subscriptions')
//     //   .select('*')
//     //   .eq('user_id', userId);

//     // console.log('All subscriptions for user:', allSubs);
//     // console.log('All subscriptions error:', allSubsError);

//     // // Then check with status
//     // const { data: activeSubs, error: activeSubsError } = await supabase
//     //   .from('subscriptions')
//     //   .select('*')
//     //   .eq('user_id', userId)
//     //   .eq('status', 'active');

//     // console.log('Active subscriptions:', activeSubs);
//     // console.log('Active subscriptions error:', activeSubsError);

//     const currentTime = new Date().toISOString();
//     console.log('Current time:', currentTime);

//   //   // Simplified query to match SQL that works
//   //   const { data, error } = await supabase
//   //   .from('subscriptions')
//   //   .select('*, subscription_plans(*)')
//   //   .eq('user_id', userId)
//   //   .eq('status', 'active')
//   //   .lte('starts_at', currentTime)
//   // .or(`ends_at.gte.${currentTime},ends_at.is.null`) 
//   //   .order('created_at', { ascending: false })
//   //   .limit(1);

//   // Replace the existing query with this corrected version
//     const { data, error } = await supabase
//     .from('subscriptions')
//     .select(`
//       *,
//       subscription_plans!plan_id(*) 
//     `) // Force inner join using "!inner" and specify FK
//     .eq('user_id', userId)
//     .eq('status', 'active')
//     // .lte('starts_at', 'now()') // Database NOW()
//     // .gte('ends_at', 'now()')   // Database NOW()
//     .order('created_at', { ascending: false })
//     .limit(1);

//     console.log('Final subscription query result:', data);

//     if (error || !data?.length) {
//       return { 
//         canTranscribe: false, 
//         message: 'No active subscription', 
//         remainingMinutes: 0 
//       };
//     }

   

//     if (!data || data.length === 0) {
//       return {
//         canTranscribe: false,
//         message: 'Please subscribe to transcribe audio',
//         remainingMinutes: 0
//       };
//     }

//     const subscription = data[0];
//     const plan = subscription.subscription_plans[0];

//     if (!plan) {
//       console.error('No plan found for subscription:', subscription);
//       return {
//         canTranscribe: false,
//         message: 'Invalid subscription plan',
//         remainingMinutes: 0
//       };
//     }

//     // Calculate usage period
//     const now = new Date();
//     const periodStart = plan.billing_interval === 'month' 
//       ? new Date(now.getFullYear(), now.getMonth(), 1)
//       : new Date(now.getFullYear(), 0, 1);

//     // Get usage for current period
//     const { data: usage, error: usageError } = await supabase
//       .from('transcription_usage')
//       .select('duration_minutes')
//       .eq('user_id', userId)
//       .gte('month_year', periodStart.toISOString())
//       .lte('month_year', now.toISOString());

//     if (usageError) {
//       console.error('Error fetching usage:', usageError);
//       return {
//         canTranscribe: false,
//         message: 'Error checking usage',
//         remainingMinutes: 0
//       };
//     }

//     const totalUsage = usage?.reduce((sum, record) => sum + record.duration_minutes, 0) || 0;
//     const limit = plan.transcription_mins;

//     console.log('Usage details:', {
//       totalUsage,
//       limit,
//       periodStart: periodStart.toISOString(),
//       now: now.toISOString()
//     });

//     return {
//       canTranscribe: totalUsage < limit,
//       message: totalUsage >= limit 
//         ? `You've reached your ${plan.billing_interval}ly limit of ${limit} minutes`
//         : `You have ${limit - totalUsage} minutes remaining`,
//       remainingMinutes: limit - totalUsage
//     };

//   } catch (error) {
//     console.error('Error in checkTranscriptionLimit:', error);
//     return {
//       canTranscribe: false,
//       message: 'Error checking transcription limit',
//       remainingMinutes: 0
//     };
//   }
// }
export async function checkTranscriptionLimit(userId: string) {
  console.log('Checking subscription for user:', userId);
  
  // Always allow transcription - removed all subscription checks
  return {
    canTranscribe: true,
    message: 'Transcription enabled',
    remainingMinutes: 999 // Set a high number to show unlimited
  };
}
export async function recordTranscriptionUsage(userId: string, durationMinutes: number) {
  // try {
  //   const now = new Date();
  //   const monthYear = new Date(now.getFullYear(), now.getMonth(), 1);

  //   const { error } = await supabase
  //     .from('transcription_usage')
  //     .insert({
  //       user_id: userId,
  //       duration_minutes: durationMinutes,
  //       month_year: monthYear
  //     });

  //   if (error) {
  //     console.error('Error recording transcription usage:', error);
  //     throw error;
  //   }
  // } catch (error) {
  //   console.error('Error in recordTranscriptionUsage:', error);
  //   throw error;
  // }
}