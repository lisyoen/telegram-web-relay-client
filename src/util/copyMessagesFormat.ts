export function formatCopyTimestamp(dateSeconds: number): string {
  const d = new Date(dateSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())} ${pad(d.getMonth() + 1)} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function buildCopyLine(dateSeconds: number, senderTitle: string, body: string): string {
  return `[${formatCopyTimestamp(dateSeconds)}] ${senderTitle}: ${body.trim()}`;
}
