"use client";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { CircleUser } from "lucide-react";
import { cn } from "@/lib/utils";
import useUser from "@/app/hook/useUser";
import { MdOutlineMarkEmailRead } from "react-icons/md";
import { FaGithub, FaDiscord } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import Avatar from "./avatar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Switch } from "@/components/ui/switch";
import { useAutoRenew } from "@/app/hook/useAutoRenew";
import { toast } from "sonner";

export type IconKey = "email" | "github" | "discord" | "google";

export const authProvider = {
  email: {
    Icon: MdOutlineMarkEmailRead,
  },
  github: {
    Icon: FaGithub,
  },
  discord: {
    Icon: FaDiscord,
  },
  google: {
    Icon: FcGoogle,
  },
};

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : null;

export default function ManageProfile() {
  const [activeTab, setActiveTab] = useState("profile");
  const { data } = useUser();

  const AuthProviderIcon = data?.app_metadata.provider
    ? authProvider[data?.app_metadata.provider as IconKey].Icon
    : MdOutlineMarkEmailRead;

  const {
    data: autoRenewInfo,
    isLoading: autoRenewLoading,
    isError: autoRenewError,
    error: autoRenewErrorObj,
    updateAutoRenew,
    isUpdating: autoRenewUpdating,
  } = useAutoRenew(Boolean(data?.id));

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
    if (!autoRenewInfo) {
      return null;
    }

    if (autoRenewInfo.autoRenew ?? false) {
      const renewsOn = formatDate(autoRenewInfo.renewsAt);
      return renewsOn ? `Next renewal on ${renewsOn}.` : "Auto-renew keeps your plan active.";
    }

    const endsOn = formatDate(autoRenewInfo.cancelAt ?? autoRenewInfo.renewsAt);
    return endsOn ? `Access ends on ${endsOn}.` : "You'll keep access until this billing period finishes.";
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button id="manage-profile"></button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 mx-auto flex flex-col sm:flex-row gap-4 sm:gap-0 rounded-xl bg-card">
        <VisuallyHidden asChild>
          <DialogTitle>Manage Profile</DialogTitle>
        </VisuallyHidden>

        <div className="w-full sm:w-60 rounded-lg sm:rounded-s-lg p-4 sm:p-5 space-y-7 border-b sm:border-b-0 sm:border-r sm:border-l-0 sm:border-t-0">
          <div>
            <h1 className="text-2xl font-bold">Account</h1>
            <p className="text-sm dark:text-gray-300">Manage your account info.</p>
          </div>

          <div
            className={cn(
              "p-2 flex items-center gap-2 rounded-lg text-sm cursor-pointer transition-all",
              {
                "text-green-700 dark:text-green-500 border-b hover:border-b-2 transition-all": activeTab === "profile",
              },
            )}
            onClick={() => setActiveTab("profile")}
          >
            <CircleUser />
            <span>Profile</span>
          </div>
        </div>

        <div className="flex-1 h-full border-t sm:border-t-0 sm:border-l rounded-lg px-4 sm:px-8 py-5 divide-y-[0.5px] space-y-5">
          <h1 className="font-bold text-xl w-36">Profile details</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-5 sm:gap-24">
            <h1 className="text-sm font-medium w-36">Profile</h1>
            <div className="flex-1 sm:px-3">
              <Avatar />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-24 gap-3 py-5 justify-between">
            <h1 className="text-sm font-medium w-36">Email</h1>
            <div className="flex-1 flex justify-between items-center sm:pl-3">
              <p className="text-sm break-all">{data?.email}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start py-5 gap-3 sm:gap-24">
            <h1 className="text-sm font-medium w-36">Connected accounts</h1>
            <div className="flex-1 space-y-5">
              <div className="flex items-center gap-2 px-3">
                <AuthProviderIcon />
                <p className="capitalize">{data?.app_metadata.provider}</p>
                <p className="text-sm text-gray-400 break-all">{data?.user_metadata.user_name}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start py-5 gap-3 sm:gap-24">
            <h1 className="text-sm font-medium w-36">Auto-renewal</h1>
            <div className="flex-1 sm:pl-3 space-y-2">
              {autoRenewLoading ? (
                <p className="text-sm text-muted-foreground">Checking your subscription...</p>
              ) : !autoRenewInfo ? (
                <p className="text-sm text-muted-foreground">Subscription details are currently unavailable.</p>
              ) : autoRenewInfo.status === "none" ? (
                <p className="text-sm text-muted-foreground">You do not have an active Paddle subscription yet.</p>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={autoRenewInfo.autoRenew ?? false}
                      disabled={autoRenewUpdating}
                      onCheckedChange={handleAutoRenewChange}
                      aria-label="Toggle auto-renewal"
                    />
                    <span className="text-sm font-medium">{(autoRenewInfo.autoRenew ?? false) ? "On" : "Off"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{renderAutoRenewDescription()}</p>
                  {autoRenewError && autoRenewErrorObj instanceof Error && (
                    <p className="text-xs text-destructive">{autoRenewErrorObj.message}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
