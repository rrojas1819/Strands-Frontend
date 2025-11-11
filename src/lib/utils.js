import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Timezone/date helpers for consistent frontend-backend 
export function parseUtc(value) {
  if (!value) return null
  let raw = value
  if (typeof raw === "string") {
    raw = raw.trim()
    if (!raw) return null
    if (raw.includes(" ") && !raw.includes("T")) {
      raw = raw.replace(" ", "T")
    }
    if (!isOffsetAwareIso(raw)) {
      raw = `${raw}Z`
    }
  }
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export function formatLocalDateTime(value, options) {
  const date = value instanceof Date ? value : parseUtc(value)
  if (!date) return ""
  const opts =
    options ||
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  try {
    return new Intl.DateTimeFormat(undefined, opts).format(date)
  } catch {
    return date.toLocaleString()
  }
}

export function formatLocalDate(value, options) {
  const date = value instanceof Date ? value : parseUtc(value)
  if (!date) return ""
  const opts =
    options ||
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: undefined,
    }
  try {
    return new Intl.DateTimeFormat(undefined, opts).format(date)
  } catch {
    return date.toLocaleDateString()
  }
}

export function formatLocalTime(value, options) {
  const date = value instanceof Date ? value : parseUtc(value)
  if (!date) return ""
  const opts =
    options ||
    {
      hour: "numeric",
      minute: "2-digit",
    }
  try {
    return new Intl.DateTimeFormat(undefined, opts).format(date)
  } catch {
    return date.toLocaleTimeString()
  }
}

export function isOffsetAwareIso(str) {
  if (typeof str !== "string") return false
  return /Z$|[+-]\d{2}:\d{2}$/.test(str)
}