"use client"

import * as React from "react"
import Link from "next/link"

import { Button } from "@/registry/new-york-v4/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/new-york-v4/ui/card"

import {
  clearCurrentUserWatchHistory,
  getCurrentUserRole,
  loadCurrentUserWatchHistory,
  type UserRole,
  type WatchHistoryEntry,
} from "@/lib/user-storage"

function formatWatchedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Recently watched"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function HistoryCard({ item }: { item: WatchHistoryEntry }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid gap-0 sm:grid-cols-[120px_1fr]">
          <div className="overflow-hidden bg-muted">
            {item.poster ? (
              <img src={item.poster} alt={item.title} className="aspect-[2/3] h-full w-full object-cover" />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center text-xs text-muted-foreground">
                No poster
              </div>
            )}
          </div>
          <div className="space-y-2 p-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold leading-tight">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.year || "Unknown year"}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Watched {formatWatchedAt(item.watchedAt)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function WatchHistoryClient() {
  const [items, setItems] = React.useState<WatchHistoryEntry[]>([])
  const [userRole, setUserRole] = React.useState<UserRole>("anonymous")

  React.useEffect(() => {
    const syncHistoryState = () => {
      const role = getCurrentUserRole()
      setUserRole(role)
      setItems(role === "regular" ? loadCurrentUserWatchHistory() : [])
    }

    syncHistoryState()
    window.addEventListener("storage", syncHistoryState)
    window.addEventListener("auth-changed", syncHistoryState)

    return () => {
      window.removeEventListener("storage", syncHistoryState)
      window.removeEventListener("auth-changed", syncHistoryState)
    }
  }, [])

  const sortedItems = React.useMemo(
    () =>
      [...items].sort((a, b) => {
        const aTime = new Date(a.watchedAt).getTime()
        const bTime = new Date(b.watchedAt).getTime()
        return bTime - aTime
      }),
    [items]
  )

  function clearHistory() {
    if (!clearCurrentUserWatchHistory()) {
      return
    }

    setItems([])
  }

  if (userRole === "anonymous" || userRole === "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Watch history is for regular users</CardTitle>
          <CardDescription>
            Sign in with a regular account to see the titles you watched.
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
          <CardTitle>No watch history yet</CardTitle>
          <CardDescription>
            Press Watch Trailer on a title and it will appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {sortedItems.length} watched title{sortedItems.length === 1 ? "" : "s"}
        </p>
        <Button variant="outline" onClick={clearHistory}>
          Clear History
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedItems.map((item) => (
          <HistoryCard key={`${item.id}-${item.watchedAt}`} item={item} />
        ))}
      </div>
    </div>
  )
}