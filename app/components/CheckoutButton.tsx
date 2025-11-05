'use client';

import { useState } from 'react';
import { Paddle } from '@paddle/paddle-js';
import type { CheckoutOpenOptions } from '@paddle/paddle-js';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import useUser from '@/app/hook/useUser';
import { useSubscriptionPlan } from '@/app/hook/useSubscriptionPlan';

declare global {
  interface Window {
    Paddle?: Paddle;
  }
}

type CheckoutButtonProps = {
  priceId: string;
  planId: string;
  isPaddleReady: boolean;
  price: string;
  isStarter: boolean;
  planName: string;
  planPrice: number;
  billingInterval: string | null;
};

export function CheckoutButton({
  priceId,
  planId,
  isPaddleReady,
  price,
  isStarter = false,
  planName,
  planPrice,
  billingInterval,
}: CheckoutButtonProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: activePlan, isFetching: isFetchingPlan } = useSubscriptionPlan(Boolean(user?.id));
  const [isUpdating, setIsUpdating] = useState(false);

  const openPaddleCheckout = () => {
    if (!window.Paddle) {
      toast.error('Payment system not ready yet. Please try again.');
      return;
    }

    const isDark = document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    const options = {
      items: [{ priceId, quantity: 1 }],
      customData: {
        user_id: user?.id,
        plan_id: planId,
      },
      settings: {
        theme: isDark ? 'dark' : 'light',
        allowLogout: true,
      },
      customer: user?.email ? { email: user.email } : undefined,
    } satisfies CheckoutOpenOptions;

    window.Paddle.Checkout.open(options);
  };

  const handleCheckout = async () => {
    if (!user) {
      router.push('/register');
      return;
    }

    if (isFetchingPlan || isUpdating) {
      return;
    }

    if (activePlan) {
      if (activePlan.id === planId) {
        toast.info('You are already on this plan.');
        return;
      }

      try {
        setIsUpdating(true);
        const response = await fetch('/api/subscription/change-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId }),
        });

        if (response.status === 404) {
          setIsUpdating(false);
          // No active subscription found; fallback to standard checkout
          openPaddleCheckout();
          return;
        }

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = typeof payload?.error === 'string' ? payload.error : 'Unable to change plan right now.';
          throw new Error(message);
        }

        const previousPrice = typeof activePlan?.price === 'number' ? activePlan.price : null;
        const targetPrice = typeof planPrice === 'number' ? planPrice : null;
        const intervalLabel = billingInterval
          ? `${billingInterval.charAt(0).toUpperCase()}${billingInterval.slice(1)}`
          : null;

        let successMessage = `Plan switched to ${planName}.`;
        if (previousPrice !== null && targetPrice !== null) {
          if (targetPrice > previousPrice) {
            successMessage = `Plan upgraded to ${planName}. Paddle will prorate the difference for you.`;
          } else if (targetPrice < previousPrice) {
            successMessage = `Plan downgraded to ${planName}. Paddle will handle proration automatically.`;
          }
        }
        if (intervalLabel) {
          successMessage += ` Billing interval: ${intervalLabel}.`;
        }

        toast.success(successMessage);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Plan change failed.';
        toast.error(message);
      } finally {
        setIsUpdating(false);
      }
      return;
    }

    openPaddleCheckout();
  };

  const label = isUpdating ? 'Switching plan...' : price
    ? `Choose Plan - ${price}`
    : 'Choose Plan';

  return (
    <button
      onClick={() => { void handleCheckout(); }}
      disabled={!isPaddleReady || isUpdating}
      className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
        isStarter ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-gray-900 text-white hover:bg-gray-800'
      } ${(!isPaddleReady || isUpdating) ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isPaddleReady ? label : 'Loading...'}
    </button>
  );
}
