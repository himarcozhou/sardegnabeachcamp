import { ReactNode, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, MessageSquareLock, Gamepad2, Users, User } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { LangToggle } from "@/components/LangToggle";

const tabs = [
  { to: "/", icon: Home, key: "home" as const },
  { to: "/people", icon: Users, key: "people" as const },
  { to: "/profile", icon: User, key: "profile" as const },
];

export function Layout({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useT();
  const loc = useLocation();
  const current = tabs.find((tab) => tab.to === loc.pathname) || tabs[0];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto w-full">
          <h1 className="text-lg font-bold text-primary">
            {t(current.key)}
          </h1>
          <LangToggle size="sm" />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 pb-24">{children}</main>

      {/* Bottom Nav */}
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
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
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
