"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type AutoRenewInfo = {
  autoRenew: boolean;
  status: string;
  renewsAt: string | null;
  cancelAt: string | null;
};

export function useAutoRenew(enabled: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery<AutoRenewInfo>({
    queryKey: ["subscription", "auto-renew"],
    queryFn: async () => {
      const response = await fetch("/api/subscription/auto-renew");
      if (response.status === 404) {
        return { autoRenew: false, status: "none", renewsAt: null, cancelAt: null };
      }
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: "Unable to load auto-renew status" }));
        throw new Error(error ?? "Unable to load auto-renew status");
      }
      return response.json();
    },
    enabled,
    retry: false,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async (nextState: boolean) => {
      const response = await fetch("/api/subscription/auto-renew", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoRenew: nextState }),
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: "Unable to update auto-renew status" }));
        throw new Error(error ?? "Unable to update auto-renew status");
      }
      return response.json() as Promise<AutoRenewInfo>;
    },
    onSuccess: (payload) => {
      queryClient.setQueryData(["subscription", "auto-renew"], payload);
    },
  });

  return {
    ...query,
    updateAutoRenew: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
