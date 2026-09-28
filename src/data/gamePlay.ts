import { gameArtSlug } from './gameArt'

/** Public play URLs for known sweepstakes platforms. */
const PLAY_URLS: Record<string, string> = {
  'golden-dragon': 'http://playgd.mobi',
  'fire-kirin': 'https://firekirin.com',
  'orion-stars': 'https://orionstars.vip',
  juwa: 'https://juwa777.com',
  gamevault: 'https://gamevault999.com',
  ultrapanda: 'https://ultrapanda.game',
  vblink: 'https://vblink777.vip',
  'panda-master': 'https://pandamaster.vip',
  'river-sweeps': 'https://riversweeps.net',
  'magic-city': 'https://magiccity777.com',
}

export function gamePlayUrl(gameName?: string, platform?: string): string | null {
  const slug = gameArtSlug(gameName, platform)
  if (!slug) return null
  return PLAY_URLS[slug] || null
}

export function openGamePlay(gameName?: string, platform?: string): boolean {
  const url = gamePlayUrl(gameName, platform)
  if (!url) return false
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
