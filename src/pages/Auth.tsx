import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { hasSeenWelcome } from "@/pages/Welcome";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { LangToggle } from "@/components/LangToggle";

const credSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-zA-Z0-9._\- ]+$/, "Only letters, numbers, . _ -"),
  password: z.string().min(1).max(100),
});

// Username here is "name surname" or any unique handle the user chose.
// We synthesize the same email format used at signup.
function makeEmailFromUsername(username: string) {
  const slug = username
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "");
  return `${slug}@event.local`;
}

export default function Auth() {
  const { t, lang } = useT();
  const { session } = useApp();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!hasSeenWelcome()) {
    return <Navigate to="/welcome" replace />;
  }
  if (session) {
    return <Navigate to="/" replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = credSchema.safeParse({ username, password });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0].message);
        setLoading(false);
        return;
      }
      const email = makeEmailFromUsername(username);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(lang === "it" ? "Credenziali non valide" : "Invalid credentials");
        setLoading(false);
        return;
      }
      nav("/");
    } catch (err: any) {
      toast.error(err?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex items-center justify-end px-5 pt-12 pb-2 safe-top">
        <LangToggle size="sm" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 safe-bottom">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 rounded-2xl gradient-festive items-center justify-center mb-4 shadow-glow">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-foreground mb-1">
              {t("appName")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lang === "it" ? "Bentornato" : "Welcome back"}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              <Label htmlFor="username">
                {lang === "it" ? "Nome e cognome" : "Name and surname"}
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                maxLength={80}
                placeholder={lang === "it" ? "es. Mario Rossi" : "e.g. Mario Rossi"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={1}
                maxLength={100}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-festive text-white border-0 hover:opacity-90 h-12 rounded-xl font-bold shadow-soft"
            >
              {loading ? t("loading") : t("login")}
            </Button>

            <Link
              to="/onboarding"
              className="block text-center text-sm text-muted-foreground hover:text-foreground transition-smooth"
            >
              {t("signupCta")}
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
