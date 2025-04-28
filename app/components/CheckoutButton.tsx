'use client';

import { Paddle } from '@paddle/paddle-js';
import { useRouter } from 'next/navigation';
import useUser from '@/app/hook/useUser';

declare global {
  interface Window {
    Paddle?: Paddle;
  }
}

export function CheckoutButton({ priceId, isPaddleReady, price, isStarter = false }: { 
  priceId: string; 
  isPaddleReady: boolean;
  price: string;
  isStarter:boolean; 
}) {

  const { data: user } = useUser();
  const router = useRouter();

  const handleCheckout = () => {
    if (!user) {
      router.push('/register');
      return;
    }
    if (!window.Paddle) return;
    
    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
    });
  };

  return (
    <button
    onClick={handleCheckout}
    disabled={!isPaddleReady}
    className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
      isStarter 
        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
        : 'bg-gray-900 text-white hover:bg-gray-800'
    } ${!isPaddleReady ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {isPaddleReady ? `Choose Plan - ${price}` : 'Loading...'}
  </button>
  );
}