"use client";
import useUser  from "@/app/hook/useUser";
import { useSubscriptionPlan } from "@/app/hook/useSubscriptionPlan";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AudioWaveform, CreditCard, FileClock } from "lucide-react";
import { Suspense } from "react";
import ThemeToggle from "./ThemeToggle";
import UserProfile from "@/components/supaauth/user-profile";
import { Tooltip } from "@/components/ui/tooltip";

export default function Navbar() {
  const pathname = usePathname(); 
  const { data: user, isLoading: userLoading  } = useUser();
  const { data: plan, isLoading: planLoading } = useSubscriptionPlan(Boolean(user?.id));
  
  // Only show billing if user is authenticated AND has an active subscription
  const hasBillingAccess = user && plan && !planLoading;
  
  const navItems = [
    { href: "/transcribe", icon: AudioWaveform, label: "Transcribe" },
    { href: "/archive", icon: FileClock, label: "Archive" },
    // { href: "/profile", icon: UserRoundCog },
    ...(hasBillingAccess ? [{ href: "/billing", icon: CreditCard, label: "Billing" }] : []),
  ];

  const navBorder = pathname === "/" ? "" : "border-b border-border";

  return (
    <nav className={`px-6 md:px-10 py-4 flex items-center justify-between ${navBorder}`}>
      {/* Left - App Logo */}
      <div className="text-2xl font-bold tracking-wide">
        <Link href="/" className="flex items-center">
          VerDoc<span className="text-cyan-500">.</span>
        </Link>
      </div>

      {/* Center - Navigation Links */}
      <ul className="flex gap-4 md:gap-6 px-4 md:px-5 py-2 rounded-xl border border-border">
        {navItems.map(({ href, icon: Icon, label }) => (
          <li key={href}>
            <Tooltip label={label}>
              <Link
                href={href}
                aria-label={label}
                className={`flex items-center group transition-colors ${
                  pathname === href
                    ? "text-cyan-500 dark:text-cyan-400 font-bold"
                    : "text-muted-foreground hover:text-foreground dark:hover:text-foreground"
                }`}
              >
                <Icon
                  className="h-6 w-6 md:h-7 md:w-7 text-current group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors duration-300"
                  strokeWidth={0.9}
                  aria-hidden="true"
                />
                <span className="sr-only">{label}</span>
              </Link>
            </Tooltip>
          </li>
        ))}
      </ul>
      {/* Right side group */}
      <div className="flex items-center gap-3">
        {userLoading ? (
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
        ) : user ? (
          <>
            <UserProfile />
            <Suspense fallback={<div className="h-9 w-9 rounded-full bg-muted" />}>
              <ThemeToggle />
            </Suspense>
          </>
        ) : (
          <>
            <Link
              href="/signin"
              className="px-4 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              Sign In
            </Link>
            <ThemeToggle />
          </>
        )}
      </div>
    </nav>
  );
}

