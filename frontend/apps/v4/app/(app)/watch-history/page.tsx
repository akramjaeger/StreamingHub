import { type Metadata } from "next"

import { WatchHistoryClient } from "./watch-history-client"

export const metadata: Metadata = {
  title: "Watch History",
  description: "The movies and shows you have watched.",
}

export default function WatchHistoryPage() {
  return (
    <div className="container mx-auto flex flex-1 flex-col gap-6 px-4 py-10 md:py-14">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Watch History</h1>
        <p className="mt-2 text-muted-foreground">See the titles you opened through Watch Trailer on this account.</p>
      </section>

      <WatchHistoryClient />
    </div>
  )
}