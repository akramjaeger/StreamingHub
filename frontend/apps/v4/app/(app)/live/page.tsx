import Link from "next/link"
import { type Metadata } from "next"

import { Badge } from "@/registry/new-york-v4/ui/badge"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/new-york-v4/ui/card"

import { LivePosterImage } from "./live-poster-image"

export const revalidate = 120

export const metadata: Metadata = {
  title: "Live: Sports & News",
  description: "Live sports updates and fresh news from multiple providers.",
}

type NewsItem = {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
  image: string
  provider: string
}

type SportsItem = {
  id: string
  match: string
  league: string
  status: string
  score: string
  kickoff: string
  watchUrl: string
  provider: string
}

function toISO(value?: string | null) {
  if (!value) {
    return ""
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString()
}

function formatTime(value: string) {
  if (!value) {
    return ""
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function compactStatus(status: string) {
  const normalized = status.trim().toLowerCase()
  if (!normalized) {
    return "Unknown"
  }

  if (normalized.includes("live") || normalized === "1h" || normalized === "2h" || normalized === "ht") {
    return "Live"
  }

  if (normalized.includes("finished") || normalized === "ft") {
    return "Finished"
  }

  if (normalized.includes("not started") || normalized.includes("scheduled") || normalized === "ns") {
    return "Scheduled"
  }

  return status
}

function youtubeLiveSearchUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} live`)}`
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  try {
    const response = await fetch(url, {
      ...init,
      next: { revalidate },
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as T
  } catch {
    return null
  }
}

async function fetchGnewsItems() {
  const key = process.env.GNEWS_API_KEY
  if (!key) {
    return [] as NewsItem[]
  }

  const data = await fetchJson<{
    articles?: Array<{ title?: string; url?: string; image?: string; publishedAt?: string; source?: { name?: string } }>
  }>(`https://gnews.io/api/v4/top-headlines?lang=en&max=12&token=${key}`)

  return (data?.articles || [])
    .filter((article) => Boolean(article?.title && article?.url))
    .map((article, index) => ({
      id: `gnews-${index}-${article.url}`,
      title: article.title || "Untitled",
      source: article.source?.name || "GNews source",
      url: article.url || "",
      publishedAt: toISO(article.publishedAt),
      image: article.image || "",
      provider: "GNews",
    }))
}

async function fetchCurrentsItems() {
  const key = process.env.CURRENTS_API_KEY
  if (!key) {
    return [] as NewsItem[]
  }

  const data = await fetchJson<{
    news?: Array<{ title?: string; url?: string; image?: string; published?: string; author?: string }>
  }>(`https://api.currentsapi.services/v1/latest-news?language=en&apiKey=${encodeURIComponent(key)}`, {
    headers: {
      Authorization: key,
      "X-Api-Key": key,
    },
  })

  return (data?.news || [])
    .filter((article) => Boolean(article?.title && article?.url))
    .map((article, index) => ({
      id: `currents-${index}-${article.url}`,
      title: article.title || "Untitled",
      source: article.author || "Currents source",
      url: article.url || "",
      publishedAt: toISO(article.published),
      image: article.image || "",
      provider: "Currents",
    }))
}

async function fetchMediastackItems() {
  const key = process.env.MEDIASTACK_API_KEY
  if (!key) {
    return [] as NewsItem[]
  }

  const data = await fetchJson<{
    data?: Array<{ title?: string; url?: string; image?: string; published_at?: string; source?: string }>
  }>(`http://api.mediastack.com/v1/news?access_key=${key}&languages=en&limit=12`)

  return (data?.data || [])
    .filter((article) => Boolean(article?.title && article?.url))
    .map((article, index) => ({
      id: `mediastack-${index}-${article.url}`,
      title: article.title || "Untitled",
      source: article.source || "Mediastack source",
      url: article.url || "",
      publishedAt: toISO(article.published_at),
      image: article.image || "",
      provider: "Mediastack",
    }))
}

function dedupeNews(items: NewsItem[]) {
  const map = new Map<string, NewsItem>()

  for (const item of items) {
    const key = `${item.title.toLowerCase()}|${item.source.toLowerCase()}`
    if (!map.has(key)) {
      map.set(key, item)
    }
  }

  return Array.from(map.values())
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, 36)
}

async function fetchSportdataItems() {
  const key = process.env.SPORTDATAAPI_KEY
  if (!key) {
    return [] as SportsItem[]
  }

  const data = await fetchJson<{
    data?: Array<{
      match_id?: number
      status?: string
      match_start?: string
      home_team?: { name?: string }
      away_team?: { name?: string }
      league?: { name?: string }
      stats?: { home_score?: number; away_score?: number }
    }>
  }>(`https://app.sportdataapi.com/api/v1/soccer/matches?apikey=${key}&live=true`)

  return (data?.data || [])
    .filter((match) => Boolean(match?.home_team?.name && match?.away_team?.name))
    .map((match, index) => {
      const home = match.home_team?.name || "Home"
      const away = match.away_team?.name || "Away"
      const matchName = `${home} vs ${away}`

      return {
        id: `sportdata-${match.match_id || index}`,
        match: matchName,
        league: match.league?.name || "Sportdata league",
        status: compactStatus(match.status || ""),
        score: `${match.stats?.home_score ?? "-"} : ${match.stats?.away_score ?? "-"}`,
        kickoff: toISO(match.match_start),
        watchUrl: youtubeLiveSearchUrl(matchName),
        provider: "SportdataAPI",
      }
    })
}

async function fetchTheSportsDbItems() {
  const key = process.env.THESPORTSDB_KEY || "3"
  const today = new Date().toISOString().slice(0, 10)

  const [livescoreData, latestData, dailyData] = await Promise.all([
    fetchJson<{
      events?: Array<{
        idEvent?: string
        strEvent?: string
        strLeague?: string
        intHomeScore?: string
        intAwayScore?: string
        dateEvent?: string
        strTime?: string
        strStatus?: string
      }>
    }>(`https://www.thesportsdb.com/api/v1/json/${key}/livescore.php?s=Soccer`),
    fetchJson<{
      events?: Array<{
        idEvent?: string
        strEvent?: string
        strLeague?: string
        intHomeScore?: string
        intAwayScore?: string
        dateEvent?: string
        strTime?: string
        strStatus?: string
      }>
    }>(`https://www.thesportsdb.com/api/v1/json/${key}/latestsoccer.php`),
    fetchJson<{
      events?: Array<{
        idEvent?: string
        strEvent?: string
        strLeague?: string
        intHomeScore?: string
        intAwayScore?: string
        dateEvent?: string
        strTime?: string
        strStatus?: string
      }>
    }>(`https://www.thesportsdb.com/api/v1/json/${key}/eventsday.php?d=${today}&s=Soccer`),
  ])

  const events = [
    ...(livescoreData?.events || []),
    ...(latestData?.events || []),
    ...(dailyData?.events || []),
  ]

  return events
    .filter((event) => Boolean(event?.strEvent))
    .slice(0, 20)
    .map((event, index) => ({
      id: `thesportsdb-${event.idEvent || index}`,
      match: event.strEvent || "Match",
      league: event.strLeague || "TheSportsDB league",
      status: compactStatus(event.strStatus || "Recent"),
      score: `${event.intHomeScore ?? "-"} : ${event.intAwayScore ?? "-"}`,
      kickoff: toISO(`${event.dateEvent || ""} ${event.strTime || ""}`.trim()),
      watchUrl: youtubeLiveSearchUrl(event.strEvent || "soccer live"),
      provider: "TheSportsDB",
    }))
}

function dedupeSports(items: SportsItem[]) {
  const map = new Map<string, SportsItem>()

  for (const item of items) {
    const key = `${item.match.toLowerCase()}|${item.league.toLowerCase()}`
    if (!map.has(key)) {
      map.set(key, item)
    }
  }

  return Array.from(map.values())
    .sort((a, b) => {
      const rank = (status: string) => {
        if (status === "Live") return 0
        if (status === "Scheduled") return 1
        if (status === "Finished") return 2
        return 3
      }

      const diff = rank(a.status) - rank(b.status)
      if (diff !== 0) {
        return diff
      }

      return a.kickoff < b.kickoff ? 1 : -1
    })
    .slice(0, 36)
}

function getFallbackNewsItems(): NewsItem[] {
  const now = new Date().toISOString()
  return [
    {
      id: "fallback-news-1",
      title: "BBC News Live",
      source: "BBC",
      url: "https://www.youtube.com/results?search_query=BBC+News+live",
      publishedAt: now,
      image: "",
      provider: "Fallback",
    },
    {
      id: "fallback-news-2",
      title: "Al Jazeera Live",
      source: "Al Jazeera",
      url: "https://www.youtube.com/results?search_query=Al+Jazeera+live",
      publishedAt: now,
      image: "",
      provider: "Fallback",
    },
    {
      id: "fallback-news-3",
      title: "Reuters World News",
      source: "Reuters",
      url: "https://www.reuters.com/world/",
      publishedAt: now,
      image: "",
      provider: "Fallback",
    },
  ]
}

function getFallbackSportsItems(): SportsItem[] {
  const now = new Date().toISOString()
  return [
    {
      id: "fallback-sports-1",
      match: "Live Football Streams",
      league: "Global",
      status: "Live",
      score: "- : -",
      kickoff: now,
      watchUrl: "https://www.youtube.com/results?search_query=live+football+match",
      provider: "Fallback",
    },
    {
      id: "fallback-sports-2",
      match: "Live NBA Streams",
      league: "Basketball",
      status: "Live",
      score: "- : -",
      kickoff: now,
      watchUrl: "https://www.youtube.com/results?search_query=live+NBA+game",
      provider: "Fallback",
    },
    {
      id: "fallback-sports-3",
      match: "Live Formula 1 Coverage",
      league: "Motorsport",
      status: "Scheduled",
      score: "- : -",
      kickoff: now,
      watchUrl: "https://www.youtube.com/results?search_query=Formula+1+live",
      provider: "Fallback",
    },
  ]
}

export default async function LivePage() {
  const [gnews, currents, mediastack, sportdata, sportsDb] = await Promise.all([
    fetchGnewsItems(),
    fetchCurrentsItems(),
    fetchMediastackItems(),
    fetchSportdataItems(),
    fetchTheSportsDbItems(),
  ])

  const newsItems = dedupeNews([...gnews, ...currents, ...mediastack])
  const sportsItems = dedupeSports([...sportdata, ...sportsDb])
  const finalNewsItems = newsItems.length > 0 ? newsItems : getFallbackNewsItems()
  const finalSportsItems = sportsItems.length > 0 ? sportsItems : getFallbackSportsItems()

  const hasNewsKey = Boolean(
    process.env.GNEWS_API_KEY ||
      process.env.CURRENTS_API_KEY ||
      process.env.MEDIASTACK_API_KEY
  )

  const hasSportsKey = Boolean(process.env.SPORTDATAAPI_KEY || process.env.THESPORTSDB_KEY)

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-8 px-4 py-10 md:py-14">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Live: Sports & News</h1>
        <p className="mt-2 text-muted-foreground">
          Aggregated from GNews, Currents, Mediastack, SportdataAPI, and TheSportsDB.
        </p>
      </section>

      {!hasNewsKey || !hasSportsKey ? (
        <Card>
          <CardHeader>
            <CardTitle>Optional API Keys</CardTitle>
            <CardDescription>
              Add missing provider keys in `frontend/apps/v4/.env.local` for fuller coverage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            {!hasNewsKey ? <p>Missing news keys: GNEWS_API_KEY, CURRENTS_API_KEY, MEDIASTACK_API_KEY</p> : null}
            {!hasSportsKey ? <p>Missing sports keys: SPORTDATAAPI_KEY (TheSportsDB can use free key 3)</p> : null}
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold">Live Sports</h2>
          <Badge variant="secondary">{finalSportsItems.length} items</Badge>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {finalSportsItems.map((item) => (
            <Card key={item.id} className="border-muted/80">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={item.status === "Live" ? "default" : "secondary"}>{item.status}</Badge>
                  <Badge variant="outline">{item.provider}</Badge>
                </div>
                <CardTitle className="text-base leading-snug">{item.match}</CardTitle>
                <CardDescription>{item.league}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="font-medium">Score: {item.score}</p>
                <p className="text-muted-foreground">Kickoff: {formatTime(item.kickoff) || "Unknown"}</p>
                <Button asChild className="w-full">
                  <Link href={item.watchUrl} target="_blank" rel="noreferrer">
                    Watch Stream
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold">News Channels</h2>
          <Badge variant="secondary">{finalNewsItems.length} items</Badge>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {finalNewsItems.map((item) => (
            <Card key={item.id} className="overflow-hidden border-muted/80">
              <LivePosterImage src={item.image} alt={item.title} />
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{item.provider}</Badge>
                  <span className="text-xs text-muted-foreground">{formatTime(item.publishedAt) || "Recent"}</span>
                </div>
                <CardTitle className="line-clamp-2 text-base leading-snug">{item.title}</CardTitle>
                <CardDescription className="line-clamp-1">{item.source}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" variant="secondary">
                  <Link href={item.url} target="_blank" rel="noreferrer">
                    Open Channel Story
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
