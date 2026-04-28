"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { PAGES_NEW } from "@/lib/docs"
import { getCurrentUserRole, type UserRole } from "@/lib/user-storage"
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
  const [userRole, setUserRole] = useState<UserRole>("anonymous")

  useEffect(() => {
    const syncUserRole = () => {
      setUserRole(getCurrentUserRole())
    }

    syncUserRole()
    window.addEventListener("storage", syncUserRole)
    window.addEventListener("auth-changed", syncUserRole)

    return () => {
      window.removeEventListener("storage", syncUserRole)
      window.removeEventListener("auth-changed", syncUserRole)
    }
  }, [])

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (item.href !== "/management" || userRole === "admin") &&
          (item.href !== "/watchlist" || userRole === "regular") &&
          (item.href !== "/watch-history" || userRole === "regular")
      ),
    [items, userRole]
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
