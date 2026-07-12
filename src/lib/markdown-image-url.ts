/**
 * Heuristics for when a link href is likely a direct image we should try to render.
 * Non-matches still work as normal links; ambiguous URLs can use markdown `![alt](url)`.
 */

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg|avif|bmp|ico)(\?|#|$)/i

function pathnameRoughly(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

export function shouldAttemptImageEmbed(url: string): boolean {
  const u = url.trim()
  if (!u) return false
  try {
    const parsed = new URL(u)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false
  } catch {
    return false
  }
  const lower = u.toLowerCase()
  if (
    lower.includes("youtube.com") ||
    lower.includes("youtu.be") ||
    lower.includes("loom.com") ||
    lower.includes("vimeo.com")
  ) {
    return false
  }
  const pathOnly = pathnameRoughly(u)
  if (IMAGE_EXT.test(pathOnly)) return true

  const host = (() => {
    try {
      return new URL(u).hostname.toLowerCase()
    } catch {
      return ""
    }
  })()

  const imageHosts = [
    "firebasestorage.googleapis.com",
    "lh3.googleusercontent.com",
    "imgur.com",
    "i.imgur.com",
    "cloudinary.com",
    "images.unsplash.com",
    "pbs.twimg.com",
    "cdn.discordapp.com",
  ]
  return imageHosts.some((h) => host === h || host.endsWith(`.${h}`))
}
