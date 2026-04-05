import Link from "next/link"
import { type Metadata } from "next"

import { Badge } from "@/registry/new-york-v4/ui/badge"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/new-york-v4/ui/card"

export const metadata: Metadata = {
  title: "Help",
  description: "Support center for Stream Hub features, setup, and troubleshooting.",
}

const quickActions = [
  { label: "Fix category filters", href: "/categories" },
  { label: "Open live channels", href: "/live" },
  { label: "Edit profile", href: "/profile" },
  { label: "Back to home", href: "/" },
]

const faqs = [
  {
    q: "Why do some posters show 'No Poster'?",
    a: "Some external APIs return broken or missing image URLs. Stream Hub automatically shows a fallback tile so layout stays clean.",
  },
  {
    q: "How do multi-category filters work?",
    a: "The app tries strict matches first. If no strict matches are found, it falls back to strongest related matches so you still get useful results.",
  },
  {
    q: "Why is the Live page sometimes slower?",
    a: "Live data aggregates multiple providers. If one provider is slow or unavailable, Stream Hub falls back to alternate sources and static fallback cards.",
  },
  {
    q: "Do I need all API keys configured?",
    a: "No. You can run with partial keys. More keys means richer and more diverse data coverage.",
  },
]

export default function HelpPage() {
  return (
    <div className="container mx-auto flex flex-1 flex-col gap-8 px-4 py-10 md:py-14">
      <section className="space-y-4">
        <Badge className="rounded-full px-3 py-1">Support Center</Badge>
        <h1 className="text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
          Stream Hub Help
        </h1>
        <p className="max-w-3xl text-base text-muted-foreground md:text-lg">
          Everything you need to troubleshoot quickly, navigate core features, and keep your
          experience smooth.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => (
          <Button key={action.href} asChild variant="outline" className="h-auto justify-start rounded-xl p-4 text-left">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-muted/80">
          <CardHeader>
            <CardTitle>Common Fixes</CardTitle>
            <CardDescription>Fast actions that solve most issues in under a minute.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Refresh after changing filters to reset cached views.</p>
            <p>2. Confirm API keys in `.env.local` for live/news providers.</p>
            <p>3. If image cards fail, the built-in fallback should show `No Poster` automatically.</p>
            <p>4. For login/profile issues, sign out and sign back in to refresh local auth state.</p>
          </CardContent>
        </Card>

        <Card className="border-muted/80">
          <CardHeader>
            <CardTitle>Status Hints</CardTitle>
            <CardDescription>How to read what the app is telling you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. `No Poster`: source image is missing or broken.</p>
            <p>2. Empty results after filters: criteria may be very strict, remove one filter.</p>
            <p>3. Live cards present but not updating: upstream provider may be delayed.</p>
            <p>4. Missing provider warnings: add the corresponding key and restart frontend.</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((item) => (
            <Card key={item.q} className="border-muted/80">
              <CardHeader>
                <CardTitle className="text-base leading-snug">{item.q}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{item.a}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
