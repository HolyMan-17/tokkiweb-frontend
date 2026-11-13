/** Maps a horizontal scroll offset to the visible slide index (equal-width slides). */
export function computeActiveIndex(scrollLeft: number, slideWidth: number, count: number): number {
  if (!Number.isFinite(scrollLeft) || slideWidth <= 0 || count <= 0) return 0;
  const index = Math.round(scrollLeft / slideWidth);
  return Math.min(Math.max(index, 0), count - 1);
}
