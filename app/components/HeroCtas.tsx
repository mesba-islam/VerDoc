"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import useUser from "@/app/hook/useUser";

export function HeroCtas() {
  const { data: user, isLoading } = useUser();

  const primaryHref = user ? "/transcribe" : "/register";
  const primaryLabel = user ? "Go to transcribe" : "Get started";

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Button asChild size="lg" disabled={isLoading}>
        <Link href={primaryHref}>
          {primaryLabel} <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
      <Button asChild size="lg" variant="ghost">
        <Link href="#pricing">View pricing</Link>
      </Button>
    </div>
  );
}
