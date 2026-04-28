"use client"

import * as React from "react"
import Link from "next/link"

import { Button } from "@/registry/new-york-v4/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/new-york-v4/ui/card"

import { CategoryResultsGrid } from "@/app/(app)/categories/category-results-grid"

import {
  clearCurrentUserWatchlist,
  getCurrentUserRole,
  loadCurrentUserWatchlist,
  type UserRole,
  type WatchlistEntry,
} from "@/lib/user-storage"

export function WatchlistClient() {
  const [items, setItems] = React.useState<WatchlistEntry[]>([])
  const [userRole, setUserRole] = React.useState<UserRole>("anonymous")

  React.useEffect(() => {
    const syncWatchlistState = () => {
      const role = getCurrentUserRole()
      setUserRole(role)
      setItems(role === "regular" ? loadCurrentUserWatchlist() : [])
    }

    syncWatchlistState()
    window.addEventListener("storage", syncWatchlistState)
    window.addEventListener("auth-changed", syncWatchlistState)

    return () => {
      window.removeEventListener("storage", syncWatchlistState)
      window.removeEventListener("auth-changed", syncWatchlistState)
    }
  }, [])

  const sortedItems = React.useMemo(
    () =>
      [...items].sort((a, b) => {
        const aTime = new Date(a.addedAt).getTime()
        const bTime = new Date(b.addedAt).getTime()
        return bTime - aTime
      }),
    [items]
  )

  function clearWatchlist() {
    if (!clearCurrentUserWatchlist()) {
      return
    }

    setItems([])
  }

  if (userRole === "anonymous" || userRole === "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Watchlist is for regular users</CardTitle>
          <CardDescription>
            Sign in with a regular account to use your personal watchlist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!sortedItems.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No titles in your watchlist</CardTitle>
          <CardDescription>Open a movie or show details and add it to your watchlist.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {sortedItems.length} saved title{sortedItems.length === 1 ? "" : "s"}
        </p>
        <Button variant="outline" onClick={clearWatchlist}>
          Clear Watchlist
        </Button>
      </div>

      <CategoryResultsGrid
        items={sortedItems.map((item) => ({
          id: item.id,
          title: item.title,
          year: item.year,
          poster: item.poster,
        }))}
      />
    </div>
  )
}
