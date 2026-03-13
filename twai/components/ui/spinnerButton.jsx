import React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"



export function SpinnerButton({
  loading = false,
  spinnerClassName,
  loadingText,
  children,
  className,
  disabled,
  variant = "default",
  size = "default",
  ...props
}) {
  return (
    <Button className={cn(className)} disabled={disabled || loading} variant={variant} size={size} {...props}>
      {loading ? (
        <>
          <svg
            className={cn("mr-2 size-4 animate-spin", spinnerClassName)}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </Button>
  )
}

