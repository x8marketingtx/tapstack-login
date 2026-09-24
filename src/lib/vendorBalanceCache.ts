/** Drop leftover localStorage game-balance caches. Live POS is the source of truth. */
export function clearVendorBalanceCache() {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith('tapstack_vendor_balances_')) keys.push(key)
    }
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
