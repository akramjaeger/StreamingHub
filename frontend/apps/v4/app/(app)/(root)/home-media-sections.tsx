"use client"

import * as React from "react"

import { Badge } from "@/registry/new-york-v4/ui/badge"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Card, CardContent } from "@/registry/new-york-v4/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/registry/new-york-v4/ui/carousel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/registry/new-york-v4/ui/dialog"

type SectionItem = {
  id: number
  title: string
  subtitle: string
  image: string
}

type TitleDetails = {
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

type WatchlistItem = {
  id: string
  title: string
  year: string
  poster: string
  addedAt: string
}

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

export type HomeSectionsData = {
  movies: SectionItem[]
  tvShows: SectionItem[]
  cartoons: SectionItem[]
  actors: SectionItem[]
  posters: SectionItem[]
}

function SectionCardItem({
  item,
  actorStyle,
  posterOnly,
  enableDetails,
  onOpen,
}: {
  item: SectionItem
  actorStyle: boolean
  posterOnly: boolean
  enableDetails: boolean
  onOpen: (item: SectionItem) => void
}) {
  const [hasImageError, setHasImageError] = React.useState(false)
  const showFallback = !item.image || hasImageError

  const cardContent = (
    <>
      {showFallback ? (
        <div
          className={
            actorStyle
              ? "flex aspect-square w-full items-center justify-center bg-muted text-sm font-medium text-muted-foreground"
              : "flex aspect-[2/3] w-full items-center justify-center bg-muted text-sm font-medium text-muted-foreground"
          }
        >
          No Poster
        </div>
      ) : (
        <img
          src={item.image}
          alt={item.title}
          className={
            actorStyle
              ? "aspect-square w-full rounded-none object-cover"
              : "aspect-[2/3] w-full rounded-none object-cover"
          }
          loading="lazy"
          onError={() => setHasImageError(true)}
        />
      )}
      <div className="space-y-1 p-3">
        <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
        {!posterOnly ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">{item.subtitle}</p>
        ) : null}
      </div>
    </>
  )

  return (
    <Card className="overflow-hidden border-muted/80">
      <CardContent className="p-0">
        {enableDetails ? (
          <button type="button" onClick={() => onOpen(item)} className="w-full cursor-pointer text-left">
            {cardContent}
          </button>
        ) : (
          cardContent
        )}
      </CardContent>
    </Card>
  )
}

function SectionCarousel({
  title,
  items,
  actorStyle = false,
  posterOnly = false,
  enableDetails = true,
  onOpen,
}: {
  title: string
  items: SectionItem[]
  actorStyle?: boolean
  posterOnly?: boolean
  enableDetails?: boolean
  onOpen: (item: SectionItem) => void
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <Carousel
        opts={{ align: "start", dragFree: true }}
        className="w-full"
      >
        <CarouselContent>
          {items.map((item) => (
            <CarouselItem
              key={`${title}-${item.id}`}
              className="basis-1/2 sm:basis-1/3 lg:basis-1/5"
            >
              <SectionCardItem
                item={item}
                actorStyle={actorStyle}
                posterOnly={posterOnly}
                enableDetails={enableDetails}
                onOpen={onOpen}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-4 hidden md:inline-flex" />
        <CarouselNext className="-right-4 hidden md:inline-flex" />
      </Carousel>
    </section>
  )
}

export function HomeMediaSections({ sections }: { sections: HomeSectionsData }) {
  const [selectedItem, setSelectedItem] = React.useState<SectionItem | null>(null)
  const [details, setDetails] = React.useState<TitleDetails | null>(null)
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

  async function openDetails(item: SectionItem) {
    setSelectedItem(item)
    setDetails(null)
    setDetailsError("")
    setIsLoadingDetails(true)

    try {
      const yearMatch = String(item.subtitle || "").match(/\b(19|20)\d{2}\b/)
      const year = yearMatch?.[0] || ""
      const params = new URLSearchParams({
        id: `home-${item.id}`,
        title: item.title,
        year,
        poster: item.image,
      })

      const response = await fetch(`/api/title-details?${params.toString()}`)
      const data = (await response.json()) as { message?: string; details?: TitleDetails }

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
    (selectedItem
      ? {
          id: `home-${selectedItem.id}`,
          title: selectedItem.title,
          year: "",
          poster: selectedItem.image,
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
      <div className="space-y-10">
        <SectionCarousel title="Movies" items={sections.movies} onOpen={openDetails} />
        <SectionCarousel title="Series & TV Shows" items={sections.tvShows} onOpen={openDetails} />
        <SectionCarousel title="Cartoons" items={sections.cartoons} onOpen={openDetails} />
        <SectionCarousel title="Actors" items={sections.actors} actorStyle enableDetails={false} onOpen={openDetails} />
        <SectionCarousel title="Posters" items={sections.posters} posterOnly onOpen={openDetails} />
      </div>

      <Dialog
        open={Boolean(selectedItem)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null)
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
                    <Button asChild size="sm" variant="secondary">
                      <a href="/start-plan">Start Plan</a>
                    </Button>

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
