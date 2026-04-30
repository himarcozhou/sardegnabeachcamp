import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface LangToggleProps {
  className?: string;
  size?: "sm" | "md";
}

// Circle flag toggle: shows the CURRENT language flag.
export function LangToggle({ className, size = "md" }: LangToggleProps) {
  const { lang, setLang } = useT();
  const next = lang === "it" ? "en" : "it";
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <button
      onClick={() => setLang(next)}
      aria-label={`Switch to ${next.toUpperCase()}`}
      className={cn(
        "rounded-full overflow-hidden ring-2 ring-border hover:ring-primary transition-smooth shadow-soft active:scale-95",
        dim,
        className
      )}
    >
      {lang === "it" ? <FlagIT /> : <FlagGB />}
    </button>
  );
}

function FlagIT() {
  return (
    <svg viewBox="0 0 3 2" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <rect width="1" height="2" x="0" fill="#009246" />
      <rect width="1" height="2" x="1" fill="#fff" />
      <rect width="1" height="2" x="2" fill="#ce2b37" />
    </svg>
  );
}

function FlagGB() {
  return (
    <svg viewBox="0 0 60 30" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <clipPath id="flag-gb-clip">
          <path d="M0,0 L60,30 M60,0 L0,30" />
        </clipPath>
      </defs>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path
        d="M0,0 L30,15 M30,15 L60,30 M60,0 L30,15 M30,15 L0,30"
        stroke="#C8102E"
        strokeWidth="4"
      />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}
