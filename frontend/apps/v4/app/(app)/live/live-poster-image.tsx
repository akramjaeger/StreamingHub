"use client"

import * as React from "react"

export function LivePosterImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  const [hasError, setHasError] = React.useState(false)
  const showFallback = !src || hasError

  if (showFallback) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center bg-muted text-sm text-muted-foreground">
        No Poster
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className || "aspect-[16/9] w-full object-cover"}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  )
}
