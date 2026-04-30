import { avatarColor, initials } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  surname?: string;
  url?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ name, surname, url, size = 40, className }: Props) {
  const seed = `${name || ""} ${surname || ""}`.trim() || "?";
  if (url) {
    return (
      <img
        src={url}
        alt={seed}
        loading="lazy"
        className={cn("rounded-full object-cover shrink-0 ring-2 ring-background", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      aria-label={seed}
      className={cn("rounded-full flex items-center justify-center font-bold text-white shrink-0 ring-2 ring-background select-none", className)}
      style={{
        width: size,
        height: size,
        background: avatarColor(seed),
        fontSize: size * 0.4,
      }}
    >
      {initials(name, surname)}
    </div>
  );
}
