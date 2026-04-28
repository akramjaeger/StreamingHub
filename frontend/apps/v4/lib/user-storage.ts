const ADMIN_EMAIL = "admin@gmail.com"

export const WATCHLIST_STORAGE_KEY = "streamhub_watchlist"
export const WATCH_HISTORY_STORAGE_KEY = "streamhub_watch_history"

export type AuthUserRecord = {
  id?: string | null
  email?: string | null
  username?: string | null
  name?: string | null
}

export type MediaIdentity = {
  id: string
  title: string
  year: string
  poster: string
}

export type WatchlistEntry = MediaIdentity & {
  addedAt: string
}

export type WatchHistoryEntry = MediaIdentity & {
  watchedAt: string
}

export type UserRole = "anonymous" | "admin" | "regular"

function normalizeValue(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

function readAuthUser() {
  if (typeof window === "undefined") {
    return null
  }

  const raw = localStorage.getItem("auth_user")
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthUserRecord
  } catch {
    return null
  }
}

function getIdentityKey(user: AuthUserRecord | null) {
  if (!user) {
    return ""
  }

  return normalizeValue(user.id) || normalizeValue(user.email) || normalizeValue(user.username) || normalizeValue(user.name)
}

export function getCurrentUserRole(): UserRole {
  if (typeof window === "undefined") {
    return "anonymous"
  }

  const token = localStorage.getItem("auth_token")
  const user = readAuthUser()

  if (!token || !user) {
    return "anonymous"
  }

  if (normalizeValue(user.email) === ADMIN_EMAIL) {
    return "admin"
  }

  return "regular"
}

export function getCurrentUserStorageKey(namespace: string) {
  if (getCurrentUserRole() !== "regular") {
    return null
  }

  const identity = getIdentityKey(readAuthUser())
  if (!identity) {
    return null
  }

  return `${namespace}:${encodeURIComponent(identity)}`
}

export function loadStoredEntries<T>(storageKey: string | null, legacyKey?: string | null) {
  if (typeof window === "undefined" || !storageKey) {
    return [] as T[]
  }

  try {
    const primaryRaw = localStorage.getItem(storageKey)
    const fallbackRaw = legacyKey && legacyKey !== storageKey ? localStorage.getItem(legacyKey) : null
    const source = primaryRaw || fallbackRaw

    if (!source) {
      return [] as T[]
    }

    const parsed = JSON.parse(source) as unknown
    return Array.isArray(parsed) ? (parsed as T[]) : ([] as T[])
  } catch {
    return [] as T[]
  }
}

export function saveStoredEntries<T>(storageKey: string | null, entries: T[]) {
  if (typeof window === "undefined" || !storageKey) {
    return
  }

  localStorage.setItem(storageKey, JSON.stringify(entries))
}

export function loadCurrentUserWatchlist() {
  return loadStoredEntries<WatchlistEntry>(getCurrentUserStorageKey(WATCHLIST_STORAGE_KEY), WATCHLIST_STORAGE_KEY)
}

export function saveCurrentUserWatchlistItem(item: MediaIdentity) {
  const storageKey = getCurrentUserStorageKey(WATCHLIST_STORAGE_KEY)
  if (!storageKey) {
    return false
  }

  const existing = loadStoredEntries<WatchlistEntry>(storageKey, WATCHLIST_STORAGE_KEY)
  if (existing.some((entry) => entry.id === item.id)) {
    return true
  }

  const next: WatchlistEntry[] = [
    {
      ...item,
      addedAt: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, 300)

  saveStoredEntries(storageKey, next)
  return true
}

export function clearCurrentUserWatchlist() {
  const storageKey = getCurrentUserStorageKey(WATCHLIST_STORAGE_KEY)
  if (!storageKey) {
    return false
  }

  saveStoredEntries<WatchlistEntry>(storageKey, [])
  return true
}

export function loadCurrentUserWatchHistory() {
  return loadStoredEntries<WatchHistoryEntry>(getCurrentUserStorageKey(WATCH_HISTORY_STORAGE_KEY))
}

export function saveCurrentUserWatchHistoryItem(item: MediaIdentity) {
  const storageKey = getCurrentUserStorageKey(WATCH_HISTORY_STORAGE_KEY)
  if (!storageKey) {
    return false
  }

  const existing = loadStoredEntries<WatchHistoryEntry>(storageKey)
  const next: WatchHistoryEntry[] = [
    {
      ...item,
      watchedAt: new Date().toISOString(),
    },
    ...existing.filter((entry) => entry.id !== item.id),
  ].slice(0, 300)

  saveStoredEntries(storageKey, next)
  return true
}

export function clearCurrentUserWatchHistory() {
  const storageKey = getCurrentUserStorageKey(WATCH_HISTORY_STORAGE_KEY)
  if (!storageKey) {
    return false
  }

  saveStoredEntries<WatchHistoryEntry>(storageKey, [])
  return true
}