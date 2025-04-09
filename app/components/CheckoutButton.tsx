'use client';

import { Paddle } from '@paddle/paddle-js';

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
  const handleCheckout = () => {
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
        ? 'bg-primary text-black hover:bg-primary/90' 
        : 'bg-gray-900 text-white hover:bg-gray-800'
    } ${!isPaddleReady ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {isPaddleReady ? `Choose Plan - ${price}` : 'Loading...'}
  </button>
  );
}