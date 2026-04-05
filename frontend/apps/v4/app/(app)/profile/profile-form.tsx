"use client"

import { FormEvent, useEffect, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/registry/new-york-v4/ui/avatar"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Input } from "@/registry/new-york-v4/ui/input"
import { Label } from "@/registry/new-york-v4/ui/label"

type ProfileUser = {
  id: string
  name: string
  email: string
  birthDate: string
  username: string | null
  phone: string | null
  pfp: string | null
}

export function ProfileForm() {
  const MAX_IMAGE_FILE_SIZE_BYTES = 2 * 1024 * 1024
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [username, setUsername] = useState("")
  const [phone, setPhone] = useState("")
  const [pfp, setPfp] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  async function parseApiResponse(response: Response) {
    const raw = await response.text()
    try {
      return JSON.parse(raw) as { message?: string; user?: ProfileUser }
    } catch {
      throw new Error(response.ok ? "Unexpected server response" : "Server returned a non-JSON error response")
    }
  }

  function handleLocalImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file")
      return
    }

    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      setMessage("Image must be 2MB or smaller")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      if (!result.startsWith("data:image/")) {
        setMessage("Failed to process image")
        return
      }

      setPfp(result)
      setMessage("Local image selected. Click Save Profile to apply it.")
    }
    reader.onerror = () => {
      setMessage("Failed to read selected image")
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    async function loadProfile() {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        setMessage("Sign in first to edit profile")
        return
      }

      try {
        const response = await fetch("/api/backend/auth/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await parseApiResponse(response)
        if (!response.ok) {
          throw new Error(data.message || "Failed to load profile")
        }

        const user = data.user as ProfileUser
        setName(user.name || "")
        setEmail(user.email || "")
        setBirthDate(user.birthDate ? String(user.birthDate).slice(0, 10) : "")
        setUsername(user.username || "")
        setPhone(user.phone || "")
        setPfp(user.pfp || "")
      } catch (error) {
        if (error instanceof Error) {
          setMessage(error.message)
        } else {
          setMessage("Failed to load profile")
        }
      }
    }

    loadProfile()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setMessage("")

    const token = localStorage.getItem("auth_token")
    if (!token) {
      setMessage("Sign in first to edit profile")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/backend/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          birthDate,
          username,
          phone,
          pfp,
        }),
      })

      const data = await parseApiResponse(response)
      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile")
      }

      localStorage.setItem("auth_user", JSON.stringify(data.user))
      window.dispatchEvent(new Event("auth-changed"))
      setMessage("Profile updated successfully")
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message)
      } else {
        setMessage("Something went wrong")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <Avatar size="lg" className="size-14">
          {pfp ? <AvatarImage src={pfp} alt="Profile picture preview" /> : null}
          <AvatarFallback>{(name || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">Profile Picture Preview</p>
          <p className="text-xs text-muted-foreground">This image appears in the navbar and profile.</p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="profile-name">Name</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          disabled={isLoading}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={email} disabled readOnly />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="profile-birth-date">Birth Date</Label>
        <Input
          id="profile-birth-date"
          type="date"
          value={birthDate}
          onChange={(event) => setBirthDate(event.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="profile-username">Username</Label>
        <Input
          id="profile-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="your_handle"
          disabled={isLoading}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="profile-phone">Phone</Label>
        <Input
          id="profile-phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+1 555 000 0000"
          disabled={isLoading}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="profile-pfp">Profile Image URL</Label>
        <Input
          id="profile-pfp"
          type="text"
          value={pfp}
          onChange={(event) => setPfp(event.target.value)}
          placeholder="https://example.com/avatar.png or data:image/..."
          disabled={isLoading}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="profile-pfp-file">Or Upload From Your Device</Label>
        <Input
          id="profile-pfp-file"
          type="file"
          accept="image/*"
          onChange={handleLocalImageChange}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, GIF up to 2MB.</p>
      </div>

      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Profile"}
      </Button>
    </form>
  )
}
