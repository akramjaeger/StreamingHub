import { NextResponse } from "next/server"

const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"
const OMDB_BASE_URL = "https://www.omdbapi.com/"
const TVMAZE_BASE_URL = "https://api.tvmaze.com"

const FALLBACK_COUNTRY = "US"

type DetailsResponse = {
  id: string
  title: string
  year: string
  poster: string
  overview: string
  tags: string[]
  duration: string
  details: Array<{ label: string; value: string }>
  cast: string[]
  watchProviders: Array<{ name: string; logo: string; type: "stream" | "rent" | "buy" }>
  trailerUrl: string
  similarTitles: Array<{ id: string; title: string; year: string; poster: string }>
}

type TmdbLikeResult = {
  id?: number
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string
}

type TvMazeShow = {
  id: number
  name?: string
  type?: string
  premiered?: string
  language?: string
  status?: string
  runtime?: number
  averageRuntime?: number
  genres?: string[]
  summary?: string
  image?: {
    medium?: string
    original?: string
  }
  rating?: {
    average?: number
  }
  network?: {
    name?: string
  }
  webChannel?: {
    name?: string
  }
}

function getUsableApiKey(...values: Array<string | undefined>) {
  for (const value of values) {
    if (!value) {
      continue
    }

    const trimmed = value.trim()
    if (!trimmed) {
      continue
    }

    const normalized = trimmed.toLowerCase()
    if (
      normalized === "your_key" ||
      normalized === "your_api_key" ||
      normalized === "undefined" ||
      normalized === "null"
    ) {
      continue
    }

    return trimmed
  }

  return ""
}

function firstYear(value?: string) {
  return (value || "").slice(0, 4)
}

function stripHtml(input: string) {
  return String(input || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function uniqueStrings(values: Array<string | undefined>, max = 8) {
  const set = new Set<string>()
  for (const value of values) {
    const normalized = String(value || "").trim()
    if (!normalized) {
      continue
    }

    if (!set.has(normalized)) {
      set.add(normalized)
    }

    if (set.size >= max) {
      break
    }
  }

  return Array.from(set)
}

function formatDuration(runtimeMinutes?: number, episodeRunTime?: number[]) {
  if (Number.isFinite(runtimeMinutes) && Number(runtimeMinutes) > 0) {
    const total = Number(runtimeMinutes)
    const hours = Math.floor(total / 60)
    const mins = total % 60
    if (hours <= 0) {
      return `${mins} min`
    }

    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const tvMinutes = Array.isArray(episodeRunTime)
    ? episodeRunTime.find((value) => Number.isFinite(value) && value > 0)
    : undefined

  if (tvMinutes && tvMinutes > 0) {
    return `${tvMinutes} min/episode`
  }

  return "Unknown"
}

function mapTmdbProviders(payload: any) {
  const byCountry = payload?.results?.[FALLBACK_COUNTRY] || payload?.results?.GB || payload?.results?.CA
  if (!byCountry) {
    return [] as DetailsResponse["watchProviders"]
  }

  const stream = (byCountry.flatrate || []).map((provider: any) => ({
    name: String(provider?.provider_name || "").trim(),
    logo: provider?.logo_path ? `${TMDB_IMAGE_BASE_URL}${provider.logo_path}` : "",
    type: "stream" as const,
  }))

  const rent = (byCountry.rent || []).map((provider: any) => ({
    name: String(provider?.provider_name || "").trim(),
    logo: provider?.logo_path ? `${TMDB_IMAGE_BASE_URL}${provider.logo_path}` : "",
    type: "rent" as const,
  }))

  const buy = (byCountry.buy || []).map((provider: any) => ({
    name: String(provider?.provider_name || "").trim(),
    logo: provider?.logo_path ? `${TMDB_IMAGE_BASE_URL}${provider.logo_path}` : "",
    type: "buy" as const,
  }))

  const all = [...stream, ...rent, ...buy].filter((provider) => Boolean(provider.name))
  const dedupe = new Map<string, (typeof all)[number]>()

  for (const provider of all) {
    const key = `${provider.type}:${provider.name.toLowerCase()}`
    if (!dedupe.has(key)) {
      dedupe.set(key, provider)
    }
  }

  return Array.from(dedupe.values()).slice(0, 12)
}

function toTvMazePoster(image?: { medium?: string; original?: string }) {
  const url = image?.original || image?.medium || ""
  return /^https?:\/\//i.test(url) ? url : ""
}

function mapTmdbSimilar(items: TmdbLikeResult[] | undefined) {
  if (!Array.isArray(items)) {
    return [] as DetailsResponse["similarTitles"]
  }

  return items
    .filter((item) => Number.isFinite(item?.id))
    .map((item) => ({
      id: `tmdb-${item.id}`,
      title: String(item.title || item.name || "Untitled"),
      year: firstYear(item.release_date || item.first_air_date),
      poster: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : "",
    }))
    .slice(0, 10)
}

function getTmdbTrailerUrl(videosPayload: any, fallbackTitle: string) {
  const videos = Array.isArray(videosPayload?.results) ? videosPayload.results : []

  const preferred =
    videos.find((video: any) => video?.site === "YouTube" && video?.type === "Trailer" && video?.official) ||
    videos.find((video: any) => video?.site === "YouTube" && video?.type === "Trailer") ||
    videos.find((video: any) => video?.site === "YouTube")

  const youtubeKey = String(preferred?.key || "").trim()
  if (youtubeKey) {
    return `https://www.youtube.com/watch?v=${youtubeKey}`
  }

  if (!fallbackTitle.trim()) {
    return ""
  }

  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${fallbackTitle} official trailer`)}`
}

async function safeJson(url: string) {
  try {
    const response = await fetch(url, {
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

async function fetchTvMazeByTitle(title: string) {
  if (!title.trim()) {
    return null
  }

  const payload = await safeJson(`${TVMAZE_BASE_URL}/search/shows?q=${encodeURIComponent(title)}`)
  const list = Array.isArray(payload) ? payload : []
  const show = list[0]?.show as TvMazeShow | undefined
  return show || null
}

async function fetchTvMazeById(showId: number) {
  if (!Number.isFinite(showId) || showId <= 0) {
    return null
  }

  const payload = await safeJson(`${TVMAZE_BASE_URL}/shows/${showId}`)
  if (!payload || !Number.isFinite(payload?.id)) {
    return null
  }

  return payload as TvMazeShow
}

async function fetchTvMazeCast(showId: number) {
  if (!Number.isFinite(showId) || showId <= 0) {
    return [] as Array<{ person?: { name?: string } }>
  }

  const payload = await safeJson(`${TVMAZE_BASE_URL}/shows/${showId}/cast`)
  return Array.isArray(payload) ? payload : []
}

async function fetchTvMazeSimilarByTitle(title: string, excludeId?: number) {
  if (!title.trim()) {
    return [] as DetailsResponse["similarTitles"]
  }

  const payload = await safeJson(`${TVMAZE_BASE_URL}/search/shows?q=${encodeURIComponent(title)}`)
  const list = Array.isArray(payload) ? payload : []

  return list
    .map((entry: any) => entry?.show as TvMazeShow)
    .filter((show: TvMazeShow | undefined) => Boolean(show?.id && show.id !== excludeId))
    .slice(0, 10)
    .map((show: TvMazeShow) => ({
      id: `tvmaze-${show.id}`,
      title: String(show.name || "Untitled"),
      year: firstYear(show.premiered),
      poster: toTvMazePoster(show.image),
    }))
}

async function buildFromTvMaze(params: {
  itemId: string
  title: string
  year: string
  poster: string
}) {
  const tvmazeId = params.itemId.startsWith("tvmaze-")
    ? Number.parseInt(params.itemId.replace(/^tvmaze-/, ""), 10)
    : NaN

  const show = Number.isFinite(tvmazeId) && tvmazeId > 0
    ? await fetchTvMazeById(tvmazeId)
    : await fetchTvMazeByTitle(params.title)

  if (!show) {
    return null
  }

  const [castPayload, similarTitles] = await Promise.all([
    fetchTvMazeCast(show.id),
    fetchTvMazeSimilarByTitle(String(show.name || params.title || ""), show.id),
  ])

  const cast = uniqueStrings(castPayload.map((entry) => entry?.person?.name), 10)
  const providers = uniqueStrings([show.webChannel?.name, show.network?.name], 5).map((name) => ({
    name,
    logo: "",
    type: "stream" as const,
  }))

  const title = String(show.name || params.title || "Untitled")

  const details: DetailsResponse["details"] = [
    { label: "Type", value: String(show.type || "TV Show") },
    { label: "First Air Date", value: String(show.premiered || "Unknown") },
    { label: "Language", value: String(show.language || "Unknown") },
    {
      label: "Rating",
      value: Number.isFinite(show.rating?.average) ? `${Number(show.rating?.average).toFixed(1)}/10` : "N/A",
    },
    { label: "Status", value: String(show.status || "Unknown") },
  ]

  return {
    id: `tvmaze-${show.id}`,
    title,
    year: firstYear(show.premiered || params.year),
    poster: toTvMazePoster(show.image) || params.poster,
    overview: stripHtml(String(show.summary || "")) || "No description available.",
    tags: uniqueStrings(show.genres || [], 10),
    duration: formatDuration(show.runtime || show.averageRuntime, [show.averageRuntime || show.runtime || 0]),
    details,
    cast,
    watchProviders: providers,
    trailerUrl: getTmdbTrailerUrl(null, title),
    similarTitles,
  } satisfies DetailsResponse
}

async function buildFromOmdb(params: {
  itemId: string
  title: string
  year: string
  poster: string
  omdbKey: string
  tmdbKey: string
}) {
  const imdbId = params.itemId.replace(/^omdb-/, "")

  let omdb = await safeJson(
    `${OMDB_BASE_URL}?apikey=${params.omdbKey}&i=${encodeURIComponent(imdbId)}&plot=full`
  )

  const omdbResponse = String(omdb?.Response || "").toLowerCase()
  if ((!omdb || omdbResponse !== "true") && params.title.trim()) {
    const titleQuery = `${OMDB_BASE_URL}?apikey=${params.omdbKey}&t=${encodeURIComponent(params.title)}&plot=full${
      params.year ? `&y=${encodeURIComponent(params.year)}` : ""
    }`
    omdb = await safeJson(titleQuery)
  }

  let tmdbProviders: DetailsResponse["watchProviders"] = []
  let trailerUrl = ""
  let similarTitles: DetailsResponse["similarTitles"] = []

  if (params.tmdbKey) {
    const tmdbFind = await safeJson(
      `${TMDB_BASE_URL}/find/${encodeURIComponent(imdbId)}?api_key=${params.tmdbKey}&external_source=imdb_id`
    )

    let movieId = tmdbFind?.movie_results?.[0]?.id
    let tvId = tmdbFind?.tv_results?.[0]?.id

    if (!movieId && !tvId && params.title.trim()) {
      const tmdbSearch = await safeJson(
        `${TMDB_BASE_URL}/search/multi?api_key=${params.tmdbKey}&query=${encodeURIComponent(params.title)}${
          params.year ? `&year=${encodeURIComponent(params.year)}` : ""
        }`
      )

      const movieCandidate = (tmdbSearch?.results || []).find((entry: any) => entry?.media_type === "movie")
      const tvCandidate = (tmdbSearch?.results || []).find((entry: any) => entry?.media_type === "tv")
      movieId = movieCandidate?.id || movieId
      tvId = tvCandidate?.id || tvId
    }

    const mediaKind = movieId ? "movie" : tvId ? "tv" : ""
    const mediaId = movieId || tvId

    const detailPayload = mediaKind && mediaId
      ? await safeJson(
          `${TMDB_BASE_URL}/${mediaKind}/${mediaId}?api_key=${params.tmdbKey}&append_to_response=videos,similar`
        )
      : null

    const providerPayload = movieId
      ? await safeJson(`${TMDB_BASE_URL}/movie/${movieId}/watch/providers?api_key=${params.tmdbKey}`)
      : tvId
        ? await safeJson(`${TMDB_BASE_URL}/tv/${tvId}/watch/providers?api_key=${params.tmdbKey}`)
        : null

    tmdbProviders = mapTmdbProviders(providerPayload)
    trailerUrl = getTmdbTrailerUrl(detailPayload?.videos, String(omdb?.Title || params.title || ""))
    similarTitles = mapTmdbSimilar(detailPayload?.similar?.results)
  }

  const title = String(omdb?.Title || params.title || "Untitled")
  const year = String(omdb?.Year || params.year || "")

  const details: DetailsResponse["details"] = [
    { label: "Type", value: String(omdb?.Type || "Movie/Show") },
    { label: "Released", value: String(omdb?.Released || "Unknown") },
    { label: "Language", value: String(omdb?.Language || "Unknown") },
    { label: "IMDb", value: String(omdb?.imdbRating || "N/A") },
  ]

  return {
    id: params.itemId,
    title,
    year,
    poster: String(omdb?.Poster && omdb.Poster !== "N/A" ? omdb.Poster : params.poster || ""),
    overview: String(omdb?.Plot && omdb.Plot !== "N/A" ? omdb.Plot : "No description available."),
    tags: uniqueStrings(String(omdb?.Genre || "").split(",").map((entry) => entry.trim())),
    duration: String(omdb?.Runtime && omdb.Runtime !== "N/A" ? omdb.Runtime : "Unknown"),
    details,
    cast: uniqueStrings(String(omdb?.Actors || "").split(",").map((entry) => entry.trim()), 10),
    watchProviders: tmdbProviders,
    trailerUrl: trailerUrl || getTmdbTrailerUrl(null, title),
    similarTitles,
  } satisfies DetailsResponse
}

async function buildFromTmdb(params: {
  itemId: string
  title: string
  year: string
  poster: string
  tmdbKey: string
}) {
  const tmdbId = params.itemId.replace(/^tmdb-/, "")

  const [movie, tv] = await Promise.all([
    safeJson(
      `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${params.tmdbKey}&append_to_response=credits,watch/providers,videos,similar`
    ),
    safeJson(
      `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${params.tmdbKey}&append_to_response=credits,watch/providers,videos,similar`
    ),
  ])

  const payload = movie?.id ? movie : tv?.id ? tv : null
  if (!payload) {
    return null
  }

  const isMovie = Boolean(movie?.id)
  const title = String(payload.title || payload.name || params.title || "Untitled")
  const year = firstYear(payload.release_date || payload.first_air_date || params.year)

  const details: DetailsResponse["details"] = [
    { label: "Type", value: isMovie ? "Movie" : "TV Show" },
    {
      label: isMovie ? "Release Date" : "First Air Date",
      value: String(payload.release_date || payload.first_air_date || "Unknown"),
    },
    {
      label: "Rating",
      value: Number.isFinite(payload.vote_average)
        ? `${Number(payload.vote_average).toFixed(1)}/10`
        : "N/A",
    },
    { label: "Status", value: String(payload.status || "Unknown") },
    { label: "Language", value: String(payload.original_language || "Unknown").toUpperCase() },
  ]

  return {
    id: params.itemId,
    title,
    year,
    poster: payload.poster_path ? `${TMDB_IMAGE_BASE_URL}${payload.poster_path}` : params.poster,
    overview: String(payload.overview || "No description available."),
    tags: uniqueStrings((payload.genres || []).map((genre: any) => genre?.name), 10),
    duration: formatDuration(payload.runtime, payload.episode_run_time),
    details,
    cast: uniqueStrings((payload.credits?.cast || []).map((person: any) => person?.name), 10),
    watchProviders: mapTmdbProviders(payload["watch/providers"]),
    trailerUrl: getTmdbTrailerUrl(payload.videos, title),
    similarTitles: mapTmdbSimilar(payload.similar?.results),
  } satisfies DetailsResponse
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const itemId = String(searchParams.get("id") || "").trim()
  const title = String(searchParams.get("title") || "").trim()
  const year = String(searchParams.get("year") || "").trim()
  const poster = String(searchParams.get("poster") || "").trim()

  if (!itemId && !title) {
    return NextResponse.json({ message: "id or title is required" }, { status: 400 })
  }

  const omdbKey = getUsableApiKey(process.env.OMDB_API_KEY, process.env.NEXT_PUBLIC_OMDB_API_KEY)
  const tmdbKey = getUsableApiKey(process.env.TMDB_API_KEY, process.env.NEXT_PUBLIC_TMDB_API_KEY)

  if (!omdbKey && !tmdbKey) {
    return NextResponse.json({ message: "Media providers are not configured" }, { status: 503 })
  }

  let details: DetailsResponse | null = null

  if (itemId.startsWith("tvmaze-")) {
    details = await buildFromTvMaze({ itemId, title, year, poster })
  }

  if (itemId.startsWith("omdb-") && omdbKey) {
    details = await buildFromOmdb({ itemId, title, year, poster, omdbKey, tmdbKey })
  }

  if (!details && itemId.startsWith("tmdb-") && tmdbKey) {
    details = await buildFromTmdb({ itemId, title, year, poster, tmdbKey })
  }

  if (!details && tmdbKey) {
    details = await buildFromTmdb({ itemId, title, year, poster, tmdbKey })
  }

  if (!details && omdbKey) {
    details = await buildFromOmdb({ itemId, title, year, poster, omdbKey, tmdbKey })
  }

  if (!details) {
    details = await buildFromTvMaze({ itemId, title, year, poster })
  }

  if (!details) {
    return NextResponse.json({ message: "Could not fetch media details" }, { status: 404 })
  }

  return NextResponse.json({ details })
}
