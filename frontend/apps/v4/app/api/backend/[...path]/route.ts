import { NextResponse } from "next/server"

const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "")

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] }
}

async function proxyRequest(request: Request, context: RouteContext) {
  const resolvedParams = await context.params
  const path = Array.isArray(resolvedParams.path)
    ? resolvedParams.path.map((segment) => encodeURIComponent(segment))
    : []

  const incomingUrl = new URL(request.url)
  const targetUrl = new URL(`${backendUrl}/api/${path.join("/")}`)
  targetUrl.search = incomingUrl.search

  const headers = new Headers(request.headers)
  headers.delete("host")
  headers.delete("content-length")

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text()
  }

  try {
    const response = await fetch(targetUrl, init)
    const rawBody = await response.text()
    const contentType = response.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      try {
        return NextResponse.json(rawBody ? JSON.parse(rawBody) : {}, { status: response.status })
      } catch {
        return NextResponse.json(
          {
            message: rawBody || response.statusText || "Backend returned an invalid JSON payload",
          },
          { status: response.status }
        )
      }
    }

    return NextResponse.json(
      {
        message: rawBody || response.statusText || "Backend request failed",
      },
      { status: response.status }
    )
  } catch {
    return NextResponse.json(
      {
        message: "Could not connect to backend",
      },
      { status: 502 }
    )
  }
}

export async function GET(request: Request, context: RouteContext) {
  return proxyRequest(request, context)
}

export async function POST(request: Request, context: RouteContext) {
  return proxyRequest(request, context)
}

export async function PUT(request: Request, context: RouteContext) {
  return proxyRequest(request, context)
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxyRequest(request, context)
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxyRequest(request, context)
}
