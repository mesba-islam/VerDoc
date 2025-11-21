"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TooltipSide = "top" | "bottom" | "left" | "right";

const sideClassMap: Record<TooltipSide, string> = {
  top: "-translate-x-1/2 bottom-full -mb-3 origin-bottom group-data-[focused=true]:translate-y-0 group-hover:translate-y-0 translate-y-1",
  bottom: "-translate-x-1/2 top-full mt-3 origin-top group-data-[focused=true]:translate-y-0 group-hover:translate-y-0 -translate-y-1",
  left: "right-full -mr-3 -translate-y-1/2 origin-right group-data-[focused=true]:translate-x-0 group-hover:translate-x-0 translate-x-1",
  right: "left-full ml-3 -translate-y-1/2 origin-left group-data-[focused=true]:translate-x-0 group-hover:translate-x-0 -translate-x-1",
};

const arrowPlacementMap: Record<TooltipSide, string> = {
  top: "top-full left-1/2 -translate-x-1/2",
  bottom: "bottom-full left-1/2 -translate-x-1/2",
  left: "left-full top-1/2 -translate-y-1/2",
  right: "right-full top-1/2 -translate-y-1/2",
};

interface TooltipProps {
  label: React.ReactNode;
  children: React.ReactElement;
  className?: string;
  contentClassName?: string;
  side?: TooltipSide;
}

export function Tooltip({ label, children, className, contentClassName, side = "bottom" }: TooltipProps) {
  return (
    <span
      className={cn("group relative inline-flex", className)}
      data-focused="false"
      onFocus={(event: React.FocusEvent<HTMLSpanElement>) => {
        event.currentTarget.setAttribute("data-focused", "true");
      }}
      onBlur={(event: React.FocusEvent<HTMLSpanElement>) => {
        event.currentTarget.setAttribute("data-focused", "false");
      }}
      onMouseLeave={(event: React.MouseEvent<HTMLSpanElement>) => {
        event.currentTarget.setAttribute("data-focused", "false");
      }}
    >
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 flex w-max max-w-xs select-none items-center justify-center rounded-md border border-border/60 bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground opacity-0 shadow-lg shadow-black/10 backdrop-blur-sm transition-all duration-200 ease-out group-hover:opacity-100 group-data-[focused=true]:opacity-100",
          sideClassMap[side],
          contentClassName,
        )}
      >
        {label}
        <span
          className={cn(
            "pointer-events-none absolute h-2 w-2 rotate-45 border border-border/60 bg-popover",
            arrowPlacementMap[side],
          )}
        />
      </span>
    </span>
  );
}
