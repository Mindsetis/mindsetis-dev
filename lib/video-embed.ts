/**
 * Parsing, validation and embedding for the YouTube/Vimeo links stored in
 * `mindsetter_profiles.promo_video` / `.video_blog`.
 *
 * One parser backs three jobs so they can't disagree: the Zod refine that decides whether a pasted
 * link is acceptable, the `<iframe src>` builder, and the orientation the profile lays the section
 * out with. No third-party call happens here — it is all URL shape — with one exception noted on
 * `fetchVimeoOrientation`, which Vimeo genuinely requires.
 */

/** How the profile lays out the promo block: 16:9 landscape vs a Shorts-style 9:16 portrait. */
export type VideoOrientation = 'horizontal' | 'vertical';

export type ParsedVideo = {
  provider: 'youtube' | 'vimeo';
  /** Bare video id — the `<iframe>` src is built from this, never from the raw input. */
  id: string;
  /**
   * What the URL alone can tell us. A YouTube `/shorts/` link is portrait by definition; anything
   * else on YouTube is 16:9. A Vimeo link says nothing either way, hence `null` — resolve it with
   * `fetchVimeoOrientation` at write time.
   */
  orientation: VideoOrientation | null;
};

/** YouTube ids are 11 chars of the URL-safe base64 alphabet; Vimeo ids are numeric. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d+$/;

/**
 * Strictly parse a watch/share/embed link, or return `null`.
 *
 * Deliberately narrow: the previous validation only checked the HOST, so a channel page, a
 * playlist, a search results page or `youtube.com` itself all passed and then rendered as a blank
 * iframe. Everything here must resolve to one concrete video id.
 */
export function parseVideoUrl(url: string | null | undefined): ParsedVideo | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const segments = parsed.pathname.split('/').filter(Boolean);

  // youtu.be/<id>
  if (host === 'youtu.be') {
    const id = segments[0];
    return id && YOUTUBE_ID.test(id)
      ? { provider: 'youtube', id, orientation: 'horizontal' }
      : null;
  }

  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    // /watch?v=<id>
    if (parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v');
      return id && YOUTUBE_ID.test(id)
        ? { provider: 'youtube', id, orientation: 'horizontal' }
        : null;
    }
    // /shorts/<id> — the one URL shape that states its own orientation.
    if (segments[0] === 'shorts') {
      const id = segments[1];
      return id && YOUTUBE_ID.test(id)
        ? { provider: 'youtube', id, orientation: 'vertical' }
        : null;
    }
    // /embed/<id> and /live/<id> — accepted because people do paste them.
    if (segments[0] === 'embed' || segments[0] === 'live') {
      const id = segments[1];
      return id && YOUTUBE_ID.test(id)
        ? { provider: 'youtube', id, orientation: 'horizontal' }
        : null;
    }
    return null;
  }

  // vimeo.com/<id>, vimeo.com/<id>/<hash> (unlisted), player.vimeo.com/video/<id>
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = segments[0] === 'video' ? segments[1] : segments[0];
    return id && VIMEO_ID.test(id) ? { provider: 'vimeo', id, orientation: null } : null;
  }

  return null;
}

/** True for a link that resolves to one concrete video — what the form fields accept. */
export function isSupportedVideoUrl(url: string): boolean {
  return parseVideoUrl(url) !== null;
}

/**
 * `<iframe src>` for a stored link, or `null` when it isn't embeddable.
 *
 * Built from the parsed id rather than passing the caller's URL through, so query junk (playlist
 * ids, timestamps, tracking params) never reaches the embed.
 */
export function toEmbedUrl(url: string | null | undefined): string | null {
  const video = parseVideoUrl(url);
  if (!video) return null;
  return video.provider === 'youtube'
    ? `https://www.youtube.com/embed/${video.id}`
    : `https://player.vimeo.com/video/${video.id}`;
}

/**
 * Ask Vimeo how big the video is, so a portrait upload gets the portrait layout.
 *
 * Vimeo's URL carries no orientation — unlike YouTube, where `/shorts/` says it outright — so this
 * is the only way to know. Uses the public oEmbed endpoint, which needs no API key or token for a
 * public video.
 *
 * Best-effort by design: a private/deleted video, a network failure or a slow response all fall
 * back to `'horizontal'` rather than failing the save. Getting the layout wrong is a cosmetic
 * problem; refusing to save someone's link over a third-party hiccup is not.
 */
export async function fetchVimeoOrientation(url: string): Promise<VideoOrientation> {
  return (await fetchVimeoMeta(url)).orientation;
}

/**
 * True for an `https` URL on Vimeo's image CDN (`vimeocdn.com` and its subdomains, e.g.
 * `i.vimeocdn.com`). The only host a stored Vimeo cover may point at — checked both when the URL
 * is written (it comes from a third-party response) and when it is rendered (the jsonb is
 * owner-writable through RLS, so it is never trusted blindly).
 */
export function isVimeoCdnImageUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      parsed.protocol === 'https:' && (host === 'vimeocdn.com' || host.endsWith('.vimeocdn.com'))
    );
  } catch {
    return false;
  }
}

/**
 * YouTube's own cover image for a stored link, or `null` for anything that isn't YouTube.
 *
 * `hqdefault.jpg` (480x360) exists for every video, unlike `maxresdefault.jpg`, which is missing
 * for lower-resolution uploads and then answers 404 — so it is the safe default with no network
 * call and no client-side fallback needed. Derived purely from the URL, in the render path.
 */
export function youtubeThumbnailUrl(url: string | null | undefined): string | null {
  const video = parseVideoUrl(url);
  return video?.provider === 'youtube' ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` : null;
}

export type VimeoMeta = {
  orientation: VideoOrientation;
  /** Vimeo CDN cover image, or `null` when Vimeo didn't give a usable one. */
  thumbnailUrl: string | null;
};

/**
 * One Vimeo oEmbed round trip for both things the profile needs: the layout orientation and the
 * cover image. Best-effort, see `fetchVimeoOrientation` — any failure yields horizontal / no cover.
 * Run at SAVE time only; the render path never calls Vimeo.
 */
async function fetchVimeoMeta(url: string): Promise<VimeoMeta> {
  const fallback: VimeoMeta = { orientation: 'horizontal', thumbnailUrl: null };
  const video = parseVideoUrl(url);
  if (!video || video.provider !== 'vimeo') return fallback;

  try {
    const endpoint = new URL('https://vimeo.com/api/oembed.json');
    endpoint.searchParams.set('url', `https://vimeo.com/${video.id}`);
    // Ask for a large cover (oEmbed otherwise returns a ~295px one); the aspect ratio is unchanged.
    endpoint.searchParams.set('width', '1280');

    const response = await fetch(endpoint, {
      // Same 5s ceiling `lib/link-preview.ts` holds its own outbound hops to.
      signal: AbortSignal.timeout(5000),
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return fallback;

    const data: unknown = await response.json();
    if (!data || typeof data !== 'object') return fallback;

    const {
      width,
      height,
      thumbnail_url: thumbnail,
    } = data as {
      width?: unknown;
      height?: unknown;
      thumbnail_url?: unknown;
    };
    const thumbnailUrl = isVimeoCdnImageUrl(thumbnail) ? thumbnail : null;
    if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
      return { orientation: 'horizontal', thumbnailUrl };
    }
    return { orientation: height > width ? 'vertical' : 'horizontal', thumbnailUrl };
  } catch {
    return fallback;
  }
}

/**
 * The orientation to store for a promo/video-blog entry, given whichever of the two fields was
 * filled. YouTube resolves from the URL; Vimeo costs one oEmbed round trip.
 */
export async function resolveVideoOrientation(
  youtube: string | null | undefined,
  vimeo: string | null | undefined,
): Promise<VideoOrientation> {
  return (await resolveVideoMeta(youtube, vimeo)).orientation;
}

/**
 * Orientation plus the Vimeo cover image for a promo entry. The same rule as
 * `resolveVideoOrientation` (YouTube wins when it states its own orientation; otherwise Vimeo),
 * but keeps the oEmbed result so one round trip serves both. `thumbnailUrl` is only ever set for a
 * Vimeo-sourced entry — YouTube covers are derived from the URL at render time.
 */
export async function resolveVideoMeta(
  youtube: string | null | undefined,
  vimeo: string | null | undefined,
): Promise<VimeoMeta> {
  const fromYoutube = parseVideoUrl(youtube);
  if (fromYoutube?.orientation) return { orientation: fromYoutube.orientation, thumbnailUrl: null };
  if (vimeo) return fetchVimeoMeta(vimeo);
  return { orientation: 'horizontal', thumbnailUrl: null };
}
