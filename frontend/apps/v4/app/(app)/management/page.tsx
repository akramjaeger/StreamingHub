"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { Badge } from "@/registry/new-york-v4/ui/badge"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/registry/new-york-v4/ui/card"
import { ChartContainer, type ChartConfig, ChartTooltip, ChartTooltipContent } from "@/registry/new-york-v4/ui/chart"
import { Input } from "@/registry/new-york-v4/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/registry/new-york-v4/ui/table"

import { ManagementPlansSection } from "./management-plans-section"

type AdminState = "checking" | "allowed" | "denied"
type ManagedUser = {
  id: string
  name: string
  email: string
  username: string | null
  birthDate: string
  phone: string | null
  pfp: string | null
  createdAt: string
}

const ADMIN_EMAIL = "admin@gmail.com"

function isPrimaryAdminUser(user: Pick<ManagedUser, "email">) {
  return String(user.email || "")
    .trim()
    .toLowerCase() === ADMIN_EMAIL
}

const registrationChartConfig = {
  users: {
    label: "Users",
    color: "#93c5fd",
  },
} satisfies ChartConfig

const profileChartConfig = {
  count: {
    label: "Users",
    color: "#fdba74",
  },
} satisfies ChartConfig

export default function ManagementPage() {
  const [adminState, setAdminState] = useState<AdminState>("checking")
  const [adminName, setAdminName] = useState("Admin")
  const [token, setToken] = useState("")
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [usersMessage, setUsersMessage] = useState("")
  const [editingUserId, setEditingUserId] = useState("")
  const [draftName, setDraftName] = useState("")
  const [draftUsername, setDraftUsername] = useState("")
  const [draftPhone, setDraftPhone] = useState("")
  const [savingUserId, setSavingUserId] = useState("")
  const [deletingUserId, setDeletingUserId] = useState("")

  async function parseApiResponse(response: Response) {
    const raw = await response.text()
    try {
      return JSON.parse(raw) as { message?: string; users?: ManagedUser[]; user?: ManagedUser }
    } catch {
      throw new Error(response.ok ? "Unexpected server response" : "Server returned a non-JSON error response")
    }
  }

  const registrationChartData = useMemo(() => {
    const now = new Date()
    const buckets = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const label = date.toLocaleString("en-US", { month: "short" })
      return { key, label, users: 0 }
    })

    for (const user of users) {
      const created = new Date(user.createdAt)
      if (Number.isNaN(created.getTime())) {
        continue
      }
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`
      const bucket = buckets.find((entry) => entry.key === key)
      if (bucket) {
        bucket.users += 1
      }
    }

    return buckets
  }, [users])

  const profileCompletionData = useMemo(() => {
    const withUsername = users.filter((user) => Boolean((user.username || "").trim())).length
    const withPhone = users.filter((user) => Boolean((user.phone || "").trim())).length
    const withAvatar = users.filter((user) => Boolean((user.pfp || "").trim())).length

    return [
      { metric: "Username", count: withUsername },
      { metric: "Phone", count: withPhone },
      { metric: "Avatar", count: withAvatar },
    ]
  }, [users])

  const dashboardStats = useMemo(
    () => [
      { label: "Total Users", value: String(users.length), note: "Accounts in the platform" },
      {
        label: "Profiles With Username",
        value: String(users.filter((user) => Boolean((user.username || "").trim())).length),
        note: "Ready for public identity",
      },
      {
        label: "Profiles With Avatar",
        value: String(users.filter((user) => Boolean((user.pfp || "").trim())).length),
        note: "Visual profile configured",
      },
      {
        label: "Profiles With Phone",
        value: String(users.filter((user) => Boolean((user.phone || "").trim())).length),
        note: "Additional contact available",
      },
    ],
    [users]
  )

  async function loadUsers(nextToken: string) {
    if (!nextToken) {
      return
    }

    setIsLoadingUsers(true)
    setUsersMessage("")

    try {
      const response = await fetch("/api/backend/admin/users", {
        headers: {
          Authorization: `Bearer ${nextToken}`,
        },
      })

      const data = await parseApiResponse(response)
      if (!response.ok) {
        throw new Error(data.message || "Failed to load users")
      }

      const safeUsers = (data.users || []).filter((user) => !isPrimaryAdminUser(user))
      setUsers(safeUsers)
    } catch (error) {
      if (error instanceof Error) {
        setUsersMessage(error.message)
      } else {
        setUsersMessage("Failed to load users")
      }
    } finally {
      setIsLoadingUsers(false)
    }
  }

  function beginEdit(user: ManagedUser) {
    if (isPrimaryAdminUser(user)) {
      setUsersMessage("Primary admin account cannot be edited")
      return
    }

    setEditingUserId(user.id)
    setDraftName(user.name || "")
    setDraftUsername(user.username || "")
    setDraftPhone(user.phone || "")
    setUsersMessage("")
  }

  function cancelEdit() {
    setEditingUserId("")
    setDraftName("")
    setDraftUsername("")
    setDraftPhone("")
  }

  async function saveUser(userId: string) {
    if (!token) {
      setUsersMessage("Sign in again to continue")
      return
    }

    setSavingUserId(userId)
    setUsersMessage("")

    try {
      const response = await fetch(`/api/backend/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: draftName,
          username: draftUsername,
          phone: draftPhone,
        }),
      })

      const data = await parseApiResponse(response)
      if (!response.ok) {
        throw new Error(data.message || "Failed to update user")
      }

      const updatedUser = data.user
      if (!updatedUser) {
        throw new Error("Missing updated user in response")
      }

      setUsers((current) => current.map((user) => (user.id === userId ? updatedUser : user)))
      setUsersMessage("User updated successfully")
      cancelEdit()
    } catch (error) {
      if (error instanceof Error) {
        setUsersMessage(error.message)
      } else {
        setUsersMessage("Failed to update user")
      }
    } finally {
      setSavingUserId("")
    }
  }

  async function deleteUser(user: ManagedUser) {
    if (isPrimaryAdminUser(user)) {
      setUsersMessage("Primary admin account cannot be deleted")
      return
    }

    if (!token) {
      setUsersMessage("Sign in again to continue")
      return
    }

    const confirmed = window.confirm(`Delete ${user.email}? This cannot be undone.`)
    if (!confirmed) {
      return
    }

    setDeletingUserId(user.id)
    setUsersMessage("")

    try {
      const response = await fetch(`/api/backend/admin/users/${user.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await parseApiResponse(response)
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete user")
      }

      setUsers((current) => current.filter((entry) => entry.id !== user.id))
      setUsersMessage("User deleted successfully")
      if (editingUserId === user.id) {
        cancelEdit()
      }
    } catch (error) {
      if (error instanceof Error) {
        setUsersMessage(error.message)
      } else {
        setUsersMessage("Failed to delete user")
      }
    } finally {
      setDeletingUserId("")
    }
  }

  useEffect(() => {
    const syncAdmin = () => {
      const localToken = localStorage.getItem("auth_token")
      const rawUser = localStorage.getItem("auth_user")

      if (!localToken || !rawUser) {
        setAdminState("denied")
        setAdminName("Admin")
        setToken("")
        setUsers([])
        return
      }

      try {
        const user = JSON.parse(rawUser) as { email?: string | null; username?: string | null; name?: string | null }
        const normalizedEmail = String(user.email || "")
          .trim()
          .toLowerCase()

        if (normalizedEmail !== ADMIN_EMAIL) {
          setAdminState("denied")
          setAdminName("Admin")
          setToken("")
          setUsers([])
          return
        }

        setAdminName((user.username || user.name || "Admin").trim() || "Admin")
        setToken(localToken)
        setAdminState("allowed")
      } catch {
        setAdminState("denied")
        setAdminName("Admin")
        setToken("")
        setUsers([])
      }
    }

    syncAdmin()
    window.addEventListener("storage", syncAdmin)
    window.addEventListener("auth-changed", syncAdmin)

    return () => {
      window.removeEventListener("storage", syncAdmin)
      window.removeEventListener("auth-changed", syncAdmin)
    }
  }, [])

  useEffect(() => {
    if (adminState === "allowed" && token) {
      loadUsers(token)
    }
  }, [adminState, token])

  if (adminState === "checking") {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Checking permissions...</CardTitle>
            <CardDescription>
              Validating management access for this account.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (adminState === "denied") {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <Badge className="w-fit rounded-full border border-red-300 bg-red-500/15 text-red-100 hover:bg-red-500/15">
              Access Restricted
            </Badge>
            <CardTitle className="text-2xl">Management is admin-only</CardTitle>
            <CardDescription>
              Sign in with {ADMIN_EMAIL} to use dashboard and management tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Back Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-8 px-4 py-10 md:gap-10 md:py-14">
        <section className="space-y-4">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-[11px] tracking-[0.2em] uppercase"
          >
            Admin Console
          </Badge>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl leading-[0.95] font-semibold tracking-tight md:text-6xl">Management Dashboard</h1>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                Welcome back, {adminName}. Manage content, monitor providers, and run platform operations from one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/live">Open Live Monitor</Link>
              </Button>
              <Button asChild>
                <Link href="/categories">Open Content Lab</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {dashboardStats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-1">
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-3xl">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">{stat.note}</CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>User Registrations (6 Months)</CardTitle>
              <CardDescription>Tracks account creation trend by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={registrationChartConfig} className="h-[240px] w-full">
                <LineChart data={registrationChartData} margin={{ left: 6, right: 6, top: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <Line type="monotone" dataKey="users" stroke="var(--color-users)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile Completion</CardTitle>
              <CardDescription>How many users filled key profile fields</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={profileChartConfig} className="h-[240px] w-full">
                <BarChart data={profileCompletionData} margin={{ left: 6, right: 6, top: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="metric" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">User Management</h2>
            <Button
              variant="outline"
              onClick={() => loadUsers(token)}
              disabled={isLoadingUsers || !token}
            >
              {isLoadingUsers ? "Refreshing..." : "Refresh Users"}
            </Button>
          </div>

          {usersMessage ? <p className="text-sm text-muted-foreground">{usersMessage}</p> : null}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const isEditing = editingUserId === user.id
                    const isBusy = savingUserId === user.id || deletingUserId === user.id

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={draftName}
                              onChange={(event) => setDraftName(event.target.value)}
                              disabled={isBusy}
                              className="bg-background"
                            />
                          ) : (
                            user.name
                          )}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={draftUsername}
                              onChange={(event) => setDraftUsername(event.target.value)}
                              disabled={isBusy}
                              className="bg-background"
                            />
                          ) : (
                            user.username || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={draftPhone}
                              onChange={(event) => setDraftPhone(event.target.value)}
                              disabled={isBusy}
                              className="bg-background"
                            />
                          ) : (
                            user.phone || "-"
                          )}
                        </TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => saveUser(user.id)}
                                  disabled={isBusy || draftName.trim().length < 2}
                                >
                                  {savingUserId === user.id ? "Saving..." : "Save"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEdit}
                                  disabled={isBusy}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" onClick={() => beginEdit(user)}>
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteUser(user)}
                                  disabled={deletingUserId === user.id}
                                >
                                  {deletingUserId === user.id ? "Deleting..." : "Delete"}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {!users.length && !isLoadingUsers ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <ManagementPlansSection token={token} />

        <section className="rounded-3xl border bg-card p-6 shadow-sm md:p-8">
          <h3 className="text-xl font-semibold">Admin Notes</h3>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            This console is restricted to {ADMIN_EMAIL}. Keep operational changes documented, and verify provider health after configuration edits.
          </p>
        </section>
    </div>
  )
}
