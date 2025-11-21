"use client";
import useUser  from "@/app/hook/useUser";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AudioWaveform, Settings, FileClock } from "lucide-react";
import { Suspense } from "react";
import ThemeToggle from "./ThemeToggle";
import UserProfile from "@/components/supaauth/user-profile";
import { Tooltip } from "@/components/ui/tooltip";

export default function Navbar() {
  const pathname = usePathname(); 
  const { data, isLoading  } = useUser();
  const navItems = [
    { href: "/transcribe", icon: AudioWaveform, label: "Transcribe" },
    { href: "/archive", icon: FileClock, label: "Archive" },
    // { href: "/profile", icon: UserRoundCog },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="px-10 py-5 flex items-center justify-between border-b border-border">
      {/* Left - App Logo */}
      <div className="text-2xl font-bold tracking-wide">
        <Link href="/" className="flex items-center">
          VerDoc<span className="text-cyan-500">.</span>
        </Link>
      </div>

      {/* Center - Navigation Links */}
      <ul className="flex gap-6 px-5 py-2 rounded-xl border border-border">
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
                  className="w-8 h-8 text-current group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors duration-300"
                  strokeWidth={0.75}
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
        {isLoading ? (
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
        ) : data ? (
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
