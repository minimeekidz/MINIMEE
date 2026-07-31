// Themes release progressively rather than all at once: 每兩星期一個主題
// (ops doc section 3). sequence 1 always releases immediately at
// subscription start; each later sequence number releases 14 days after
// the previous one.
export function themeReleaseAt(startedAt: string, sequenceNumber: number): Date {
  const releaseDate = new Date(startedAt);
  releaseDate.setUTCDate(releaseDate.getUTCDate() + (sequenceNumber - 1) * 14);
  return releaseDate;
}
