"use client"

import * as React from "react"

import { Button } from "@/registry/new-york-v4/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/new-york-v4/ui/card"

import { CategoryResultsGrid } from "@/app/(app)/categories/category-results-grid"

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

export function WatchlistClient() {
  const [items, setItems] = React.useState<WatchlistItem[]>([])
  const [storageKey, setStorageKey] = React.useState(WATCHLIST_STORAGE_KEY)

  const loadWatchlist = React.useCallback((key: string) => {
    try {
      const raw = localStorage.getItem(key)
      const legacyRaw = key === WATCHLIST_STORAGE_KEY ? null : localStorage.getItem(WATCHLIST_STORAGE_KEY)
      const source = raw || legacyRaw

      if (!source) {
        setItems([])
        return
      }

      const parsed = JSON.parse(source) as WatchlistItem[]
      if (!Array.isArray(parsed)) {
        setItems([])
        return
      }

      const sorted = [...parsed].sort((a, b) => {
        const aTime = new Date(a.addedAt).getTime()
        const bTime = new Date(b.addedAt).getTime()
        return bTime - aTime
      })

      setItems(sorted)
    } catch {
      setItems([])
    }
  }, [])

  React.useEffect(() => {
    const key = getCurrentUserWatchlistKey()
    setStorageKey(key)
    loadWatchlist(key)
  }, [loadWatchlist])

  function clearWatchlist() {
    localStorage.setItem(storageKey, JSON.stringify([]))
    setItems([])
  }

  if (!items.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No titles in your watchlist</CardTitle>
          <CardDescription>
            Open a movie or show details and click Add to Watchlist.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length} saved title{items.length === 1 ? "" : "s"}
        </p>
        <Button variant="outline" onClick={clearWatchlist}>
          Clear Watchlist
        </Button>
      </div>

      <CategoryResultsGrid
        items={items.map((item) => ({
          id: item.id,
          title: item.title,
          year: item.year,
          poster: item.poster,
        }))}
      />
    </div>
  )
}
