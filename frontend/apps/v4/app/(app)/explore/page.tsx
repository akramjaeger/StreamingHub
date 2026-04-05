import Link from "next/link"
import { type Metadata } from "next"

import { Badge } from "@/registry/new-york-v4/ui/badge"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/new-york-v4/ui/card"

export const metadata: Metadata = {
  title: "Explore",
  description: "Discover collections, live channels, and category jumps in one place.",
}

const quickLaunch = [
  { label: "Action + Thriller", href: "/categories?cat=action&cat=thriller" },
  { label: "Family + Animation", href: "/categories?cat=family&cat=animation" },
  { label: "Crime + Drama", href: "/categories?cat=crime&cat=drama" },
  { label: "Anime", href: "/categories?cat=anime" },
]

const discoverLanes = [
  {
    title: "Category Lab",
    text: "Blend multiple categories and surface matching titles with infinite loading.",
    href: "/categories",
    cta: "Open Categories",
    tone: "from-[#f4efe6] via-[#efe1c7] to-[#eac99a]",
  },
  {
    title: "Live Pulse",
    text: "Track sports and news feeds in one live board with source-level cards.",
    href: "/live",
    cta: "Open Live",
    tone: "from-[#dff4ee] via-[#c8ecd4] to-[#9edba9]",
  },
  {
    title: "Home Spotlight",
    text: "Jump back to rotating sections with randomized picks on every refresh.",
    href: "/",
    cta: "Open Home",
    tone: "from-[#efe7ff] via-[#ddd3ff] to-[#c0b0ff]",
  },
]

const signalCards = [
  { value: "5", label: "Curated rails", note: "Movies, TV, cartoons, actors, posters" },
  { value: "2", label: "Live boards", note: "Sports and news with resilient fallbacks" },
  { value: "24+", label: "Results per wave", note: "Scroll to keep loading more matches" },
  { value: "AND", label: "Multi-category logic", note: "Every result must satisfy all filters" },
]

export default function ExplorePage() {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_10%_0%,#ffe7a8_0%,transparent_45%),radial-gradient(60%_50%_at_90%_10%,#b9f0df_0%,transparent_52%),linear-gradient(180deg,#fffefb_0%,#ffffff 42%,#f6f7f9_100%)]" />

      <div className="container mx-auto flex flex-1 flex-col gap-10 px-4 py-10 md:gap-14 md:py-14">
        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div className="space-y-4">
            <Badge className="rounded-full bg-[#141414] px-3 py-1 text-[11px] tracking-[0.2em] uppercase text-white hover:bg-[#141414]">
              Discovery Deck
            </Badge>
            <h1 className="max-w-3xl text-4xl leading-[0.95] font-semibold tracking-tight md:text-6xl">
              Explore faster.
              <br />
              Find better.
              <br />
              Watch smarter.
            </h1>
            <p className="max-w-2xl text-base text-zinc-700 md:text-lg">
              Your control room for category combos, live channels, and instant jumps across the app.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="rounded-full px-6">
                <Link href="/categories">Start With Categories</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full border-white bg-black px-6 text-white hover:bg-zinc-900">
                <Link href="/live">Open Live Board</Link>
              </Button>
            </div>
          </div>

          <Card className="border-white/80 bg-black text-white shadow-sm backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Launch</CardTitle>
              <CardDescription className="text-zinc-300">One tap presets</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {quickLaunch.map((item) => (
                <Button key={item.href} asChild variant="secondary" className="justify-start rounded-xl border border-white/60 bg-black text-white hover:bg-zinc-900">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {signalCards.map((card) => (
            <Card key={card.label} className="border-white/80 bg-black text-white shadow-sm">
              <CardHeader className="pb-1">
                <CardDescription className="text-zinc-300">{card.label}</CardDescription>
                <CardTitle className="text-3xl">{card.value}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-zinc-300">{card.note}</CardContent>
            </Card>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Discover Lanes</h2>
            <Badge variant="outline" className="border-white bg-black text-white">Custom Experience</Badge>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {discoverLanes.map((lane) => (
              <Card key={lane.title} className="group overflow-hidden border-white/80 bg-black text-white shadow-sm transition-transform duration-300 hover:-translate-y-1">
                <div className={`h-2 w-full bg-gradient-to-r ${lane.tone}`} />
                <CardHeader>
                  <CardTitle>{lane.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed text-zinc-300">{lane.text}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full rounded-xl border-white bg-black text-white group-hover:bg-zinc-900">
                    <Link href={lane.href}>{lane.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/80 bg-black p-6 text-white shadow-sm md:p-8">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold">Pro tip</h3>
              <p className="max-w-2xl text-sm text-zinc-300 md:text-base">
                Use two or three categories at once for cleaner discovery. If a combination is too strict,
                remove one filter and continue scrolling for deeper results.
              </p>
            </div>
            <Button asChild size="lg" className="rounded-full px-7">
              <Link href="/categories?cat=action&cat=drama">Try A Combo</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
