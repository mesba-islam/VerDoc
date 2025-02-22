"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { AudioWaveform, UserRoundCog, Settings, FileClock } from "lucide-react";
import { Suspense } from "react";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const pathname = usePathname(); 

  const navItems = [
    { href: "/transcribe", icon: AudioWaveform },
    { href: "/history", icon: FileClock },
    { href: "/profile", icon: UserRoundCog },
    { href: "/settings", icon: Settings },
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
        {navItems.map(({ href, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={`flex items-center group transition-colors ${
                pathname === href ? "text-cyan-500 font-bold" : "text-gray-700"
              }`}
            >
              <Icon className="w-8 h-8 group-hover:text-cyan-500 transition-colors duration-300" strokeWidth={0.75} />
            </Link>
          </li>
        ))}
      </ul>

      {/* Right - Theme Toggle */}
      <Suspense fallback={<div>Loading...</div>}>
        <ThemeToggle />
      </Suspense>
    </nav>
  );
}
