// Deterministic avatar color from name hash
export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

export function initials(name: string, surname?: string): string {
  const a = (name?.[0] || "").toUpperCase();
  const b = (surname?.[0] || "").toUpperCase();
  return (a + b) || "?";
}
