import { type Metadata } from "next"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Card, CardDescription, CardHeader, CardTitle } from "@/registry/new-york-v4/ui/card"

import { CATEGORY_DEFINITIONS } from "./categories-data"
import { CategoriesResults } from "./categories-results"

const title = "Browse By Categories"
const description = "Pick one or more categories to load matching movies and series."

export const metadata: Metadata = {
  title,
  description,
}

function buildToggleHref(activeSlugs: string[], slug: string) {
  const next = new Set(activeSlugs)
  if (next.has(slug)) {
    next.delete(slug)
  } else {
    next.add(slug)
  }

  const params = new URLSearchParams()
  for (const value of next) {
    params.append("cat", value)
  }

  const query = params.toString()
  return query ? `/categories?${query}` : "/categories"
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string | string[] }>
}) {
  const resolvedSearchParams = await searchParams
  const rawCats = resolvedSearchParams.cat
  const selectedSlugs = Array.isArray(rawCats)
    ? rawCats
    : rawCats
      ? [rawCats]
      : []

  const validSelectedSlugs = selectedSlugs.filter((slug) =>
    CATEGORY_DEFINITIONS.some((category) => category.slug === slug)
  )

  const selectedLabels = CATEGORY_DEFINITIONS.filter((category) =>
    validSelectedSlugs.includes(category.slug)
  ).map((category) => category.label)

  const omdbConfigured = Boolean(process.env.OMDB_API_KEY || process.env.NEXT_PUBLIC_OMDB_API_KEY)
  const tmdbConfigured = Boolean(process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY)
  const hasAnyProviderConfigured = omdbConfigured || tmdbConfigured

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-8 px-4 py-10 md:py-14">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </section>

      {!hasAnyProviderConfigured ? (
        <Card>
          <CardHeader>
            <CardTitle>API Key Missing</CardTitle>
            <CardDescription>
              Add `OMDB_API_KEY` and/or `TMDB_API_KEY` in `frontend/apps/v4/.env.local` to load category results.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Categories</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {CATEGORY_DEFINITIONS.map((category) => {
            const selected = validSelectedSlugs.includes(category.slug)
            return (
              <Link
                key={category.slug}
                href={buildToggleHref(validSelectedSlugs, category.slug)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-center text-sm font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-muted"
                )}
              >
                {category.label}
              </Link>
            )
          })}
        </div>
      </section>

      <section className="space-y-6">
        <CategoriesResults
          selectedSlugs={validSelectedSlugs}
          selectedLabels={selectedLabels}
          hasAnyProviderConfigured={hasAnyProviderConfigured}
        />
      </section>
    </div>
  )
}
