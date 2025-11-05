"use client";

import { useQuery } from "@tanstack/react-query";

type ActivePlan = {
  id: string;
  name: string;
  upload_limit_mb: number;
  transcription_mins: number;
  summarization_limit: number | null;
  billing_interval: string | null;
  paddle_price_id?: string | null;
  price?: number;
};

type PlanResponse = {
  userId: string;
  plan: ActivePlan;
};

export function useSubscriptionPlan(enabled: boolean) {
  return useQuery<ActivePlan | null>({
    queryKey: ["subscription", "plan"],
    queryFn: async () => {
      const response = await fetch("/api/user/plan", { cache: "no-store" });

      if (response.status === 401 || response.status === 403 || response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: "Unable to load subscription plan" }));
        throw new Error(error ?? "Unable to load subscription plan");
      }

      const payload = await response.json() as PlanResponse;
      return payload.plan ?? null;
    },
    enabled,
    retry: false,
    staleTime: 30_000,
  });
}
