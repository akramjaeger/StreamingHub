"use client"

import * as React from "react"

import { Button } from "@/registry/new-york-v4/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/registry/new-york-v4/ui/dialog"

import { saveCurrentUserWatchHistoryItem, type MediaIdentity } from "@/lib/user-storage"

function getYoutubeEmbedUrl(trailerUrl: string) {
  const url = trailerUrl.trim()
  if (!url) {
    return ""
  }

  try {
    const parsed = new URL(url)

    const videoId =
      parsed.hostname.includes("youtu.be")
        ? parsed.pathname.replace(/^\//, "").trim()
        : parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop() || ""

    if (videoId) {
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1`
    }

    const searchQuery = parsed.searchParams.get("search_query") || parsed.searchParams.get("q") || ""
    if (searchQuery) {
      return `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(searchQuery)}&rel=0&modestbranding=1`
    }
  } catch {
    // Fall through to query parsing below.
  }

  const queryIndex = url.indexOf("search_query=")
  if (queryIndex >= 0) {
    const rawQuery = url.slice(queryIndex + "search_query=".length)
    const normalizedQuery = rawQuery.split("&")[0].trim()
    if (normalizedQuery) {
      return `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(normalizedQuery)}&rel=0&modestbranding=1`
    }
  }

  return url
}

export function TrailerDialog({
  title,
  trailerUrl,
  historyItem,
  buttonLabel = "Watch Trailer",
}: {
  title: string
  trailerUrl: string
  historyItem?: MediaIdentity
  buttonLabel?: string
}) {
  const [open, setOpen] = React.useState(false)
  const embedUrl = React.useMemo(() => getYoutubeEmbedUrl(trailerUrl), [trailerUrl])

  function handleOpenTrailer() {
    if (historyItem) {
      saveCurrentUserWatchHistoryItem(historyItem)
    }

    setOpen(true)
  }

  if (!trailerUrl) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={handleOpenTrailer}>
        {buttonLabel}
      </Button>

      <DialogContent className="max-w-5xl overflow-hidden p-0 sm:max-w-5xl">
        <div className="space-y-4 p-6">
          <DialogHeader>
            <DialogTitle>{title} trailer</DialogTitle>
            <DialogDescription>Watch the trailer without leaving the app.</DialogDescription>
          </DialogHeader>
          {embedUrl ? (
            <div className="overflow-hidden rounded-xl border bg-black">
              <iframe
                title={`${title} trailer`}
                src={embedUrl}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border bg-muted px-6 text-center text-sm text-muted-foreground">
              Trailer playback is unavailable for this title.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
