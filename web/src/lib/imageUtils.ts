/**
 * Supabase Storage Image Transformation utilities.
 *
 * Supabase can resize images on-the-fly by swapping `/object/` → `/render/image/`
 * in the public URL and appending width/height/resize query params.
 *
 * PREREQUISITE: Enable Image Transformations in Supabase Dashboard:
 *   Project Settings → Add-ons → Image Transformations → Enable
 *
 * Set NEXT_PUBLIC_ENABLE_IMAGE_TRANSFORMS=true in .env.local to activate.
 *
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 */

type ResizeMode = 'cover' | 'contain' | 'fill'

interface ThumbnailOptions {
  width?: number
  height?: number
  resize?: ResizeMode
  quality?: number
}

const SUPABASE_OBJECT_PATH = '/storage/v1/object/public/'
const SUPABASE_RENDER_PATH = '/storage/v1/render/image/public/'

const TRANSFORMS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_IMAGE_TRANSFORMS === 'true'

/**
 * Converts a Supabase Storage public URL into a transformed (resized) URL.
 * Returns the original URL unchanged if transforms are disabled or it's not a Supabase URL.
 */
export function getThumbUrl(
  url: string,
  { width = 300, height = 300, resize = 'cover', quality = 75 }: ThumbnailOptions = {}
): string {
  if (!TRANSFORMS_ENABLED || !url || !url.includes(SUPABASE_OBJECT_PATH)) return url

  const renderUrl = url.replace(SUPABASE_OBJECT_PATH, SUPABASE_RENDER_PATH)
  const params = new URLSearchParams({ width: String(width), height: String(height), resize, quality: String(quality) })

  return `${renderUrl}?${params.toString()}`
}
