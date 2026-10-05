import { cn } from "@/lib/utils"

/** Hexagonal sun/bolt mark used in the sidebar and empty states. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-8", className)} aria-hidden>
      <defs>
        <linearGradient id="bm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--solar)" />
          <stop offset="1" stopColor="var(--battery)" />
        </linearGradient>
      </defs>
      <path
        d="M20 2.5 35.2 11.25v17.5L20 37.5 4.8 28.75v-17.5Z"
        fill="none"
        stroke="url(#bm-g)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M22.5 9 13.5 22h6l-2 9 9-13h-6Z" fill="url(#bm-g)" />
    </svg>
  )
}
