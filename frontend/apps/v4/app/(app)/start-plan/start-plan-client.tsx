"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Badge } from "@/registry/new-york-v4/ui/badge"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/new-york-v4/ui/card"

const SUBSCRIPTION_STORAGE_KEY = "streamhub_subscription"

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "$4.99/mo",
    description: "Unlock movie details, cast, and where-to-watch providers.",
    features: ["Full title details", "Watch provider availability", "Watchlist access"],
  },
  {
    id: "plus",
    name: "Plus",
    price: "$9.99/mo",
    description: "Everything in Starter plus priority data refresh and richer recommendations.",
    features: ["Everything in Starter", "Priority refresh", "Enhanced suggestions"],
  },
] as const

export function StartPlanClient() {
  const searchParams = useSearchParams()
  const [loadingPlan, setLoadingPlan] = useState<"starter" | "plus" | null>(null)
  const [requestError, setRequestError] = useState("")
  const [statusMessage, setStatusMessage] = useState("")

  useEffect(() => {
    const status = searchParams.get("status")
    const planId = searchParams.get("plan")

    if (status === "success" && (planId === "starter" || planId === "plus")) {
      localStorage.setItem(
        SUBSCRIPTION_STORAGE_KEY,
        JSON.stringify({
          planId,
          status: "active",
          activatedAt: new Date().toISOString(),
        })
      )

      window.dispatchEvent(new Event("subscription-changed"))
      setStatusMessage(`Payment complete. ${planId === "starter" ? "Starter" : "Plus"} plan is active.`)
      return
    }

    if (status === "canceled") {
      setStatusMessage("Checkout was canceled. You can try again any time.")
      return
    }

    setStatusMessage("")
  }, [searchParams])

  async function startStripeCheckout(planId: "starter" | "plus") {
    setRequestError("")
    setLoadingPlan(planId)

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
      })

      const payload = (await response.json()) as { message?: string; url?: string }

      if (!response.ok || !payload.url) {
        throw new Error(payload.message || "Could not start checkout")
      }

      window.location.assign(payload.url)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Could not start checkout")
      setLoadingPlan(null)
    }
  }

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-8 px-4 py-10 md:py-14">
      <section className="space-y-4">
        <Badge className="rounded-full px-3 py-1">Subscription</Badge>
        <h1 className="text-4xl leading-tight font-semibold tracking-tight md:text-5xl">Start Your Plan</h1>
        <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
          Pick a plan to unlock full movie details across Home, Categories, and Search.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.id} className="border-muted/80">
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-semibold tracking-tight">{plan.price}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>
              <Button
                className="w-full"
                disabled={loadingPlan !== null}
                onClick={() => startStripeCheckout(plan.id)}
              >
                {loadingPlan === plan.id ? "Redirecting to Stripe..." : `Start ${plan.name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}
      {requestError ? <p className="text-sm text-destructive">{requestError}</p> : null}
    </div>
  )
}
