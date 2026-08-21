/** Map known game / platform names to cover art under /games/ */

const ALIASES: Record<string, string> = {
  'golden dragon': 'golden-dragon',
  'golden-dragon': 'golden-dragon',
  goldendragon: 'golden-dragon',
  'magic city': 'magic-city',
  'magic-city': 'magic-city',
  magiccity: 'magic-city',
  'river sweeps': 'river-sweeps',
  riversweeps: 'river-sweeps',
  'river-sweeps': 'river-sweeps',
  ultrapanda: 'ultrapanda',
  'ultra panda': 'ultrapanda',
  'ultra-panda': 'ultrapanda',
  vblink: 'vblink',
  'v blink': 'vblink',
  'fire kirin': 'fire-kirin',
  'fire-kirin': 'fire-kirin',
  firekirin: 'fire-kirin',
  'panda master': 'panda-master',
  'panda-master': 'panda-master',
  'orion stars': 'orion-stars',
  'orion-stars': 'orion-stars',
  juwa: 'juwa',
  gamevault: 'gamevault',
  'game vault': 'gamevault',
}

export function gameArtSlug(gameName?: string, platform?: string): string | null {
  const candidates = [platform, gameName]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase())
  for (const raw of candidates) {
    if (!raw) continue
    if (ALIASES[raw]) return ALIASES[raw]
    for (const [alias, slug] of Object.entries(ALIASES)) {
      if (raw.includes(alias)) return slug
    }
  }
  return null
}

/** Public URL for a game cover; drop PNG/SVG into /public/games/{slug}.svg */
export function gameArtUrl(gameName?: string, platform?: string): string | null {
  const slug = gameArtSlug(gameName, platform)
  return slug ? `/games/${slug}.svg` : null
}
