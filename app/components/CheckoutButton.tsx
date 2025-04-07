'use client';

// import { useEffect, useState } from 'react';
import { Paddle } from '@paddle/paddle-js';

declare global {
  interface Window {
    Paddle?: Paddle;
  }
}

export function CheckoutButton({ priceId, isPaddleReady }: { 
  priceId: string; 
  isPaddleReady: boolean; 
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
      className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
    >
      Subscribe
    </button>
  );
}