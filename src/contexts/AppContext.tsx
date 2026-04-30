import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { I18nContext, dict, Lang, TKey } from "@/lib/i18n";

export interface Profile {
  id: string;
  name: string;
  surname: string;
  instagram_tag: string | null;
  avatar_url: string | null;
  three_facts: { text: string; is_lie?: boolean }[] | null;
  points: number;
  dark_mode: boolean;
  language: string;
  onboarded: boolean;
}

interface AppCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AppCtx>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const useApp = () => useContext(Ctx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // i18n
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("lang") as Lang) || "it");
  const langInitializedFromProfile = useState({ done: false })[0];
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
    langInitializedFromProfile.done = true;
  };
  const t = (k: TKey) => dict[lang][k] || String(k);

  // Dark mode
  useEffect(() => {
    const stored = localStorage.getItem("dark_mode");
    if (stored === "1") document.documentElement.classList.add("dark");
  }, []);

  const loadProfileAndRole = useCallback(async (userId: string) => {
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if (prof) {
      setProfile(prof as any);
      // Only sync language from profile on the first load, and only if user hasn't set it manually
      if (
        !langInitializedFromProfile.done &&
        !localStorage.getItem("lang") &&
        prof.language
      ) {
        setLangState(prof.language as Lang);
        langInitializedFromProfile.done = true;
      }
      if (prof.dark_mode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("dark_mode", "1");
      }
    } else {
      setProfile(null);
    }
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
  }, [langInitializedFromProfile]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    await loadProfileAndRole(session.user.id);
  }, [session, loadProfileAndRole]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (s?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadProfileAndRole(s.user.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        loadProfileAndRole(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfileAndRole]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      <Ctx.Provider
        value={{
          session,
          user: session?.user ?? null,
          profile,
          isAdmin,
          loading,
          refreshProfile,
          signOut,
        }}
      >
        {children}
      </Ctx.Provider>
    </I18nContext.Provider>
  );
}
