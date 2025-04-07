import { PricingPlans } from '@/app/components/PricingPlans';

export default function home() {
  return (
    <main className="min-h-screen py-12">
      <h1 className="text-4xl font-bold text-center mb-8">Choose Your Plan</h1>
      <PricingPlans />
    </main>
    
  );
}