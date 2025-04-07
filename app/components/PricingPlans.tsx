'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CheckoutButton } from '@/app/components/CheckoutButton';
import type { SubscriptionPlan } from '@/app/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function PricingPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [paddleInitialized, setPaddleInitialized] = useState(false);

  // Initialize Paddle once for the entire component
  useEffect(() => {
    const initializePaddle = async () => {
      try {
        const { initializePaddle } = await import('@paddle/paddle-js');
        await initializePaddle({
          environment: process.env.NEXT_PUBLIC_PADDLE_ENV as 'sandbox' | 'production',
          token: process.env.NEXT_PUBLIC_PADDLE_VENDOR_TOKEN!,
          eventCallback: (event) => {
            console.log('Paddle Event:', event);
          }
        });
        setPaddleInitialized(true);
      } catch (error) {
        console.error('Paddle initialization failed:', error);
      }
    };

    if (!paddleInitialized) {
      initializePaddle();
    }
  }, [paddleInitialized]);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('upload_limit_mb');

      if (!error && data) {
        // Validate price IDs format
        const validPlans = data.filter(plan => 
          plan.paddle_price_id && plan.paddle_price_id.startsWith('pri_')
        );
        setPlans(validPlans);
      }
      setLoading(false);
    };

    fetchPlans();
  }, []);

  if (loading) return <div>Loading plans...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
      {plans.map((plan) => (
        <div key={plan.id} className="border rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">{plan.name}</h2>
          <div className="space-y-4">
            <p>📁 Upload Limit: {plan.upload_limit_mb}MB</p>
            <p>⏱ Transcription: {plan.transcription_mins} mins</p>
            <p>📝 Summarization: {plan.summarization_limit === null ? 'Unlimited' : plan.summarization_limit}</p>
            {plan.paddle_price_id ? (
              <CheckoutButton 
                priceId={plan.paddle_price_id}
                isPaddleReady={paddleInitialized}
              />
            ) : (
              <div className="text-red-500">Invalid price configuration</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}