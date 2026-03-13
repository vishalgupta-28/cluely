import { cn } from "@/lib/utils"

export function LoadingDots({
  className,
  color = "bg-current",
}) {
  return (
    <span className={cn("mx-2 inline-flex items-center", className)}>
      <span className={`${color} size-1.5 rounded-full animate-loader`}></span>
      <span className={`${color} size-1.5 rounded-full animate-loader animation-delay-200`}></span>
      <span className={`${color} size-1.5 rounded-full animate-loader animation-delay-500`}></span>
    </span>
  )
}

