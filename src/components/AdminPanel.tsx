import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Megaphone } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";

export default function AdminPanel() {
  const { t } = useT();
  const { user } = useApp();
  const confirmDialog = useConfirm();
  const [users, setUsers] = useState<any[]>([]);
  const [pointsEdit, setPointsEdit] = useState<Record<string, string>>({});
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annPriority, setAnnPriority] = useState("0");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    const [usersRes, annRes] = await Promise.all([
      supabase.from("profiles").select("id,name,surname,points").order("points", { ascending: false }),
      supabase.from("announcements").select("*").order("priority", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    setUsers(usersRes.data || []);
    setAnnouncements(annRes.data || []);
  };

  useEffect(() => { load(); }, []);

  const savePoints = async (id: string) => {
    const v = parseInt(pointsEdit[id] || "0", 10);
    if (isNaN(v)) return;
    const { error } = await supabase.from("profiles").update({ points: v }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(t("success")); load(); }
  };

  const postAnnouncement = async () => {
    const title = annTitle.trim().slice(0, 120);
    const content = annContent.trim().slice(0, 2000);
    if (!title || !content) { toast.error(t("requiredField")); return; }
    setPosting(true);
    const { error } = await supabase.from("announcements").insert({
      title,
      content,
      priority: parseInt(annPriority, 10) || 0,
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("success"));
    setAnnTitle("");
    setAnnContent("");
    setAnnPriority("0");
    load();
  };

  const deleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success(t("success")); load(); }
  };

  const deleteUser = async (id: string, label: string) => {
    const ok = await confirmDialog({
      title: t("confirmDeleteUser"),
      description: label,
      confirmText: t("delete"),
      destructive: true,
    });
    if (!ok) return;
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
        body: JSON.stringify({ target_id: id }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) { toast.error(data?.error || "Error"); return; }
    toast.success(t("userDeleted"));
    load();
  };

  return (
    <div className="space-y-6">
      {/* Announcements */}
      <section className="space-y-3">
        <h4 className="font-bold flex items-center gap-2">
          <Megaphone className="h-4 w-4" /> {t("manageAnnouncements")}
        </h4>
        <div className="space-y-2 rounded-2xl bg-muted p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("title")}</Label>
            <Input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("content")}</Label>
            <Textarea value={annContent} onChange={(e) => setAnnContent(e.target.value)} maxLength={2000} rows={3} />
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs">{t("priority")}</Label>
              <Input type="number" value={annPriority} onChange={(e) => setAnnPriority(e.target.value)} className="w-24" />
            </div>
            <Button onClick={postAnnouncement} disabled={posting} className="gradient-festive text-white border-0 rounded-xl font-bold">
              {t("publish")}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {announcements.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-2">{t("noAnnouncements")}</div>
          )}
          {announcements.map((a) => (
            <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg bg-card border border-border">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{a.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{a.content}</div>
                <div className="text-xs text-muted-foreground mt-0.5">#{a.priority}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => deleteAnnouncement(a.id)} className="text-destructive shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Users */}
      <section className="space-y-3">
        <h4 className="font-bold">{t("allUsers")}</h4>
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className={`flex flex-wrap items-center gap-2 p-2 rounded-lg ${
                u.id === user?.id
                  ? "bg-primary/15 ring-2 ring-primary"
                  : "bg-muted"
              }`}
            >
              <div className="flex-1 min-w-0 basis-full sm:basis-auto text-sm font-medium truncate">
                {u.name} {u.surname}
                {u.id === user?.id && (
                  <span className="ml-2 text-xs text-primary font-bold">({t("youLabel")})</span>
                )}
              </div>
              <Input
                type="number"
                defaultValue={u.points}
                onChange={(e) => setPointsEdit({ ...pointsEdit, [u.id]: e.target.value })}
                className="w-20 h-8"
              />
              <Button size="sm" onClick={() => savePoints(u.id)}>{t("save")}</Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteUser(u.id, `${u.name} ${u.surname}`)}
                className="text-destructive shrink-0 h-8 w-8"
                aria-label={t("deleteUser")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
