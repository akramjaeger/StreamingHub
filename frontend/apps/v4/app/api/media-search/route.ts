import { NextResponse } from "next/server"

const OMDB_BASE_URL = "https://www.omdbapi.com/"
const TVMAZE_BASE_URL = "https://api.tvmaze.com"

type OmdbSearchItem = {
  Title?: string
  Year?: string
  imdbID?: string
  Type?: string
  Poster?: string
}

type TvMazeSearchItem = {
  show?: {
    id?: number
    name?: string
    premiered?: string
    type?: string
    image?: {
      medium?: string
      original?: string
    }
  }
}

type MediaSearchResult = {
  id: string
  title: string
  year: string
  type: "movie" | "series"
  poster: string
}

function normalizePoster(value?: string) {
  if (!value || value === "N/A") {
    return ""
  }

  return /^https?:\/\//i.test(value) ? value : ""
}

function toYear(value?: string) {
  const yearMatch = String(value || "").match(/\b(19|20)\d{2}\b/)
  return yearMatch?.[0] || ""
}

async function fetchJson<T>(url: string) {
  try {
    const response = await fetch(url, {
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as T
  } catch {
    return null
  }
}

async function searchOmdb(query: string) {
  const apiKey = process.env.OMDB_API_KEY || process.env.NEXT_PUBLIC_OMDB_API_KEY
  if (!apiKey) {
    return [] as MediaSearchResult[]
  }

  const url = `${OMDB_BASE_URL}?apikey=${apiKey}&s=${encodeURIComponent(query)}`
  const data = await fetchJson<{ Response?: string; Search?: OmdbSearchItem[] }>(url)

  if (!data || data.Response !== "True") {
    return [] as MediaSearchResult[]
  }

  return (Array.isArray(data.Search) ? data.Search : [])
    .slice(0, 8)
    .map((item) => ({
      id: String(item.imdbID || "").trim(),
      title: String(item.Title || "Untitled").trim(),
      year: toYear(item.Year),
      type: item.Type === "movie" ? "movie" : "series",
      poster: normalizePoster(item.Poster),
    }))
    .filter((item) => Boolean(item.id) && Boolean(item.title))
}

async function searchTvMaze(query: string) {
  const url = `${TVMAZE_BASE_URL}/search/shows?q=${encodeURIComponent(query)}`
  const data = await fetchJson<TvMazeSearchItem[]>(url)

  if (!Array.isArray(data)) {
    return [] as MediaSearchResult[]
  }

  return data
    .slice(0, 8)
    .map((entry) => {
      const show = entry.show
      const poster = normalizePoster(show?.image?.original || show?.image?.medium)

      return {
        id: `tvmaze-${String(show?.id || "").trim()}`,
        title: String(show?.name || "Untitled").trim(),
        year: toYear(show?.premiered),
        type: "series" as const,
        poster,
      }
    })
    .filter((item) => Boolean(item.id) && item.id !== "tvmaze-" && Boolean(item.title))
}

function mergeUnique(items: MediaSearchResult[]) {
  const seen = new Set<string>()
  const merged: MediaSearchResult[] = []

  for (const item of items) {
    const key = `${item.title.toLowerCase()}-${item.year}`
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    merged.push(item)
    if (merged.length >= 10) {
      break
    }
  }

  return merged
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = String(searchParams.get("q") || "").trim()

  if (query.length < 2) {
    return NextResponse.json({ results: [] as MediaSearchResult[] })
  }

  const [omdbResults, tvMazeResults] = await Promise.all([searchOmdb(query), searchTvMaze(query)])
  const results = mergeUnique([...omdbResults, ...tvMazeResults])

  return NextResponse.json({ results })
}
