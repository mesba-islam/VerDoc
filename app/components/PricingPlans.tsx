'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CheckoutButton } from '@/app/components/CheckoutButton';
import type { SubscriptionPlan } from '@/app/types';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


export function PricingPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [paddleInitialized, setPaddleInitialized] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const router = useRouter();

  // Separate free and paid plans
  const freePlan = plans.find(plan => plan.name === 'Free');
  const paidPlans = plans.filter(plan => plan.billing_interval !== null);

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
        const validPlans = data.filter(plan => 
          plan.paddle_price_id && plan.paddle_price_id.startsWith('pri_')
        );
        setPlans(validPlans);
      }
      setLoading(false);
    };

    fetchPlans();
  }, []);

  if (loading) return <div className="text-center py-8">Loading plans...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      {/* Billing Interval Toggle */}
      <div className="flex justify-center mb-12">
        <div className="bg-muted p-1 rounded-lg">
          <div className="flex gap-2">
            <button
              onClick={() => setBillingInterval('month')}
              className={`px-6 py-2 rounded-md text-lg font-medium ${
                billingInterval === 'month' 
                  ? 'bg-background text-foreground shadow border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={`px-6 py-2 rounded-md text-lg font-medium ${
                billingInterval === 'year' 
                  ? 'bg-background text-foreground shadow border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Free Plan Card */}
        {freePlan && (
        <div className="border rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
          <div className="flex flex-col h-full">
            <h3 className="text-2xl font-bold mb-2">{freePlan.name}</h3>
            <p className="text-muted-foreground mb-4">Perfect for getting started</p>
            
            <div className="mb-6">
              <span className="text-4xl font-bold">Free</span>
            </div>

            <div className="flex-1 space-y-3 mb-6">
              <PlanFeature 
                label={`Upload Limit: ${freePlan.upload_limit_mb}MB`}
                valid={freePlan.upload_limit_mb > 0}
              />
              <PlanFeature 
                label="Video to Audio Conversion: Unlimited"
                valid={true}
              />
              <PlanFeature 
                label={`Transcription: ${freePlan.transcription_mins > 0 ? `${freePlan.transcription_mins} mins` : 'Not available'}`}
                valid={freePlan.transcription_mins > 0}
              />
              <PlanFeature 
                label={`Executive Summary: ${
                  freePlan.summarization_limit === null 
                    ? 'Unlimited' 
                    : (freePlan.summarization_limit > 0 
                        ? freePlan.summarization_limit 
                        : 'Not available')
                }`}
                valid={
                  freePlan.summarization_limit === null || 
                  freePlan.summarization_limit > 0
                }
              />
            </div>

            <button
              onClick={() => router.push('/register')}
              className="w-full mt-auto py-3 px-6 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary/10 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
        )}

        {/* Paid Plans */}
        {paidPlans
  .filter(plan => plan.billing_interval === billingInterval)
  .map((plan) => (
    <div 
      key={plan.id}
      className={`relative border rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow ${
        plan.name === 'Starter' ? 'border-2 border-primary' : 'border-border'  // Changed to Starter
      }`}
    >
      {plan.name === 'Starter' && (  // Changed from Pro to Starter
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 rounded-bl-xl text-sm font-semibold">
          Most Popular
        </div>
      )}
      
      <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
      <p className="text-muted-foreground mb-4">
        {plan.name === 'Starter' ? 'Most popular choice' : 'Advanced features'}
      </p>

              <div className="mb-6">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground ml-2">/ {plan.billing_interval}</span>
              </div>

              {/* <div className="flex-1 space-y-3 mb-6">
                <PlanFeature label={`Upload Limit: ${plan.upload_limit_mb}MB`} />
                <PlanFeature label="Video to Audio Conversion: Unlimited"/>
                <PlanFeature label={`Transcription: ${plan.transcription_mins} mins`} />
                <PlanFeature 
                  label={`Summarization: ${plan.summarization_limit === null ? 'Unlimited' : plan.summarization_limit}`} 
                />
              </div> */}

                <div className="flex-1 space-y-3 mb-6">
                  <PlanFeature 
                    label={`Upload Limit: ${plan.upload_limit_mb}MB`}
                    valid={plan.upload_limit_mb > 0}
                  />
                  <PlanFeature 
                    label="Video to Audio Conversion: Unlimited"
                    valid={true}
                  />
                  <PlanFeature 
                    label={`Transcription: ${plan.transcription_mins > 0 ? `${plan.transcription_mins} mins` : 'Not available'}`}
                    valid={plan.transcription_mins > 0}
                  />
                  <PlanFeature 
                    label={`Executive Summary: ${plan.summarization_limit === null ? 'Unlimited' : (plan.summarization_limit > 0 ? plan.summarization_limit : 'Not available')} pdf`}
                    valid={plan.summarization_limit === null || plan.summarization_limit > 0}
                  />
                </div>

              <CheckoutButton 
                priceId={plan.paddle_price_id}
                isPaddleReady={paddleInitialized}
                price={`$${plan.price}/${plan.billing_interval}`}
                isStarter={plan.name === 'Starter'}
              />
            </div>
          ))}
      </div>
    </div>
  );
}

const PlanFeature = ({ label, valid = true }: { label: string; valid?: boolean }) => (
  <div className="flex items-center">
    {valid ? (
      <CheckIcon />
    ) : (
      <svg 
        className="w-5 h-5 text-red-500" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )}
    <span className="ml-2">{label}</span>
  </div>
);

const CheckIcon = () => (
  <svg 
    className="w-5 h-5 text-green-500" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M5 13l4 4L19 7" 
    />
  </svg>
);
