import "server-only"

const OMDB_BASE_URL = "https://www.omdbapi.com/"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

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

export type CategoryResultItem = {
  id: string
  title: string
  year: string
  poster: string
}

type OmdbSearchResult = {
  Title: string
  Year: string
  imdbID: string
  Poster: string
}

type TmdbDiscoverItem = {
  id: number
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string
}

export type CategoryDefinition = {
  slug: string
  label: string
  search: string
  tmdbGenreId: number
  animeMode?: boolean
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  { slug: "action", label: "Action", search: "action", tmdbGenreId: 28 },
  { slug: "comedy", label: "Comedy", search: "comedy", tmdbGenreId: 35 },
  { slug: "drama", label: "Drama", search: "drama", tmdbGenreId: 18 },
  { slug: "thriller", label: "Thriller", search: "thriller", tmdbGenreId: 53 },
  { slug: "romance", label: "Romance", search: "romance", tmdbGenreId: 10749 },
  { slug: "horror", label: "Horror", search: "horror", tmdbGenreId: 27 },
  { slug: "anime", label: "Anime", search: "anime", tmdbGenreId: 16, animeMode: true },
  { slug: "animation", label: "Animation", search: "animation", tmdbGenreId: 16 },
  { slug: "adventure", label: "Adventure", search: "adventure", tmdbGenreId: 12 },
  { slug: "crime", label: "Crime", search: "crime", tmdbGenreId: 80 },
  { slug: "scifi", label: "Sci-Fi", search: "science fiction", tmdbGenreId: 878 },
  { slug: "family", label: "Family", search: "family", tmdbGenreId: 10751 },
]

function normalizePoster(url?: string) {
  if (!url || url === "N/A") {
    return ""
  }

  return /^https?:\/\//i.test(url) ? url : ""
}

function normalizeTmdbPoster(path?: string) {
  return path ? `${TMDB_IMAGE_BASE_URL}${path}` : ""
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function toMatchKey(item: CategoryResultItem) {
  const normalizedTitle = normalizeTitle(item.title)
  return item.year ? `${normalizedTitle}|${item.year}` : normalizedTitle
}

function mergeAndDedupeCategoryItems(lists: CategoryResultItem[][]) {
  const merged = lists.flat()
  const map = new Map<string, CategoryResultItem>()

  for (const item of merged) {
    const dedupeKey = toMatchKey(item)
    if (!map.has(dedupeKey)) {
      map.set(dedupeKey, item)
      continue
    }

    const existing = map.get(dedupeKey)
    if (existing && !existing.poster && item.poster) {
      map.set(dedupeKey, item)
    }
  }

  return Array.from(map.values())
}

async function fetchOmdbCategoryItems(search: string, page: number) {
  const apiKey = getUsableApiKey(process.env.OMDB_API_KEY, process.env.NEXT_PUBLIC_OMDB_API_KEY)
  if (!apiKey) {
    return [] as CategoryResultItem[]
  }

  const url = `${OMDB_BASE_URL}?apikey=${apiKey}&s=${encodeURIComponent(search)}&page=${page}`
  const response = await fetch(url, {
    next: { revalidate: 60 * 60 * 12 },
  })

  if (!response.ok) {
    return [] as CategoryResultItem[]
  }

  const data = (await response.json()) as {
    Search?: OmdbSearchResult[]
    Response?: string
  }

  if (data.Response !== "True" || !Array.isArray(data.Search)) {
    return [] as CategoryResultItem[]
  }

  return data.Search
    .filter((item) => Boolean(item?.imdbID))
    .map((item) => ({
      id: `omdb-${item.imdbID}`,
      title: item.Title || "Untitled",
      year: item.Year || "",
      poster: normalizePoster(item.Poster),
    }))
}

async function fetchTmdbDiscover(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 60 * 60 * 12 },
  })

  if (!response.ok) {
    return [] as TmdbDiscoverItem[]
  }

  const data = (await response.json()) as { results?: TmdbDiscoverItem[] }
  return Array.isArray(data.results) ? data.results : []
}

async function fetchTmdbCategoryItems(category: CategoryDefinition, page: number) {
  const apiKey = getUsableApiKey(process.env.TMDB_API_KEY, process.env.NEXT_PUBLIC_TMDB_API_KEY)
  if (!apiKey) {
    return [] as CategoryResultItem[]
  }

  const movieUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&with_genres=${category.tmdbGenreId}&sort_by=popularity.desc&include_adult=false&page=${page}`
  const tvUrl = `${TMDB_BASE_URL}/discover/tv?api_key=${apiKey}&with_genres=${category.tmdbGenreId}&sort_by=popularity.desc&include_adult=false&page=${page}`
  const animeTvUrl = `${TMDB_BASE_URL}/discover/tv?api_key=${apiKey}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&include_adult=false&page=${page}`

  const [movieResults, tvResults] = await Promise.all([
    fetchTmdbDiscover(movieUrl),
    fetchTmdbDiscover(category.animeMode ? animeTvUrl : tvUrl),
  ])

  return [...movieResults, ...tvResults].map((item) => ({
    id: `tmdb-${item.id}`,
    title: item.title || item.name || "Untitled",
    year: (item.release_date || item.first_air_date || "").slice(0, 4),
    poster: normalizeTmdbPoster(item.poster_path),
  }))
}

async function fetchTmdbCombinedGenreItems(categories: CategoryDefinition[], page: number) {
  const apiKey = getUsableApiKey(process.env.TMDB_API_KEY, process.env.NEXT_PUBLIC_TMDB_API_KEY)
  if (!apiKey || categories.length === 0) {
    return [] as CategoryResultItem[]
  }

  const genreIds = Array.from(new Set(categories.map((category) => category.tmdbGenreId)))
  const withGenres = genreIds.join(",")
  const hasAnimeCategory = categories.some((category) => category.animeMode)

  const movieUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&with_genres=${withGenres}&sort_by=popularity.desc&include_adult=false&page=${page}`
  const tvUrl = `${TMDB_BASE_URL}/discover/tv?api_key=${apiKey}&with_genres=${withGenres}&sort_by=popularity.desc&include_adult=false&page=${page}${hasAnimeCategory ? "&with_original_language=ja" : ""}`

  const [movieResults, tvResults] = await Promise.all([
    fetchTmdbDiscover(movieUrl),
    fetchTmdbDiscover(tvUrl),
  ])

  return [...movieResults, ...tvResults].map((item) => ({
    id: `tmdb-${item.id}`,
    title: item.title || item.name || "Untitled",
    year: (item.release_date || item.first_air_date || "").slice(0, 4),
    poster: normalizeTmdbPoster(item.poster_path),
  }))
}

async function fetchCategoryCombinedResults(category: CategoryDefinition, sourcePagesToFetch: number) {
  const pageFetches: Promise<CategoryResultItem[]>[] = []

  for (let page = 1; page <= sourcePagesToFetch; page++) {
    pageFetches.push(fetchOmdbCategoryItems(category.search, page))
    pageFetches.push(fetchTmdbCategoryItems(category, page))
  }

  const chunked = await Promise.all(pageFetches)
  return mergeAndDedupeCategoryItems(chunked)
}

export function getSelectedCategories(selectedSlugs: string[]) {
  return CATEGORY_DEFINITIONS.filter((category) => selectedSlugs.includes(category.slug))
}

export async function getIntersectedCategoryResults(
  selectedSlugs: string[],
  sourcePagesToFetch: number
) {
  const selectedCategories = getSelectedCategories(selectedSlugs)
  if (selectedCategories.length === 0) {
    return [] as CategoryResultItem[]
  }

  const hasTmdb = Boolean(
    getUsableApiKey(process.env.TMDB_API_KEY, process.env.NEXT_PUBLIC_TMDB_API_KEY)
  )

  if (selectedCategories.length > 1 && hasTmdb) {
    const tmdbCombinedPages = await Promise.all(
      Array.from({ length: sourcePagesToFetch }, (_, index) =>
        fetchTmdbCombinedGenreItems(selectedCategories, index + 1)
      )
    )

    const tmdbCombined = mergeAndDedupeCategoryItems(tmdbCombinedPages)
    if (tmdbCombined.length > 0) {
      return tmdbCombined
    }
  }

  const categoryResults = await Promise.all(
    selectedCategories.map((category) => fetchCategoryCombinedResults(category, sourcePagesToFetch))
  )

  if (selectedCategories.length === 1) {
    return categoryResults[0]
  }

  const matchCounts = new Map<string, { count: number; item: CategoryResultItem }>()

  for (const results of categoryResults) {
    const seenInCategory = new Set<string>()

    for (const item of results) {
      const key = toMatchKey(item)
      if (seenInCategory.has(key)) {
        continue
      }

      seenInCategory.add(key)
      const existing = matchCounts.get(key)

      if (existing) {
        existing.count += 1
        if (!existing.item.poster && item.poster) {
          existing.item = item
        }
        continue
      }

      matchCounts.set(key, { count: 1, item })
    }
  }

  const strictMatches = Array.from(matchCounts.values())
    .filter((entry) => entry.count === selectedCategories.length)
    .map((entry) => entry.item)

  if (strictMatches.length > 0) {
    return strictMatches
  }

  // If strict intersection is empty, fall back to strongest partial matches.
  return Array.from(matchCounts.values())
    .sort((a, b) => b.count - a.count)
    .filter((entry) => entry.count >= Math.max(1, selectedCategories.length - 1))
    .map((entry) => entry.item)
}
