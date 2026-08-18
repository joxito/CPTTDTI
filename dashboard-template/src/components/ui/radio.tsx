import * as React from "react"

import { cn } from "@/lib/utils"

function Radio({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="radio"
      data-slot="radio"
      className={cn(
        "size-4 shrink-0 border border-input shadow-xs outline-none accent-primary transition-shadow focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Radio }
