"use client"

import * as React from "react"

import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/registry/new-york-v4/ui/badge"
import { Button } from "@/registry/new-york-v4/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/registry/new-york-v4/ui/dialog"
import { Input } from "@/registry/new-york-v4/ui/input"

import { TrailerDialog } from "@/components/trailer-dialog"
import {
  getCurrentUserRole,
  loadCurrentUserWatchlist,
  saveCurrentUserWatchlistItem,
  type UserRole,
} from "@/lib/user-storage"

type SearchResult = {
  id: string
  title: string
  year: string
  type: "movie" | "series"
  poster: string
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

export function NavbarMediaSearch({ className }: { className?: string }) {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const [errorText, setErrorText] = React.useState("")
  const [selectedResult, setSelectedResult] = React.useState<SearchResult | null>(null)
  const [details, setDetails] = React.useState<TitleDetails | null>(null)
  const [detailsError, setDetailsError] = React.useState("")
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false)
  const [watchlistIds, setWatchlistIds] = React.useState<string[]>([])
  const [watchlistMessage, setWatchlistMessage] = React.useState("")
  const [userRole, setUserRole] = React.useState<UserRole>("anonymous")
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  const currentDetails = details
    ? details
    : selectedResult
      ? {
          id: selectedResult.id,
          title: selectedResult.title,
          year: selectedResult.year,
          poster: selectedResult.poster,
          overview: "",
          tags: [],
          duration: "Unknown",
          details: [],
          cast: [],
          watchProviders: [],
          trailerUrl: "",
          similarTitles: [],
        }
      : null

  React.useEffect(() => {
    const syncUserState = () => {
      const role = getCurrentUserRole()
      setUserRole(role)
      setWatchlistIds(role === "regular" ? loadCurrentUserWatchlist().map((entry) => entry.id) : [])
    }

    syncUserState()
    window.addEventListener("storage", syncUserState)
    window.addEventListener("auth-changed", syncUserState)

    return () => {
      window.removeEventListener("storage", syncUserState)
      window.removeEventListener("auth-changed", syncUserState)
    }
  }, [])

  React.useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (!containerRef.current?.contains(target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", onClickOutside)
    return () => {
      document.removeEventListener("mousedown", onClickOutside)
    }
  }, [])

  React.useEffect(() => {
    const trimmedQuery = query.trim()
    if (trimmedQuery.length < 2) {
      setResults([])
      setErrorText("")
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setIsLoading(true)
      setErrorText("")

      try {
        const params = new URLSearchParams({ q: trimmedQuery })
        const response = await fetch(`/api/media-search?${params.toString()}`, {
          signal: controller.signal,
        })
        const data = (await response.json()) as { results?: SearchResult[]; message?: string }

        if (!response.ok) {
          throw new Error(data.message || "Search failed")
        }

        setResults(Array.isArray(data.results) ? data.results : [])
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") {
          return
        }

        setResults([])
        setErrorText(error instanceof Error ? error.message : "Search failed")
      } finally {
        setIsLoading(false)
      }
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [query])

  async function openDetails(result: SearchResult) {
    setSelectedResult(result)
    setDetails(null)
    setDetailsError("")
    setIsLoadingDetails(true)

    try {
      const params = new URLSearchParams({
        id: result.id,
        title: result.title,
        year: result.year,
        poster: result.poster,
      })

      const response = await fetch(`/api/title-details?${params.toString()}`)
      const payload = (await response.json()) as { message?: string; details?: TitleDetails }
      if (!response.ok || !payload.details) {
        throw new Error(payload.message || "Could not load title details")
      }

      setDetails(payload.details)
    } catch (error) {
      setDetailsError(error instanceof Error ? error.message : "Could not load title details")
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const isInWatchlist = Boolean(currentDetails && watchlistIds.includes(currentDetails.id))
  const streamProviders = (currentDetails?.watchProviders || []).filter((provider) => provider.type === "stream")
  const rentProviders = (currentDetails?.watchProviders || []).filter((provider) => provider.type === "rent")
  const buyProviders = (currentDetails?.watchProviders || []).filter((provider) => provider.type === "buy")

  function addToWatchlist() {
    if (!currentDetails || userRole !== "regular") {
      setWatchlistMessage("Sign in with a regular account to use Watchlist")
      return
    }

    if (watchlistIds.includes(currentDetails.id)) {
      setWatchlistMessage("Already in watchlist")
      return
    }

    if (saveCurrentUserWatchlistItem(currentDetails)) {
      setWatchlistIds(loadCurrentUserWatchlist().map((entry) => entry.id))
      setWatchlistMessage("Added to watchlist")
      return
    }

    setWatchlistMessage("Could not update watchlist")
  }

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-md", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search movies and shows"
        className="h-9 pl-9"
        aria-label="Search movies and shows"
      />

      {isOpen && query.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          {isLoading ? <p className="p-3 text-sm text-muted-foreground">Searching...</p> : null}

          {!isLoading && errorText ? <p className="p-3 text-sm text-destructive">{errorText}</p> : null}

          {!isLoading && !errorText && results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No results found</p>
          ) : null}

          {!isLoading && !errorText && results.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                    onClick={() => {
                      setIsOpen(false)
                      void openDetails(result)
                    }}
                  >
                    {result.poster ? (
                      <img src={result.poster} alt={result.title} className="h-12 w-8 rounded-sm object-cover" />
                    ) : (
                      <div className="flex h-12 w-8 items-center justify-center rounded-sm bg-muted text-[10px] text-muted-foreground">
                        N/A
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-medium">{result.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.year || "Unknown year"} • {result.type === "movie" ? "Movie" : "Series"}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <Dialog
        open={Boolean(selectedResult)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedResult(null)
            setDetails(null)
            setDetailsError("")
            setWatchlistMessage("")
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" showCloseButton>
          {!currentDetails ? null : (
            <>
              <DialogHeader>
                <DialogTitle>{currentDetails.title}</DialogTitle>
                <DialogDescription>
                  {currentDetails.year || "Unknown year"} • Duration: {currentDetails.duration}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                <div className="overflow-hidden rounded-md border bg-muted">
                  {currentDetails.poster ? (
                    <img
                      src={currentDetails.poster}
                      alt={currentDetails.title}
                      className="aspect-[2/3] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[2/3] w-full items-center justify-center text-sm text-muted-foreground">
                      No poster
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {isLoadingDetails ? (
                    <p className="text-sm text-muted-foreground">Loading details...</p>
                  ) : null}

                  {detailsError ? <p className="text-sm text-destructive">{detailsError}</p> : null}

                  {currentDetails.overview ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">{currentDetails.overview}</p>
                  ) : null}

                  {currentDetails.tags.length ? (
                    <div className="flex flex-wrap gap-2">
                      {currentDetails.tags.slice(0, 8).map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {currentDetails.details.length ? (
                    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      {currentDetails.details.map((entry) => (
                        <div key={`${entry.label}-${entry.value}`} className="rounded-md border bg-card px-3 py-2">
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{entry.label}</dt>
                          <dd className="mt-1 text-sm font-medium">{entry.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}

                  {currentDetails.cast.length ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Leading actors</p>
                      <div className="flex flex-wrap gap-2">
                        {currentDetails.cast.slice(0, 8).map((actor) => (
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

                    <TrailerDialog
                      title={currentDetails.title}
                      trailerUrl={currentDetails.trailerUrl}
                      historyItem={{
                        id: currentDetails.id,
                        title: currentDetails.title,
                        year: currentDetails.year,
                        poster: currentDetails.poster,
                      }}
                    />

                    {userRole === "regular" ? (
                      <Button size="sm" onClick={addToWatchlist} disabled={isInWatchlist}>
                        {isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
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
