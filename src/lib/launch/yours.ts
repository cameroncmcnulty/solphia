/** Coins this wallet launched. Never the market tape. */
export function yourLaunches<T extends { creator?: string }>(coins: T[], owner?: string | null): T[] {
  if (!owner) return [];
  return coins.filter((c) => c.creator === owner);
}
