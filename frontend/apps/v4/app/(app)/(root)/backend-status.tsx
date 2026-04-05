"use client"

import { useEffect, useState } from "react"

import { Badge } from "@/registry/new-york-v4/ui/badge"

type Status = {
  ok: boolean
  message: string
}

export function BackendStatus() {
  const [status, setStatus] = useState<Status | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadStatus() {
      try {
        const response = await fetch("/api/backend-health", { cache: "no-store" })

        if (!response.ok) {
          throw new Error("Backend not reachable")
        }

        const data = (await response.json()) as Status

        if (isMounted) {
          setStatus(data)
        }
      } catch {
        if (isMounted) {
          setStatus({ ok: false, message: "Could not connect to backend" })
        }
      }
    }

    loadStatus()

    return () => {
      isMounted = false
    }
  }, [])

  if (!status) {
    return <Badge variant="outline">Checking...</Badge>
  }

  return (
    <Badge variant={status.ok ? "default" : "destructive"}>
      {status.message}
    </Badge>
  )
}
