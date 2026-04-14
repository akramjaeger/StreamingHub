"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { PAGES_NEW } from "@/lib/docs"
import { cn } from "@/lib/utils"
import { Button } from "@/registry/new-york-v4/ui/button"

export function MainNav({
  items,
  className,
  ...props
}: React.ComponentProps<"nav"> & {
  items: { href: string; label: string }[]
}) {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const syncAdminState = () => {
      const rawUser = localStorage.getItem("auth_user")
      if (!rawUser) {
        setIsAdmin(false)
        return
      }

      try {
        const user = JSON.parse(rawUser) as { email?: string | null }
        const normalizedEmail = String(user.email || "")
          .trim()
          .toLowerCase()
        setIsAdmin(normalizedEmail === "admin@gmail.com")
      } catch {
        setIsAdmin(false)
      }
    }

    syncAdminState()
    window.addEventListener("storage", syncAdminState)
    window.addEventListener("auth-changed", syncAdminState)

    return () => {
      window.removeEventListener("storage", syncAdminState)
      window.removeEventListener("auth-changed", syncAdminState)
    }
  }, [])

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (item.href !== "/management" || isAdmin) &&
          (item.href !== "/watchlist" || !isAdmin)
      ),
    [isAdmin, items]
  )

  return (
    <nav className={cn("items-center gap-0", className)} {...props}>
      {visibleItems.map((item) => (
        <Button
          key={item.href}
          variant="ghost"
          asChild
          size="sm"
          className="px-2.5"
        >
          <Link
            href={item.href}
            data-active={pathname === item.href}
            data-new={PAGES_NEW.includes(item.href)}
            className={cn(
              "relative items-center rounded-md px-2 py-1",
              item.href === "/start-plan" &&
                "border border-primary/50 bg-primary/10 font-semibold text-primary"
            )}
          >
            {item.label}
          </Link>
        </Button>
      ))}
    </nav>
  )
}
