/**
 * Real external links the client handed over ("Mindsetis. Super final", Google Doc
 * `Mindsetis_Edits_2026_October`, read 10.11.2026), in one place so a changed handle is one edit.
 *
 * The social accounts are the founder's own (LinkedIn, Instagram, Threads) plus the Originals
 * YouTube channel — that is what the client asked for in the footer; do not "correct" them to
 * company pages. Share-tracking parameters the client's copies carried (`?is=…`, `&si=…`) are
 * stripped: they identify who shared the link, not the video.
 */
export const SOCIAL_LINKS = {
  linkedin: 'https://www.linkedin.com/in/anastasiakondratska',
  instagram: 'https://www.instagram.com/anakondra.show',
  threads: 'https://www.threads.com/@anakondra.show',
  youtube: 'https://youtube.com/@mindsetisoriginals',
} as const;

/** "MINDSETTERS — Building Reality from Within", the first Mindsetis Originals card (Episode 1). */
export const ORIGINALS_REALITY_SHOW_URL = 'https://youtu.be/phyLyh-B4sw';

/**
 * Username of the founder's public Mindsetter page. The home page's first "Top Mindsetters" card
 * and the Originals cards' host avatar link to it, and the card shows her own profile data.
 */
export const FOUNDER_USERNAME = 'anakondra';
