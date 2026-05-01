import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { useT, Lang } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { awardToast } from "@/lib/utils";
import { LogOut, Pencil, Shield, Camera, Instagram, Trophy, Trash2, Phone } from "lucide-react";
import AdminPanel from "@/components/AdminPanel";
import { InstallButton } from "@/components/InstallButton";
import { useConfirm } from "@/components/ConfirmDialog";

export default function Profile() {
  const { t, lang, setLang } = useT();
  const { profile, user, isAdmin, refreshProfile, signOut } = useApp();
  const confirmDialog = useConfirm();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPanel, setAdminPanel] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [name, setName] = useState(profile?.name || "");
  const [surname, setSurname] = useState(profile?.surname || "");
  const [ig, setIg] = useState(profile?.instagram_tag || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const initialFacts = (profile?.three_facts && profile.three_facts.length === 3)
    ? profile.three_facts.map((f) => ({ text: f.text || "", is_lie: !!f.is_lie }))
    : [{ text: "", is_lie: false }, { text: "", is_lie: false }, { text: "", is_lie: false }];
  const [facts, setFacts] = useState(initialFacts);
  const [lieIdx, setLieIdx] = useState<number>(initialFacts.findIndex((f) => f.is_lie));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!profile || !user) return <div className="text-center py-10 text-muted-foreground">{t("loading")}</div>;

  const lieIndex = profile.three_facts?.findIndex((f) => f.is_lie) ?? -1;

  const toggleDark = async (val: boolean) => {
    if (val) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("dark_mode", val ? "1" : "0");
    await supabase.from("profiles").update({ dark_mode: val }).eq("id", user.id);
    refreshProfile();
  };

  const changeLang = async (l: Lang) => {
    setLang(l);
    await supabase.from("profiles").update({ language: l }).eq("id", user.id);
  };

  const save = async () => {
    // Validate facts
    const cleanedFacts = facts.map((f) => ({ text: (f.text || "").trim().slice(0, 200), is_lie: false }));
    if (cleanedFacts.some((f) => !f.text)) { toast.error(t("fillAllFacts")); return; }
    if (lieIdx < 0 || lieIdx > 2) { toast.error(t("pickLie")); return; }
    cleanedFacts[lieIdx].is_lie = true;

    setSaving(true);
    const cleanedIg = ig.trim().replace(/^@/, "").slice(0, 30) || null;
    const cleanedPhone = phone.trim().slice(0, 30) || null;
    const prevPoints = profile?.points ?? 0;
    const { error } = await supabase.from("profiles").update({
      name: name.trim().slice(0, 40),
      surname: surname.trim().slice(0, 40),
      instagram_tag: cleanedIg,
      phone: cleanedPhone,
      three_facts: cleanedFacts,
    }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("profileSaved"));
    setEditing(false);
    const fresh = await refreshProfile();
    awardToast(prevPoints, fresh?.points, t("pointsEarned"));
  };

  const deleteAccount = async () => {
    const ok = await confirmDialog({
      title: t("deleteAccount"),
      description: t("confirmDeleteAccount"),
      confirmText: t("delete"),
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({}),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) { toast.error(data?.error || "Error"); setDeleting(false); return; }
      toast.success(t("accountDeleted"));
      await signOut();
      nav("/auth", { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Error");
      setDeleting(false);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3_000_000) { toast.error("Max 3MB"); return; }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const prevPoints = profile?.points ?? 0;
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    toast.success(t("profileSaved"));
    const fresh = await refreshProfile();
    awardToast(prevPoints, fresh?.points, t("pointsEarned"));
  };

  const claimAdmin = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ password: adminPwd }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        toast.error(data?.error || t("enterAdminPassword"));
        return;
      }
      toast.success(t("youAreAdmin"));
      setAdminPwd("");
      setAdminOpen(false);
      refreshProfile();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    }
  };

  const exitAdmin = async () => {
    const ok = await confirmDialog({
      title: t("exitAdmin"),
      description: t("confirmExitAdmin"),
      confirmText: t("exitAdmin"),
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", user.id)
      .eq("role", "admin");
    if (error) { toast.error(error.message); return; }
    toast.success(t("exitedAdmin"));
    refreshProfile();
  };

  const doLogout = async () => {
    await signOut();
    nav("/auth", { replace: true });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header card */}
      <div className="rounded-3xl gradient-hero text-white p-5 shadow-glow flex items-center gap-4">
        <div className="relative">
          <Avatar name={profile.name} surname={profile.surname} url={profile.avatar_url} size={72} />
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-card text-foreground border border-border flex items-center justify-center shadow-card"
            aria-label="Change photo"
          >
            <Camera className="h-4 w-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-extrabold truncate">{profile.name} {profile.surname}</h2>
          {profile.instagram_tag && (
            <a href={`https://instagram.com/${profile.instagram_tag}`} target="_blank" rel="noreferrer" className="text-sm flex items-center gap-1 opacity-90">
              <Instagram className="h-3 w-3" /> @{profile.instagram_tag}
            </a>
          )}
          {profile.phone && (
            <a href={`tel:${profile.phone}`} className="text-sm flex items-center gap-1 opacity-90">
              <Phone className="h-3 w-3" /> {profile.phone}
            </a>
          )}
          <div className="mt-1 flex items-center gap-1 text-sm font-bold">
            <Trophy className="h-4 w-4" /> {profile.points} {t("points")}
          </div>
        </div>
      </div>

      {/* My Facts */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">{t("myFacts")}</h3>
        <ul className="space-y-2">
          {profile.three_facts?.map((f, i) => (
            <li key={i} className={`rounded-2xl p-3 text-sm border ${
              i === lieIndex ? "bg-accent/15 border-accent" : "bg-card border-border"
            }`}>
              {f.text}
              {i === lieIndex && <span className="ml-2 text-xs font-bold text-accent">🤥 {t("isLie")}</span>}
            </li>
          ))}
        </ul>
      </section>

      {/* Settings */}
      <section className="rounded-2xl bg-card border border-border p-4 shadow-card space-y-4">
        <InstallButton variant="row" />
        <div className="flex items-center justify-between">
          <Label htmlFor="dm">{t("darkMode")}</Label>
          <Switch id="dm" checked={document.documentElement.classList.contains("dark")} onCheckedChange={toggleDark} />
        </div>
        <div className="flex items-center justify-between">
          <Label>{t("language")}</Label>
          <div className="flex gap-1">
            {(["it", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => changeLang(l)}
                className={`px-3 py-1 rounded-full text-xs font-bold ${lang === l ? "gradient-festive text-white" : "bg-secondary text-secondary-foreground"}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="space-y-2">
        <Button onClick={() => {
          setName(profile.name || "");
          setSurname(profile.surname || "");
          setIg(profile.instagram_tag || "");
          setPhone(profile.phone || "");
          const f = (profile.three_facts && profile.three_facts.length === 3)
            ? profile.three_facts.map((x) => ({ text: x.text || "", is_lie: !!x.is_lie }))
            : [{ text: "", is_lie: false }, { text: "", is_lie: false }, { text: "", is_lie: false }];
          setFacts(f);
          setLieIdx(f.findIndex((x) => x.is_lie));
          setEditing(true);
        }} variant="outline" className="w-full rounded-xl h-12 font-bold">
          <Pencil className="h-4 w-4 mr-2" /> {t("editProfile")}
        </Button>
        {isAdmin ? (
          <>
            <Button onClick={() => setAdminPanel(true)} className="w-full rounded-xl h-12 font-bold gradient-festive text-white border-0">
              <Shield className="h-4 w-4 mr-2" /> {t("adminPanel")}
            </Button>
            <Button onClick={exitAdmin} variant="outline" className="w-full rounded-xl h-12 font-bold">
              <Shield className="h-4 w-4 mr-2" /> {t("exitAdmin")}
            </Button>
          </>
        ) : (
          <Button onClick={() => setAdminOpen(true)} variant="ghost" className="w-full rounded-xl h-12 text-muted-foreground">
            <Shield className="h-4 w-4 mr-2" /> {t("adminMode")}
          </Button>
        )}
        <Button onClick={doLogout} variant="ghost" className="w-full rounded-xl h-12 text-destructive">
          <LogOut className="h-4 w-4 mr-2" /> {t("logout")}
        </Button>
        <Button onClick={deleteAccount} disabled={deleting} variant="ghost" className="w-full rounded-xl h-12 text-destructive">
          <Trash2 className="h-4 w-4 mr-2" /> {deleting ? t("loading") : t("deleteAccount")}
        </Button>
      </div>

      {/* Edit dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{t("editProfile")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("surname")}</Label>
              <Input value={surname} onChange={(e) => setSurname(e.target.value)} maxLength={40} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("instagram")}</Label>
              <Input value={ig} onChange={(e) => setIg(e.target.value)} maxLength={30} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("phone")} <span className="text-muted-foreground text-xs">({t("optional")})</span></Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} placeholder="+39 333 1234567" />
            </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-sm font-bold">{t("editFacts")}</Label>
              <p className="text-xs text-muted-foreground">{t("threeFactsHelp")}</p>
              {facts.map((f, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Input
                      value={f.text}
                      onChange={(e) => {
                        const next = [...facts];
                        next[i] = { ...next[i], text: e.target.value };
                        setFacts(next);
                      }}
                      placeholder={`${t("fact")} ${i + 1}`}
                      maxLength={200}
                    />
                    <button
                      type="button"
                      onClick={() => setLieIdx(i)}
                      className={`shrink-0 px-2 py-1 rounded-lg text-xs font-bold border ${
                        lieIdx === i ? "bg-accent text-accent-foreground border-accent" : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      🤥
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={save} disabled={saving} className="w-full gradient-festive text-white border-0 rounded-xl font-bold">
              {saving ? t("loading") : t("saveProfile")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin password dialog */}
      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{t("adminMode")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              value={adminPwd}
              onChange={(e) => setAdminPwd(e.target.value)}
              placeholder={t("enterAdminPassword")}
              autoFocus
              maxLength={200}
              onKeyDown={(e) => e.key === "Enter" && claimAdmin()}
            />
            <Button onClick={claimAdmin} className="w-full gradient-festive text-white border-0 rounded-xl font-bold">
              {t("activate")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Panel */}
      <Sheet open={adminPanel} onOpenChange={setAdminPanel}>
        <SheetContent
          side="bottom"
          className="h-[92vh] p-0 rounded-t-3xl border-t-0 flex flex-col sm:max-w-2xl sm:mx-auto"
        >
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border text-left">
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> {t("adminPanel")}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-8">
            <AdminPanel />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
