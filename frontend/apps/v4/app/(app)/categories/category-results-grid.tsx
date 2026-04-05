"use client"

import * as React from "react"

import { Badge } from "@/registry/new-york-v4/ui/badge"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Card, CardContent } from "@/registry/new-york-v4/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/registry/new-york-v4/ui/dialog"

type CategoryResultItem = {
  id: string
  title: string
  year: string
  poster: string
}

type CategoryDetails = {
  id: string
  title: string
  year: string
  poster: string
  overview: string
  tags: string[]
  duration: string
  details: Array<{ label: string; value: string }>
  cast: string[]
  watchProviders: Array<{ name: string; logo: string; type: "stream" | "rent" | "buy" }>
  trailerUrl: string
  similarTitles: Array<{ id: string; title: string; year: string; poster: string }>
}

type WatchlistItem = CategoryResultItem & { addedAt: string }

const WATCHLIST_STORAGE_KEY = "streamhub_watchlist"

function normalizeEmail(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

function getCurrentUserWatchlistKey() {
  try {
    const raw = localStorage.getItem("auth_user")
    if (!raw) {
      return WATCHLIST_STORAGE_KEY
    }

    const parsed = JSON.parse(raw) as { email?: string | null }
    const email = normalizeEmail(parsed?.email)
    if (!email) {
      return WATCHLIST_STORAGE_KEY
    }

    return `${WATCHLIST_STORAGE_KEY}:${email}`
  } catch {
    return WATCHLIST_STORAGE_KEY
  }
}

function CategoryPosterCard({
  item,
  onOpen,
}: {
  item: CategoryResultItem
  onOpen: (item: CategoryResultItem) => void
}) {
  const [hasImageError, setHasImageError] = React.useState(false)
  const image = item.poster
  const showFallback = !image || hasImageError

  return (
    <Card className="overflow-hidden border-muted/80 transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <button
          type="button"
          className="w-full cursor-pointer text-left"
          onClick={() => onOpen(item)}
          aria-label={`Open details for ${item.title}`}
        >
          {showFallback ? (
            <div className="flex aspect-[2/3] w-full items-center justify-center bg-muted text-sm text-muted-foreground">
              No Poster
            </div>
          ) : (
            <img
              src={image}
              alt={item.title}
              loading="lazy"
              className="aspect-[2/3] w-full object-cover"
              onError={() => setHasImageError(true)}
            />
          )}
          <div className="space-y-1 p-3">
            <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.year || "Unknown year"}</p>
          </div>
        </button>
      </CardContent>
    </Card>
  )
}

export function CategoryResultsGrid({ items }: { items: CategoryResultItem[] }) {
  const [selected, setSelected] = React.useState<CategoryResultItem | null>(null)
  const [details, setDetails] = React.useState<CategoryDetails | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false)
  const [detailsError, setDetailsError] = React.useState("")
  const [watchlistIds, setWatchlistIds] = React.useState<string[]>([])
  const [watchlistMessage, setWatchlistMessage] = React.useState("")
  const [watchlistStorageKey, setWatchlistStorageKey] = React.useState(WATCHLIST_STORAGE_KEY)

  React.useEffect(() => {
    setWatchlistStorageKey(getCurrentUserWatchlistKey())
  }, [])

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(watchlistStorageKey)
      const legacyRaw =
        watchlistStorageKey === WATCHLIST_STORAGE_KEY ? null : localStorage.getItem(WATCHLIST_STORAGE_KEY)

      const source = raw || legacyRaw
      if (!source) {
        setWatchlistIds([])
        return
      }

      const parsed = JSON.parse(source) as WatchlistItem[]
      if (!Array.isArray(parsed)) {
        setWatchlistIds([])
        return
      }

      setWatchlistIds(parsed.map((entry) => entry.id))
    } catch {
      setWatchlistIds([])
    }
  }, [watchlistStorageKey])

  async function openDetails(item: CategoryResultItem) {
    setSelected(item)
    setDetails(null)
    setDetailsError("")
    setIsLoadingDetails(true)

    try {
      const params = new URLSearchParams({
        id: item.id,
        title: item.title,
        year: item.year,
        poster: item.poster,
      })

      const response = await fetch(`/api/title-details?${params.toString()}`)
      const data = (await response.json()) as { message?: string; details?: CategoryDetails }

      if (!response.ok || !data.details) {
        throw new Error(data.message || "Could not load title details")
      }

      setDetails(data.details)
    } catch (error) {
      setDetailsError(error instanceof Error ? error.message : "Could not load title details")
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const current = details ||
    (selected
      ? {
          id: selected.id,
          title: selected.title,
          year: selected.year,
          poster: selected.poster,
          overview: "",
          tags: [],
          duration: "Unknown",
          details: [],
          cast: [],
          watchProviders: [],
          trailerUrl: "",
          similarTitles: [],
        }
      : null)
  const isInWatchlist = Boolean(current && watchlistIds.includes(current.id))
  const streamProviders = (current?.watchProviders || []).filter((provider) => provider.type === "stream")
  const rentProviders = (current?.watchProviders || []).filter((provider) => provider.type === "rent")
  const buyProviders = (current?.watchProviders || []).filter((provider) => provider.type === "buy")

  function addToWatchlist() {
    if (!current) {
      return
    }

    try {
      const raw = localStorage.getItem(watchlistStorageKey)
      const existing = raw ? (JSON.parse(raw) as WatchlistItem[]) : []
      const safeExisting = Array.isArray(existing) ? existing : []

      if (safeExisting.some((entry) => entry.id === current.id)) {
        setWatchlistMessage("Already in watchlist")
        return
      }

      const next: WatchlistItem[] = [
        {
          id: current.id,
          title: current.title,
          year: current.year,
          poster: current.poster,
          addedAt: new Date().toISOString(),
        },
        ...safeExisting,
      ].slice(0, 300)

      localStorage.setItem(watchlistStorageKey, JSON.stringify(next))
      setWatchlistIds(next.map((entry) => entry.id))
      setWatchlistMessage("Added to watchlist")
    } catch {
      setWatchlistMessage("Could not update watchlist")
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((item) => (
          <CategoryPosterCard key={item.id} item={item} onOpen={openDetails} />
        ))}
      </div>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null)
            setDetails(null)
            setDetailsError("")
            setWatchlistMessage("")
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" showCloseButton>
          {!current ? null : (
            <>
              <DialogHeader>
                <DialogTitle>{current.title}</DialogTitle>
                <DialogDescription>
                  {current.year || "Unknown year"} • Duration: {current.duration}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                <div className="overflow-hidden rounded-md border bg-muted">
                  {current.poster ? (
                    <img
                      src={current.poster}
                      alt={current.title}
                      className="aspect-[2/3] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[2/3] items-center justify-center text-sm text-muted-foreground">No Poster</div>
                  )}
                </div>

                <div className="space-y-4">
                  {isLoadingDetails ? (
                    <p className="text-sm text-muted-foreground">Loading details...</p>
                  ) : null}

                  {detailsError ? <p className="text-sm text-destructive">{detailsError}</p> : null}

                  {current.overview ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">{current.overview}</p>
                  ) : null}

                  {current.tags.length ? (
                    <div className="flex flex-wrap gap-2">
                      {current.tags.slice(0, 8).map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {current.details.length ? (
                    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      {current.details.map((entry) => (
                        <div key={`${entry.label}-${entry.value}`} className="rounded-md border bg-card px-3 py-2">
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{entry.label}</dt>
                          <dd className="mt-1 text-sm font-medium">{entry.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}

                  {current.cast.length ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Leading actors</p>
                      <div className="flex flex-wrap gap-2">
                        {current.cast.slice(0, 8).map((actor) => (
                          <Badge key={actor} variant="outline">
                            {actor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Where to watch</p>
                    <div className="space-y-3">
                      <ProviderRow title="Streaming" providers={streamProviders} />
                      <ProviderRow title="Rent" providers={rentProviders} />
                      <ProviderRow title="Buy" providers={buyProviders} />
                    </div>
                  </div>

                  {watchlistMessage ? <p className="text-xs text-muted-foreground">{watchlistMessage}</p> : null}

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {current.trailerUrl ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={current.trailerUrl} target="_blank" rel="noreferrer">
                          Watch Trailer
                        </a>
                      </Button>
                    ) : null}

                    <Button size="sm" onClick={addToWatchlist} disabled={isInWatchlist}>
                      {isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function ProviderRow({
  title,
  providers,
}: {
  title: string
  providers: Array<{ name: string; logo: string; type: "stream" | "rent" | "buy" }>
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {providers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {providers.map((provider) => (
            <div key={`${provider.type}-${provider.name}`} className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
              {provider.logo ? (
                <img src={provider.logo} alt={provider.name} className="size-4 rounded-xs object-cover" />
              ) : null}
              <span>{provider.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Not available.</p>
      )}
    </div>
  )
}
