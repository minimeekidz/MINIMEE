// 戲院海報 — one per theme, keyed by theme id.
//
// Em drew all 36 up front and shipped a manifest
// (docs/design-reference/poster-manifest.csv) mapping theme_id → 主題 → file.
// The files are stored under public/assets/posters/ renamed to the theme id,
// so the manifest is the record of what was drawn and the filename is the
// lookup. No table to keep in step: a poster is where a poster is expected to
// be. A test walks the folder and fails if any of the 36 is missing, which is
// the check that would otherwise only surface as an empty frame in the lobby.
//
// Rotating a month changes nothing here. The cinema asks for the poster of
// whichever themes are current, and that is decided in one place —
// `theme_releases` — the same row the games, the studio board and the
// fragment wall all read.

/** Where a theme's poster lives. */
export function posterFor(themeId: string | null | undefined): string | null {
  if (!themeId) return null;
  // Only the ids the catalogue actually uses, so a typo becomes an empty
  // frame rather than a request for /assets/posters/undefined.webp.
  if (!/^theme-\d\d$/.test(themeId)) return null;
  return `/assets/posters/${themeId}.webp`;
}
