import type { PracticeItemEmbeddedVideo } from "@/lib/types"

/** Spotify share or embed URLs → open.spotify.com/embed/… iframe src */
export function getSpotifyEmbedUrl(url: string): string | null {
  const u = url.trim()
  const embedAlready = u.match(
    /^https?:\/\/open\.spotify\.com\/embed\/(track|episode|show|playlist|album)\/([^/?#]+)/i
  )
  if (embedAlready) {
    return `https://open.spotify.com/embed/${embedAlready[1]}/${embedAlready[2]}`
  }
  const share = u.match(
    /^https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|episode|show|playlist|album)\/([^/?#]+)/i
  )
  if (share) {
    return `https://open.spotify.com/embed/${share[1]}/${share[2]}`
  }
  return null
}

function safeDecodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/**
 * Converts video URLs (YouTube, Loom, Riverside, etc.) to embeddable iframe URLs.
 */
export function getVideoEmbedUrl(url: string): string | null {
  if (!url?.trim()) return null
  const u = url.trim()

  // YouTube: watch?v=ID, youtu.be/ID, shorts/ID, /embed/ID
  const youtubeMatch = u.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  )
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`
  }
  const youtubeEmbedPath = u.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i)
  if (youtubeEmbedPath) {
    return `https://www.youtube.com/embed/${youtubeEmbedPath[1]}`
  }

  // Loom: share or embed (IDs can include hyphens; strip query/hash from path segment)
  const loomEmbedMatch = u.match(/loom\.com\/embed\/([^/?#]+)/i)
  if (loomEmbedMatch) {
    return `https://www.loom.com/embed/${safeDecodePathSegment(loomEmbedMatch[1])}`
  }
  const loomShareMatch = u.match(/loom\.com\/share\/([^/?#]+)/i)
  if (loomShareMatch) {
    return `https://www.loom.com/embed/${safeDecodePathSegment(loomShareMatch[1])}`
  }

  // Vimeo
  const vimeoMatch = u.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }

  const spotify = getSpotifyEmbedUrl(u)
  if (spotify) return spotify

  // Unknown providers should NOT be embedded (avoid blank/blocked iframes).
  return null
}

/** YouTube or Loom only — for inline embeds in markdown lesson bodies. */
export function getYoutubeLoomEmbedSrc(url: string): string | null {
  const u = (url ?? "").trim()
  if (!u) return null
  const lower = u.toLowerCase()
  const isYt = lower.includes("youtube.com") || lower.includes("youtu.be")
  const isLoom = lower.includes("loom.com")
  if (!isYt && !isLoom) return null
  return getVideoEmbedUrl(u)
}

export function isEmbeddableUrl(url: string): boolean {
  return !!getVideoEmbedUrl(url)
}

/**
 * Find http(s) URLs in plain text that map to a video embed (YouTube, Loom, Vimeo, etc.).
 * Trailing punctuation is stripped from matched URLs.
 */
export function findEmbeddableVideoUrlsInText(text: string): Array<{ original: string; embedUrl: string }> {
  if (!text?.trim()) return []
  const urlPattern = /https?:\/\/[^\s<>\])}'"]+/gi
  const raw = text.match(urlPattern) ?? []
  const out: Array<{ original: string; embedUrl: string }> = []
  const seenEmbed = new Set<string>()
  for (let u of raw) {
    const cleaned = u.replace(/[),.;!?]+$/g, "")
    const embed = getVideoEmbedUrl(cleaned)
    if (embed && !seenEmbed.has(embed)) {
      seenEmbed.add(embed)
      out.push({ original: cleaned, embedUrl: embed })
    }
  }
  return out
}

/**
 * Strict embed URL for a known provider (YouTube, Loom, Riverside, Spotify).
 * Returns null if URL is empty, invalid, or does not match the provider (no iframe should be rendered).
 */
export function getSafeEmbedUrl(
  provider: PracticeItemEmbeddedVideo["provider"],
  url: string | undefined
): string | null {
  const u = (url ?? "").trim()
  if (!u) return null

  const lower = u.toLowerCase()
  const isYouTube = lower.includes("youtube") || lower.includes("youtu.be")
  const isLoom = lower.includes("loom.com")
  const isRiverside =
    lower.includes("riverside.fm") ||
    lower.includes("riverside.com") ||
    lower.includes("share.riverside")
  const isSpotify = lower.includes("spotify")

  switch (provider) {
    case "youtube":
      if (!isYouTube) return null
      const ytFromGeneric = getVideoEmbedUrl(u)
      if (ytFromGeneric?.includes("youtube.com/embed")) return ytFromGeneric
      const yt = u.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
      )
      return yt ? `https://www.youtube.com/embed/${yt[1]}` : null
    case "loom":
      if (!isLoom) return null
      const loomFromGeneric = getVideoEmbedUrl(u)
      if (loomFromGeneric?.includes("loom.com/embed")) return loomFromGeneric
      const loomEmbed = u.match(/loom\.com\/embed\/([^/?#]+)/i)
      const loomShare = u.match(/loom\.com\/share\/([^/?#]+)/i)
      if (loomEmbed) return `https://www.loom.com/embed/${safeDecodePathSegment(loomEmbed[1])}`
      if (loomShare) return `https://www.loom.com/embed/${safeDecodePathSegment(loomShare[1])}`
      return null
    case "riverside":
      if (!isRiverside) return null
      return u.split(/[?#]/)[0] || u
    case "spotify":
      if (!isSpotify) return null
      return getSpotifyEmbedUrl(u)
    default:
      return null
  }
}

/** URL shape only (YouTube, Loom, Vimeo, Spotify, Riverside). Ignores stored provider. */
function inferEmbedSrcFromUrl(url: string): string | null {
  const u = url.trim()
  const generic = getVideoEmbedUrl(u)
  if (generic) return generic
  const lower = u.toLowerCase()
  if (
    lower.includes("riverside.fm") ||
    lower.includes("riverside.com") ||
    lower.includes("share.riverside")
  ) {
    return u.split(/[?#]/)[0] || u
  }
  return null
}

/**
 * Resolves an iframe src for course/practice embeds: detects from URL first (so the correct embed
 * is used even if the form provider is wrong), then uses the selected provider and cross-provider fallbacks.
 */
export function resolveLessonVideoEmbedSrc(embedded: PracticeItemEmbeddedVideo): string | null {
  const url = embedded.url?.trim()
  if (!url) return null

  const inferred = inferEmbedSrcFromUrl(url)
  if (inferred) return inferred

  const fromProvider = getSafeEmbedUrl(embedded.provider, url)
  if (fromProvider) return fromProvider

  for (const p of ["youtube", "loom", "riverside", "spotify"] as const) {
    if (p === embedded.provider) continue
    const s = getSafeEmbedUrl(p, url)
    if (s) return s
  }

  return null
}
