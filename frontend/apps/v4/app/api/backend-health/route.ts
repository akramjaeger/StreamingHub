import { NextResponse } from "next/server"

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

export async function GET() {
  try {
    const response = await fetch(`${backendUrl}/api/health`, {
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Backend request failed",
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Could not connect to backend",
      },
      { status: 502 }
    )
  }
}
