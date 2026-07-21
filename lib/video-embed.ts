/**
 * Converts a YouTube/Vimeo watch/share URL (as stored in `mindsetter_profiles.promo_video` /
 * `.video_blog`, already host-restricted at write time by `youtubeUrlField`/`vimeoUrlField` in
 * `lib/validation/mindsetter.ts`) into an `<iframe src>` embed URL. No third-party oEmbed call —
 * a small regex-based extraction, same "just enough" precedent as this repo's other one-off
 * URL helpers (e.g. `isSafeHttpUrl` in `MemberProfileView.tsx`).
 *
 * Returns `null` when the URL doesn't match a recognizable YouTube/Vimeo watch-URL shape — the
 * caller should treat that as "can't embed" rather than rendering a broken iframe.
 */
export function toEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = parsed.pathname.replace(/^\//, '');
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    if (parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.pathname.startsWith('/embed/')) {
      return parsed.toString();
    }
    if (parsed.pathname.startsWith('/shorts/')) {
      const id = parsed.pathname.split('/')[2];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  }
  if (host === 'vimeo.com') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (host === 'player.vimeo.com') {
    return parsed.toString();
  }
  return null;
}
