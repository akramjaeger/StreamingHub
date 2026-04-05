import { type Metadata } from "next"

import { WatchlistClient } from "./watchlist-client"

export const metadata: Metadata = {
  title: "Watchlist",
  description: "Your saved movies and shows.",
}

export default function WatchlistPage() {
  return (
    <div className="container mx-auto flex flex-1 flex-col gap-6 px-4 py-10 md:py-14">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Watchlist</h1>
        <p className="mt-2 text-muted-foreground">See all movies and shows saved for this account.</p>
      </section>

      <WatchlistClient />
    </div>
  )
}
