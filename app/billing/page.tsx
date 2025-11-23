"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import useUser from "@/app/hook/useUser";
import { useAutoRenew } from "@/app/hook/useAutoRenew";
import { useSubscriptionPlan } from "@/app/hook/useSubscriptionPlan";
import { toast } from "sonner";

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : null;

export default function BillingPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser();
  const {
    data: autoRenewInfo,
    isLoading: autoRenewLoading,
    isError: autoRenewError,
    error: autoRenewErrorObj,
    updateAutoRenew,
    isUpdating: autoRenewUpdating,
  } = useAutoRenew(Boolean(user?.id));

  const {
    data: plan,
    isLoading: planLoading,
    isError: planError,
    error: planErrorObj,
  } = useSubscriptionPlan(Boolean(user?.id));

  // Redirect if user is not authenticated or doesn't have an active subscription
  useEffect(() => {
    if (!userLoading && !user) {
      // User is not authenticated
      router.push("/signin");
      return;
    }
    
    if (!planLoading && plan === null) {
      // User doesn't have an active subscription
      router.push("/");
      toast.error("You need an active subscription to access billing settings.");
      return;
    }
  }, [user, userLoading, plan, planLoading, router]);

  const [isLaunchingHostedFlow, setIsLaunchingHostedFlow] = useState(false);

  // Show loading state while checking authentication and subscription
  if (userLoading || planLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          <p className="text-muted-foreground">Loading billing information...</p>
        </div>
      </div>
    );
  }

  // Don't render page content if no subscription
  if (!plan) {
    return null;
  }

  const handleAutoRenewChange = (nextState: boolean) => {
    if (!autoRenewInfo || autoRenewInfo.status === "none") return;

    const current = autoRenewInfo.autoRenew ?? false;
    if (current === nextState) return;

    updateAutoRenew(nextState)
      .then(() => {
        toast.success(nextState ? "Auto-renew enabled." : "Auto-renew disabled for the next cycle.");
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Unable to update auto-renew";
        toast.error(message);
      });
  };

  const renderAutoRenewDescription = () => {
    if (!autoRenewInfo) return null;
    if (autoRenewInfo.autoRenew ?? false) {
      const renewsOn = formatDate(autoRenewInfo.renewsAt);
      return renewsOn ? `Next renewal on ${renewsOn}.` : "Auto-renew keeps your plan active.";
    }
    const endsOn = formatDate(autoRenewInfo.cancelAt ?? autoRenewInfo.renewsAt);
    return endsOn ? `Access ends on ${endsOn}.` : "You'll keep access until this billing period finishes.";
  };

  const handlePaymentMethodUpdate = async () => {
    if (isLaunchingHostedFlow) return;
    setIsLaunchingHostedFlow(true);
    try {
      const response = await fetch("/api/subscription/payment-method", {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message = (payload as { error?: string } | null)?.error ?? "Unable to start payment method update";
        throw new Error(message);
      }

      const url = (payload as { url?: string } | null)?.url;
      if (typeof url !== "string" || !url.length) {
        throw new Error("Paddle did not return a hosted flow URL");
      }

      window.open(url, "_blank", "noopener,noreferrer");
      toast.info("Opening Paddle to securely update your card details.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to launch hosted update";
      toast.error(message);
    } finally {
      setIsLaunchingHostedFlow(false);
    }
  };

  const canManagePaymentMethod = Boolean(autoRenewInfo && autoRenewInfo.status !== "none");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription, renewal preferences, and saved payment method.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-xl font-semibold">Subscription</h2>
            <p className="text-sm text-muted-foreground">Plan details and renewal status.</p>
          </div>

          <div className="rounded-lg border bg-background/50 p-4">
            {planLoading ? (
              <p className="text-sm text-muted-foreground">Loading your plan...</p>
            ) : planError ? (
              <p className="text-sm text-destructive">
                {planErrorObj instanceof Error ? planErrorObj.message : "Unable to load plan."}
              </p>
            ) : plan ? (
              <div className="space-y-2">
                <p className="text-base font-semibold">{plan.name}</p>
                {plan.billing_interval && (
                  <p className="text-sm text-muted-foreground capitalize">Billed {plan.billing_interval}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {plan.transcription_mins} transcription mins | {plan.upload_limit_mb}MB upload limit
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active plan detected.</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-renewal</p>
                <p className="text-sm text-muted-foreground">Toggle whether Paddle renews your plan automatically.</p>
              </div>
              <Switch
                checked={autoRenewInfo?.autoRenew ?? false}
                disabled={autoRenewLoading || autoRenewUpdating || !canManagePaymentMethod}
                onCheckedChange={handleAutoRenewChange}
                aria-label="Toggle auto-renewal"
              />
            </div>
            {autoRenewLoading ? (
              <p className="text-sm text-muted-foreground">Checking your subscription...</p>
            ) : !autoRenewInfo ? (
              <p className="text-sm text-muted-foreground">Subscription details are currently unavailable.</p>
            ) : autoRenewInfo.status === "none" ? (
              <p className="text-sm text-muted-foreground">You do not have an active Paddle subscription yet.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{renderAutoRenewDescription()}</p>
                {autoRenewError && autoRenewErrorObj instanceof Error && (
                  <p className="text-xs text-destructive">{autoRenewErrorObj.message}</p>
                )}
              </>
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-xl font-semibold">Payment method</h2>
            <p className="text-sm text-muted-foreground">
              Launch a secure Paddle-hosted window to update the card saved on your subscription.
            </p>
          </div>

          <div className="rounded-lg border bg-background/50 p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Paddle stays the merchant of record. We will redirect you to their PCI-compliant updater to change your card safely.
            </p>
            <Button
              onClick={handlePaymentMethodUpdate}
              disabled={!canManagePaymentMethod || autoRenewLoading || isLaunchingHostedFlow}
              className="w-full sm:w-auto"
            >
              {isLaunchingHostedFlow ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Opening secure window...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  Update payment method
                </>
              )}
            </Button>
            {!canManagePaymentMethod && !autoRenewLoading && (
              <p className="text-xs text-muted-foreground">
                You need an active Paddle subscription before you can update the saved card.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
