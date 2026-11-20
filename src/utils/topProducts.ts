import type { TopProductStat } from '../types';

export interface RankedTopProduct extends TopProductStat {
  badgeRank: string;
}

export function getRankBadge(rankIndex: number): string {
  switch (rankIndex) {
    case 0:
      return '🥇 #1';
    case 1:
      return '🥈 #2';
    case 2:
      return '🥉 #3';
    default:
      return `#${rankIndex + 1}`;
  }
}

/**
 * Formats server-ranked top products for the dashboard card, filtering out
 * non-positive sales entries and attaching display medal badges.
 */
export function rankTopProducts(items: TopProductStat[]): RankedTopProduct[] {
  return items
    .filter((item) => item.units_sold > 0)
    .map((item, index) => ({
      ...item,
      badgeRank: getRankBadge(index),
    }));
}
