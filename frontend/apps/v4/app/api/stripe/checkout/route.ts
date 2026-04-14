import { NextResponse } from "next/server"
import Stripe from "stripe"

type CheckoutRequest = {
  planId?: "starter" | "plus"
}

const PLAN_TO_PRICE_ENV: Record<"starter" | "plus", string> = {
  starter: "STRIPE_PRICE_STARTER_ID",
  plus: "STRIPE_PRICE_PLUS_ID",
}

function getBaseUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured) {
    return configured.replace(/\/$/, "")
  }

  const origin = request.headers.get("origin")
  if (origin) {
    return origin.replace(/\/$/, "")
  }

  return "http://localhost:4000"
}

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json({ message: "Missing STRIPE_SECRET_KEY" }, { status: 500 })
  }

  let body: CheckoutRequest
  try {
    body = (await request.json()) as CheckoutRequest
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 })
  }

  const planId = body.planId
  if (!planId || !(planId in PLAN_TO_PRICE_ENV)) {
    return NextResponse.json({ message: "Invalid plan selected" }, { status: 400 })
  }

  const priceEnvKey = PLAN_TO_PRICE_ENV[planId]
  const priceId = process.env[priceEnvKey]
  if (!priceId) {
    return NextResponse.json({ message: `Missing ${priceEnvKey}` }, { status: 500 })
  }

  if (priceId === "price_xxx") {
    return NextResponse.json(
      { message: `Replace placeholder ${priceEnvKey} with a real Stripe Price ID` },
      { status: 500 }
    )
  }

  const stripe = new Stripe(stripeSecretKey)
  const baseUrl = getBaseUrl(request)

  try {
    let checkoutPriceId = priceId

    // Allow using either a Stripe Price ID (price_*) or Product ID (prod_*).
    if (priceId.startsWith("prod_")) {
      const product = await stripe.products.retrieve(priceId, {
        expand: ["default_price"],
      })

      if ("deleted" in product && product.deleted) {
        return NextResponse.json({ message: `Product ${priceId} is deleted` }, { status: 500 })
      }

      const defaultPrice = product.default_price
      checkoutPriceId = typeof defaultPrice === "string" ? defaultPrice : defaultPrice?.id || ""

      if (!checkoutPriceId) {
        return NextResponse.json(
          { message: `Product ${priceId} has no default price. Set a default recurring price in Stripe.` },
          { status: 500 }
        )
      }
    }

    if (!checkoutPriceId.startsWith("price_")) {
      return NextResponse.json(
        { message: `${priceEnvKey} must be a Stripe Price ID (price_*) or Product ID (prod_*)` },
        { status: 500 }
      )
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: checkoutPriceId, quantity: 1 }],
      success_url: `${baseUrl}/start-plan?status=success&plan=${planId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/start-plan?status=canceled&plan=${planId}`,
      metadata: { planId },
    })

    if (!session.url) {
      return NextResponse.json({ message: "Stripe did not return a checkout URL" }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const stripeMessage =
      error instanceof Stripe.errors.StripeError
        ? error.message
        : "Could not create Stripe checkout session"

    return NextResponse.json({ message: stripeMessage }, { status: 500 })
  }
}
