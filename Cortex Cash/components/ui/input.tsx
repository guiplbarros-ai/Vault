import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground bg-muted border-border h-10 w-full min-w-0 rounded-[10px] border text-foreground px-3 py-2 text-base transition-[border-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-primary focus-visible:shadow-[0_0_0_2px_rgba(58,143,110,0.15)]",
        "aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_2px_rgba(240,113,103,0.15)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
