"use client";

import { cn } from "@/lib/utils";

/**
 * Aceternity-style spotlight, used only behind the hero so it can never
 * compete with the data (PRD 9.2). Pure SVG + CSS: no runtime dependency.
 */
export function Spotlight({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cn(
        "pointer-events-none absolute -top-40 left-0 z-0 h-[169%] w-[138%] opacity-0 lg:w-[84%]",
        "animate-in fade-in duration-[2400ms] fill-mode-forwards [animation-delay:200ms]",
        "motion-reduce:animate-none motion-reduce:opacity-60",
        className,
      )}
      style={{ opacity: 0.55 }}
      viewBox="0 0 3787 2842"
      fill="none"
    >
      <g filter="url(#spotlight-blur)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill="var(--accent-positive)"
          fillOpacity="0.16"
        />
      </g>
      <defs>
        <filter
          id="spotlight-blur"
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur" />
        </filter>
      </defs>
    </svg>
  );
}
