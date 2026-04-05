import { type Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/new-york-v4/ui/card"

import { HomeMediaSections, type HomeSectionsData } from "./home-media-sections"

const title = "StreamHub: Discover With OMDB"
const description = "Curated picks from OMDB + TVMaze, organized into swipeable sections."
const OMDB_BASE_URL = "https://www.omdbapi.com/"
const TVMAZE_BASE_URL = "https://api.tvmaze.com"
const OMDB_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const omdbCache = new Map<string, { expiresAt: number; data: unknown }>()

export const revalidate = 86400
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    images: [
      {
        url: `/og?title=${encodeURIComponent(
          title
        )}&description=${encodeURIComponent(description)}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      {
        url: `/og?title=${encodeURIComponent(
          title
        )}&description=${encodeURIComponent(description)}`,
      },
    ],
  },
}

type OmdbSearchResult = {
  Title: string
  Year: string
  imdbID: string
  Type: string
  Poster: string
}

type OmdbTitleResult = {
  Title: string
  Year: string
  Actors?: string
  Poster?: string
  Response: string
}

type TvMazeShow = {
  id: number
  name: string
  premiered?: string
  genres?: string[]
  image?: {
    medium?: string
    original?: string
  }
}

type TvMazePerson = {
  person: {
    id: number
    name: string
    image?: {
      medium?: string
      original?: string
    }
  }
}

function pickRandomItems<T>(items: T[], count: number) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = copy[index]
    copy[index] = copy[randomIndex]
    copy[randomIndex] = current
  }

  return copy.slice(0, count)
}

async function fetchOmdbCached<T>(url: string) {
  const now = Date.now()
  const cached = omdbCache.get(url)

  if (cached && cached.expiresAt > now) {
    return cached.data as T
  }

  const response = await fetch(url, {
    next: { revalidate },
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as T
  omdbCache.set(url, {
    expiresAt: now + OMDB_CACHE_TTL_MS,
    data,
  })
  return data
}

function normalizePoster(url?: string) {
  if (!url || url === "N/A") {
    return ""
  }

  return /^https?:\/\//i.test(url) ? url : ""
}

function normalizeTvMazeImage(image?: { medium?: string; original?: string }) {
  return normalizePoster(image?.original || image?.medium)
}

function toItemId(imdbID: string) {
  const numeric = imdbID.replace(/[^0-9]/g, "")
  return Number(numeric) || Math.floor(Math.random() * 1000000)
}

async function fetchOmdbSearch(query: string, type?: "movie" | "series") {
  const apiKey = process.env.OMDB_API_KEY || process.env.NEXT_PUBLIC_OMDB_API_KEY
  if (!apiKey) {
    return [] as OmdbSearchResult[]
  }

  const typeParam = type ? `&type=${type}` : ""
  const url = `${OMDB_BASE_URL}?apikey=${apiKey}&s=${encodeURIComponent(query)}${typeParam}`

  const data = await fetchOmdbCached<{ Search?: OmdbSearchResult[]; Response?: string }>(url)
  if (!data || data.Response !== "True") {
    return [] as OmdbSearchResult[]
  }

  return Array.isArray(data.Search) ? data.Search : []
}

async function fetchOmdbByTitle(titleQuery: string) {
  const apiKey = process.env.OMDB_API_KEY || process.env.NEXT_PUBLIC_OMDB_API_KEY
  if (!apiKey) {
    return null
  }

  const url = `${OMDB_BASE_URL}?apikey=${apiKey}&t=${encodeURIComponent(titleQuery)}`
  const data = await fetchOmdbCached<OmdbTitleResult>(url)
  if (!data) {
    return null
  }

  if (data.Response !== "True") {
    return null
  }

  return data
}

async function fetchTvMazeShows(page: number) {
  const url = `${TVMAZE_BASE_URL}/shows?page=${page}`
  const data = await fetchOmdbCached<TvMazeShow[]>(url)
  return Array.isArray(data) ? data : []
}

async function fetchTvMazeCast(showId: number) {
  const url = `${TVMAZE_BASE_URL}/shows/${showId}/cast`
  const data = await fetchOmdbCached<TvMazePerson[]>(url)
  return Array.isArray(data) ? data : []
}

export default async function IndexPage() {
  const [movies, tvShows, cartoons, posters, actorSources, tvMazeShowsPage0, tvMazeShowsPage1] = await Promise.all([
    fetchOmdbSearch("blockbuster", "movie"),
    fetchOmdbSearch("popular", "series"),
    fetchOmdbSearch("animation", "movie"),
    fetchOmdbSearch("top rated", "movie"),
    Promise.all([
      fetchOmdbByTitle("Inception"),
      fetchOmdbByTitle("Breaking Bad"),
      fetchOmdbByTitle("Interstellar"),
      fetchOmdbByTitle("The Dark Knight"),
      fetchOmdbByTitle("Toy Story"),
    ]),
    fetchTvMazeShows(0),
    fetchTvMazeShows(1),
  ])

  const tvMazeShows = [...tvMazeShowsPage0, ...tvMazeShowsPage1]
  const tvMazeWithPosters = tvMazeShows
    .map((show) => ({
      id: show.id,
      title: show.name,
      subtitle: show.premiered ? show.premiered.slice(0, 4) : "",
      image: normalizeTvMazeImage(show.image),
      genres: show.genres || [],
    }))
    .filter((show) => Boolean(show.image))

  const actorShowIds = pickRandomItems(tvMazeWithPosters, 4).map((show) => show.id)
  const tvMazeCastLists = await Promise.all(actorShowIds.map((id) => fetchTvMazeCast(id)))

  const actorMap = new Map<string, { fromTitle: string; image: string }>()
  for (const source of actorSources) {
    if (!source?.Actors) {
      continue
    }

    const sourcePoster = normalizePoster(source.Poster)

    for (const actor of source.Actors.split(",")) {
      const trimmed = actor.trim()
      if (trimmed && !actorMap.has(trimmed)) {
        actorMap.set(trimmed, {
          fromTitle: source.Title,
          image: sourcePoster,
        })
      }
      if (actorMap.size >= 12) {
        break
      }
    }
    if (actorMap.size >= 12) {
      break
    }
  }

  for (let index = 0; index < tvMazeCastLists.length; index++) {
    const castList = tvMazeCastLists[index]
    const showTitle = tvMazeWithPosters[index]?.title || "TV show"
    for (const cast of castList) {
      const actorName = cast.person?.name?.trim()
      const actorImage = normalizeTvMazeImage(cast.person?.image)
      if (!actorName || !actorImage || actorMap.has(actorName)) {
        continue
      }

      actorMap.set(actorName, {
        fromTitle: showTitle,
        image: actorImage,
      })

      if (actorMap.size >= 12) {
        break
      }
    }

    if (actorMap.size >= 12) {
      break
    }
  }

  const cartoonSet = new Map<number, { id: number; title: string; subtitle: string; image: string }>()
  for (const item of cartoons
    .map((entry) => ({
      id: toItemId(entry.imdbID),
      title: entry.Title || "Untitled",
      subtitle: "Animation",
      image: normalizePoster(entry.Poster),
    }))
    .filter((entry) => Boolean(entry.image))) {
    cartoonSet.set(item.id, item)
  }

  for (const show of tvMazeWithPosters.filter((entry) =>
    entry.genres.some((genre) => /animation|anime|cartoon/i.test(genre))
  )) {
    cartoonSet.set(show.id, {
      id: show.id,
      title: show.title,
      subtitle: "Animation",
      image: show.image,
    })
  }

  const movieItems = movies
      .map((item) => ({
        id: toItemId(item.imdbID),
        title: item.Title || "Untitled",
        subtitle: item.Year || "",
        image: normalizePoster(item.Poster),
      }))
      .filter((item) => Boolean(item.image))
      .concat(
        tvMazeWithPosters
          .slice(0, 10)
          .map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle,
            image: item.image,
          }))
      )
  const tvShowItems = tvShows
      .map((item) => ({
        id: toItemId(item.imdbID),
        title: item.Title || "Untitled",
        subtitle: item.Year || "",
        image: normalizePoster(item.Poster),
      }))
      .filter((item) => Boolean(item.image))
      .concat(
        tvMazeWithPosters.map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          image: item.image,
        }))
      )
  const cartoonItems = Array.from(cartoonSet.values())
  const actorItems = Array.from(actorMap.entries())
      .map(([actorName, details], index) => ({
        id: index + 1,
        title: actorName,
        subtitle: `From ${details.fromTitle}`,
        image: details.image,
      }))
      .filter((item) => Boolean(item.image))
  const posterItems = posters
      .map((item) => ({
        id: toItemId(item.imdbID),
        title: item.Title || "Poster",
        subtitle: "Popular",
        image: normalizePoster(item.Poster),
      }))
      .filter((item) => Boolean(item.image))
      .concat(
        tvMazeWithPosters
          .slice(0, 8)
          .map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: "TVMaze",
            image: item.image,
          }))
      )
  const sections: HomeSectionsData = {
    movies: pickRandomItems(movieItems, 12),
    tvShows: pickRandomItems(tvShowItems, 12),
    cartoons: pickRandomItems(cartoonItems, 12),
    actors: pickRandomItems(actorItems, 12),
    posters: pickRandomItems(posterItems, 12),
  }

  const omdbConfigured = Boolean(process.env.OMDB_API_KEY || process.env.NEXT_PUBLIC_OMDB_API_KEY)

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-8 px-4 py-10 md:py-14">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </section>

      {!omdbConfigured ? (
        <Card>
          <CardHeader>
            <CardTitle>OMDB API Key Missing</CardTitle>
            <CardDescription>
              Add `OMDB_API_KEY` in `frontend/apps/v4/.env.local` to load home sections.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Example key usage: https://www.omdbapi.com/?apikey=YOUR_KEY&t=Inception
          </CardContent>
        </Card>
      ) : (
        <HomeMediaSections sections={sections} />
      )}
    </div>
  )
}
