"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Avatar, AvatarFallback, AvatarImage } from "@/styles/radix-nova/ui/avatar"
import { Button } from "@/styles/radix-nova/ui/button"

export function NavbarAuthActions() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [displayUsername, setDisplayUsername] = useState("")
  const [displayPfp, setDisplayPfp] = useState("")

  useEffect(() => {
    const syncAuthState = () => {
      const token = localStorage.getItem("auth_token")
      const rawUser = localStorage.getItem("auth_user")

      setIsAuthenticated(Boolean(token))

      if (!token || !rawUser) {
        setDisplayUsername("")
        setDisplayPfp("")
        return
      }

      try {
        const user = JSON.parse(rawUser) as { username?: string | null; id?: string; pfp?: string | null }
        const normalizedPfp = (user.pfp || "").trim()
        setDisplayPfp(normalizedPfp)

        const normalizedUsername = (user.username || "").trim()
        if (normalizedUsername) {
          setDisplayUsername(normalizedUsername)
          return
        }

        const fallbackSeed = (user.id || "000000").replace(/[^a-zA-Z0-9]/g, "").slice(-6) || "000000"
        setDisplayUsername(`user${fallbackSeed}`)
      } catch {
        setDisplayUsername("user000000")
        setDisplayPfp("")
      }
    }

    syncAuthState()
    window.addEventListener("storage", syncAuthState)
    window.addEventListener("auth-changed", syncAuthState)

    return () => {
      window.removeEventListener("storage", syncAuthState)
      window.removeEventListener("auth-changed", syncAuthState)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_user")
    setIsAuthenticated(false)
    setDisplayUsername("")
    setDisplayPfp("")
    window.dispatchEvent(new Event("auth-changed"))
    router.push("/sign-in")
    router.refresh()
  }

  if (isAuthenticated) {
    return (
      <>
        <Button asChild size="sm" variant="ghost" className="h-[31px] rounded-lg">
          <Link href="/profile" className="flex items-center gap-2">
            <Avatar size="sm" className="size-6">
              {displayPfp ? <AvatarImage src={displayPfp} alt="Profile picture" /> : null}
              <AvatarFallback>{(displayUsername || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span>{displayUsername || "user000000"}</span>
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="h-[31px] rounded-lg" onClick={handleLogout}>
          Logout
        </Button>
      </>
    )
  }

  return (
    <>
      <Button asChild size="sm" variant="ghost" className="h-[31px] rounded-lg">
        <Link href="/sign-in">Sign In</Link>
      </Button>
      <Button asChild size="sm" className="h-[31px] rounded-lg">
        <Link href="/sign-up">Sign Up</Link>
      </Button>
    </>
  )
}
