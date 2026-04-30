import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, MessageSquareLock, Car, Users, User } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LangToggle } from "@/components/LangToggle";
import { NotificationsButton } from "@/components/NotificationsButton";

const tabs = [
  { to: "/", icon: Home, key: "home" as const },
  { to: "/secrets", icon: MessageSquareLock, key: "secrets" as const },
  { to: "/passaggi", icon: Car, key: "passaggi" as const },
  { to: "/people", icon: Users, key: "people" as const },
  { to: "/profile", icon: User, key: "profile" as const },
];

export function Layout({ children }: { children: ReactNode }) {
  const { t } = useT();
  const loc = useLocation();
  const current = tabs.find((tab) => tab.to === loc.pathname) || tabs[0];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto w-full">
          <h1 className="text-lg font-bold text-primary">{t(current.key)}</h1>
          <div className="flex items-center gap-2">
            <NotificationsButton />
            <LangToggle size="sm" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 pb-24">
        {children}
        <div className="text-center text-xs text-muted-foreground/70 font-medium mt-8">ver 1.1</div>
      </main>

      <nav
        className="fixed bottom-0 inset-x-0 z-40 safe-bottom bg-background/95 backdrop-blur-lg border-t border-border"
        aria-label="Primary"
      >
        <ul className="flex items-stretch justify-around max-w-2xl mx-auto">
          {tabs.map(({ to, icon: Icon, key }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-1 py-2.5 transition-smooth relative",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )
                }
                aria-label={t(key)}
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">{t(key)}</span>
                    {isActive && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-8 rounded-b-full gradient-festive" />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
