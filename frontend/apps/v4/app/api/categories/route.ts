import { getIntersectedCategoryResults } from "@/app/(app)/categories/categories-data"

export const dynamic = "force-dynamic"

const MAX_SOURCE_PAGES = 12
const SOURCE_PAGES_PER_UI_PAGE = 2
const INTERSECTION_CACHE_TTL_MS = 2 * 60 * 1000
const intersectionCache = new Map<string, { expiresAt: number; items: Awaited<ReturnType<typeof getIntersectedCategoryResults>> }>()

function toPositiveInt(value: string | null, fallback: number) {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const selectedSlugs = searchParams.getAll("cat")
  const page = toPositiveInt(searchParams.get("page"), 1)
  const pageSize = Math.min(toPositiveInt(searchParams.get("pageSize"), 24), 60)

  if (selectedSlugs.length === 0) {
    return Response.json({
      items: [],
      page,
      pageSize,
      hasMore: false,
      totalLoaded: 0,
    })
  }

  const sourcePagesToFetch = Math.min(MAX_SOURCE_PAGES, page * SOURCE_PAGES_PER_UI_PAGE)
  const cacheKey = `${selectedSlugs.slice().sort().join("|")}::${sourcePagesToFetch}`
  const now = Date.now()
  const cached = intersectionCache.get(cacheKey)

  const intersected = cached && cached.expiresAt > now
    ? cached.items
    : await getIntersectedCategoryResults(selectedSlugs, sourcePagesToFetch)

  if (!cached || cached.expiresAt <= now) {
    intersectionCache.set(cacheKey, {
      expiresAt: now + INTERSECTION_CACHE_TTL_MS,
      items: intersected,
    })
  }

  const start = (page - 1) * pageSize
  const end = start + pageSize
  const items = intersected.slice(start, end)
  const hasMore = intersected.length === 0
    ? false
    : intersected.length > end || sourcePagesToFetch < MAX_SOURCE_PAGES

  return Response.json({
    items,
    page,
    pageSize,
    hasMore,
    totalLoaded: intersected.length,
  })
}
