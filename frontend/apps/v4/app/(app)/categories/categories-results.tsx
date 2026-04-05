"use client"

import * as React from "react"

import { Button } from "@/registry/new-york-v4/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/new-york-v4/ui/card"

import { CategoryResultsGrid } from "./category-results-grid"

type CategoryResultItem = {
  id: string
  title: string
  year: string
  poster: string
}

type CategoriesApiResponse = {
  items: CategoryResultItem[]
  page: number
  pageSize: number
  hasMore: boolean
  totalLoaded: number
}

export function CategoriesResults({
  selectedSlugs,
  selectedLabels,
  hasAnyProviderConfigured,
}: {
  selectedSlugs: string[]
  selectedLabels: string[]
  hasAnyProviderConfigured: boolean
}) {
  const [items, setItems] = React.useState<CategoryResultItem[]>([])
  const [page, setPage] = React.useState(0)
  const [hasMore, setHasMore] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [totalLoaded, setTotalLoaded] = React.useState(0)
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null)
  const isFetchingRef = React.useRef(false)
  const lastInitKeyRef = React.useRef("")

  const selectedKey = React.useMemo(() => selectedSlugs.slice().sort().join("|"), [selectedSlugs])

  const loadPage = React.useCallback(
    async (nextPage: number, replace = false) => {
      if (isFetchingRef.current || !hasAnyProviderConfigured || selectedSlugs.length === 0) {
        return
      }

      isFetchingRef.current = true
      setIsLoading(true)
      setError("")

      try {
        const params = new URLSearchParams()
        params.set("page", String(nextPage))
        params.set("pageSize", "24")
        for (const slug of selectedSlugs) {
          params.append("cat", slug)
        }

        const response = await fetch(`/api/categories?${params.toString()}`)
        if (!response.ok) {
          throw new Error("Failed to load categories")
        }

        const data = (await response.json()) as CategoriesApiResponse
        setPage(nextPage)
        setHasMore(data.hasMore)
        setTotalLoaded(data.totalLoaded)
        setItems((previous) => {
          const map = new Map((replace ? [] : previous).map((item) => [item.id, item]))
          for (const item of data.items) {
            map.set(item.id, item)
          }
          return Array.from(map.values())
        })
      } catch {
        setError("Could not load more results. Please try again.")
      } finally {
        isFetchingRef.current = false
        setIsLoading(false)
      }
    },
    [hasAnyProviderConfigured, selectedSlugs]
  )

  React.useEffect(() => {
    if (lastInitKeyRef.current === selectedKey) {
      return
    }

    lastInitKeyRef.current = selectedKey
    setItems([])
    setPage(0)
    setHasMore(false)
    setError("")
    setTotalLoaded(0)

    if (hasAnyProviderConfigured && selectedSlugs.length > 0) {
      void loadPage(1, true)
    }
  }, [selectedKey, hasAnyProviderConfigured, loadPage, selectedSlugs.length])

  React.useEffect(() => {
    if (!hasMore || isLoading || !loadMoreRef.current) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first?.isIntersecting) {
          void loadPage(page + 1)
        }
      },
      { rootMargin: "400px" }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoading, loadPage, page])

  if (selectedSlugs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select at least one category</CardTitle>
          <CardDescription>Select one or more categories to find titles.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold">Matching all selected categories</h3>
        <p className="text-sm text-muted-foreground">Active filters: {selectedLabels.join(", ")}</p>
        {items.length > 0 ? (
          <p className="text-xs text-muted-foreground">Loaded {items.length} items ({totalLoaded} matched so far)</p>
        ) : null}
      </div>

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {isLoading && items.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">Loading results...</CardContent>
        </Card>
      ) : null}

      {!isLoading && items.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No movies or shows currently match all selected categories. Try removing one filter.
          </CardContent>
        </Card>
      ) : null}

      {items.length > 0 ? <CategoryResultsGrid items={items} /> : null}

      {hasMore ? (
        <div className="flex flex-col items-center gap-3 py-2">
          <div ref={loadMoreRef} className="h-1 w-full" />
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadPage(page + 1)}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
