import type { KartuListing } from "@/lib/listing-query";

export type HasilFeedCache = { data: KartuListing[]; total: number };
type Entri = HasilFeedCache & { kedaluwarsaPada: number };
const TTL_MS = 15_000;
const MAKS_ENTRI = 24;
const cache = new Map<string, Entri>();

export function bacaCacheFeed(kunci: string, sekarang = Date.now()): HasilFeedCache | null {
  const entri = cache.get(kunci);
  if (!entri) return null;
  if (entri.kedaluwarsaPada <= sekarang) {
    cache.delete(kunci);
    return null;
  }
  // Refresh insertion order to retain recently used filters.
  cache.delete(kunci);
  cache.set(kunci, entri);
  return { data: entri.data, total: entri.total };
}

export function simpanCacheFeed(kunci: string, hasil: HasilFeedCache, sekarang = Date.now()): void {
  cache.delete(kunci);
  cache.set(kunci, { ...hasil, kedaluwarsaPada: sekarang + TTL_MS });
  for (const [key, entri] of cache) {
    if (entri.kedaluwarsaPada <= sekarang) cache.delete(key);
  }
  while (cache.size > MAKS_ENTRI) {
    const kunciTerlama = cache.keys().next().value;
    if (kunciTerlama === undefined) break;
    cache.delete(kunciTerlama);
  }
}

export function invalidasiCacheFeed(): void {
  cache.clear();
}

export function _resetCacheFeedUntukTes(): void {
  cache.clear();
}
