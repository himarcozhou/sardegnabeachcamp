import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/Avatar";
import { LangToggle } from "@/components/LangToggle";
import { toast } from "sonner";
import { awardToast } from "@/lib/utils";
import { Instagram, Sparkles, Camera, ArrowLeft, Phone } from "lucide-react";
import { hasSeenWelcome } from "@/pages/Welcome";

const factSchema = z.object({
  text: z.string().trim().min(2).max(140),
  is_lie: z.boolean(),
});

const makeAccountSchema = (msgs: { tooShort: string; needsNumber: string }) =>
  z.object({
    name: z.string().trim().min(1).max(40),
    surname: z.string().trim().min(1).max(40),
    password: z
      .string()
      .min(6, msgs.tooShort)
      .regex(/\d/, msgs.needsNumber),
  });

function makeEmail(name: string, surname: string) {
  const base = surname ? `${name}.${surname}` : name;
  const slug = base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 60);
  return `${slug}@event.local`;
}

export default function Onboarding() {
  const { t, lang } = useT();
  const { user, profile, refreshProfile } = useApp();
  const nav = useNavigate();

  // Step 0: account creation (or profile edit if already logged in)
  // Step 1: 3 facts
  const initialStep = user && profile?.name && profile?.surname ? 1 : 0;
  const [step, setStep] = useState(initialStep);

  const [name, setName] = useState(profile?.name || "");
  const [surname, setSurname] = useState(profile?.surname || "");
  const [password, setPassword] = useState("");
  const [instagram, setInstagram] = useState(profile?.instagram_tag || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [facts, setFacts] = useState<{ text: string; is_lie: boolean }[]>(
    (profile?.three_facts as { text: string; is_lie: boolean }[] | undefined) || [
      { text: "", is_lie: false },
      { text: "", is_lie: false },
      { text: "", is_lie: false },
    ]
  );
  const [saving, setSaving] = useState(false);

  // If welcome not seen yet, send back
  if (!hasSeenWelcome()) {
    return <Navigate to="/welcome" replace />;
  }
  // If already onboarded, go home
  if (user && profile?.onboarded) {
    return <Navigate to="/" replace />;
  }

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 3_000_000) {
      toast.error("Max 3MB");
      return;
    }
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const uploadAvatar = async (uid: string): Promise<string | null> => {
    if (!avatarFile) return null;
    const ext = avatarFile.name.split(".").pop() || "jpg";
    const path = `${uid}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true });
    if (upErr) {
      toast.error(upErr.message);
      return null;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  // Step 0: create account (or update existing profile)
  const submitStep0 = async () => {
    const accountSchema = makeAccountSchema({
      tooShort: t("passwordTooShort"),
      needsNumber: t("passwordNeedsNumber"),
    });
    const parsed = accountSchema.safeParse({ name, surname, password: user ? "xxxxx1" : password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);

    try {
      const cleanedIg = instagram.trim().replace(/^@/, "").slice(0, 30) || null;
      const cleanedPhone = phone.trim().slice(0, 30) || null;

      if (!user) {
        // Create new account
        const email = makeEmail(name, surname);
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { name: name.trim(), surname: surname.trim() },
          },
        });
        if (signUpErr) {
          toast.error(signUpErr.message);
          setSaving(false);
          return;
        }
        const newUserId = signUpData.user?.id;
        if (!newUserId) {
          toast.error(lang === "it" ? "Errore creazione account" : "Account creation error");
          setSaving(false);
          return;
        }

        // Upload avatar if any
        const avatarUrl = await uploadAvatar(newUserId);

        // Update profile with instagram + avatar (name/surname are set by trigger from metadata)
        await supabase
          .from("profiles")
          .update({
            name: name.trim(),
            surname: surname.trim(),
            instagram_tag: cleanedIg,
            phone: cleanedPhone,
            ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
          })
          .eq("id", newUserId);

        const fresh = await refreshProfile();
        awardToast(0, fresh?.points, t("pointsEarned"));
        toast.success(t("accountCreated"));
        setStep(1);
      } else {
        // Existing logged-in user resuming onboarding
        const prevPoints = profile?.points ?? 0;
        const avatarUrl = await uploadAvatar(user.id);
        const { error } = await supabase
          .from("profiles")
          .update({
            name: name.trim(),
            surname: surname.trim(),
            instagram_tag: cleanedIg,
            phone: cleanedPhone,
            ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
          })
          .eq("id", user.id);
        if (error) {
          toast.error(error.message);
          setSaving(false);
          return;
        }
        const fresh = await refreshProfile();
        awardToast(prevPoints, fresh?.points, t("pointsEarned"));
        setStep(1);
      }
    } finally {
      setSaving(false);
    }
  };

  const saveFacts = async () => {
    if (!user) {
      toast.error(lang === "it" ? "Sessione mancante" : "Missing session");
      return;
    }
    const validated = facts.map((f) => factSchema.safeParse(f));
    if (validated.some((v) => !v.success)) {
      toast.error(t("fillAllFacts"));
      return;
    }
    if (!facts.some((f) => f.is_lie)) {
      toast.error(t("pickLie"));
      return;
    }
    setSaving(true);
    const prevPoints = profile?.points ?? 0;
    const { error } = await supabase
      .from("profiles")
      .update({ three_facts: facts as any, onboarded: true })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("success"));
    const fresh = await refreshProfile();
    awardToast(prevPoints, fresh?.points, t("pointsEarned"));
    nav("/", { replace: true });
  };

  const skipFacts = async () => {
    if (!user) {
      toast.error(lang === "it" ? "Sessione mancante" : "Missing session");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ three_facts: null, onboarded: true })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    nav("/", { replace: true });
  };

  const updateFact = (i: number, patch: Partial<{ text: string; is_lie: boolean }>) => {
    setFacts((prev) => {
      const next = [...prev];
      if (patch.is_lie === true) {
        return next.map((f, idx) => ({
          ...f,
          is_lie: idx === i,
          ...(idx === i ? { text: patch.text ?? f.text } : {}),
        }));
      }
      next[i] = { ...next[i], ...patch };
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col safe-top safe-bottom">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-2">
        {step === 1 && !user ? (
          <button
            onClick={() => setStep(0)}
            className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
            aria-label={t("back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <span className="h-9 w-9" />
        )}
        <LangToggle size="sm" />
      </div>

      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-extrabold text-foreground">
            {step === 0
              ? lang === "it"
                ? "Come ti chiami?"
                : "What's your name?"
              : t("threeFactsTitle")}
          </h1>
        </div>

        {step === 0 && (
          <div className="space-y-5 animate-fade-in">
            <p className="text-sm text-muted-foreground">
              {lang === "it"
                ? "Crea il tuo profilo per iniziare la festa."
                : "Create your profile to start the party."}
            </p>

            {/* Avatar picker */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative group"
                aria-label={t("avatarPhoto")}
              >
                <Avatar
                  name={name || "?"}
                  surname={surname}
                  url={avatarPreview}
                  size={88}
                />
                <span className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-card">
                  <Camera className="h-4 w-4" />
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onPickAvatar}
              />
              <span className="text-xs text-muted-foreground">
                {t("avatarPhoto")} <span className="opacity-70">({t("optional")})</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("name")}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="surname">
                  {t("surname")}
                </Label>
                <Input
                  id="surname"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  maxLength={40}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            {!user && (
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  required
                  placeholder={t("passwordHint")}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ig">
                {t("instagram")}{" "}
                <span className="text-muted-foreground">({t("optional")})</span>
              </Label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="ig"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="username"
                  className="pl-9"
                  maxLength={30}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">
                {t("phone")}{" "}
                <span className="text-muted-foreground">({t("optional")})</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+39 333 1234567"
                  className="pl-9"
                  maxLength={30}
                  autoComplete="tel"
                />
              </div>
            </div>

            <Button
              onClick={submitStep0}
              disabled={saving}
              className="w-full gradient-festive text-white border-0 h-12 rounded-xl font-bold"
            >
              {saving ? t("loading") : t("next")}
            </Button>

            {!user && (
              <Link
                to="/auth"
                className="block text-center text-sm text-muted-foreground hover:text-foreground transition-smooth"
              >
                {t("loginCta")}
              </Link>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-sm text-muted-foreground">{t("threeFactsHelp")}</p>
            {facts.map((f, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Label>
                    {t("fact")} {i + 1}
                  </Label>
                  <button
                    type="button"
                    onClick={() => updateFact(i, { is_lie: true })}
                    className={`text-xs px-2 py-1 rounded-full font-bold transition-smooth ${
                      f.is_lie
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {f.is_lie ? t("isLie") : "🤥 Bugia?"}
                  </button>
                </div>
                <Textarea
                  value={f.text}
                  onChange={(e) => updateFact(i, { text: e.target.value })}
                  maxLength={140}
                  rows={2}
                  placeholder="..."
                />
              </div>
            ))}
            <Button
              onClick={saveFacts}
              disabled={saving}
              className="w-full gradient-festive text-white border-0 h-12 rounded-xl font-bold"
            >
              {saving ? t("loading") : t("completeProfile")}
            </Button>
            <button
              type="button"
              onClick={skipFacts}
              disabled={saving}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-smooth py-2"
            >
              {t("skip")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
