import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/Avatar";
import { toast } from "sonner";
import { Trash2, Megaphone, Search, Trophy, ChevronDown } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";

export default function AdminPanel() {
  const { t } = useT();
  const { user } = useApp();
  const confirmDialog = useConfirm();

  const [users, setUsers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const load = async () => {
    const [usersRes, annRes] = await Promise.all([
      supabase.from("profiles").select("id,name,surname,points,avatar_url").order("points", { ascending: false }),
      supabase.from("announcements").select("*").order("priority", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    setUsers(usersRes.data || []);
    setAnnouncements(annRes.data || []);
  };

  useEffect(() => { load(); }, []);

  return (
    <Tabs defaultValue="announcements" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="announcements">{t("announcementsTab")}</TabsTrigger>
        <TabsTrigger value="users">{t("usersTab")}</TabsTrigger>
      </TabsList>

      <TabsContent value="announcements" className="mt-0">
        <AnnouncementsTab
          announcements={announcements}
          onChanged={load}
          confirmDialog={confirmDialog}
        />
      </TabsContent>

      <TabsContent value="users" className="mt-0">
        <UsersTab
          users={users}
          currentUserId={user?.id}
          onChanged={load}
          confirmDialog={confirmDialog}
        />
      </TabsContent>
    </Tabs>
  );
}

function AnnouncementsTab({
  announcements,
  onChanged,
  confirmDialog,
}: {
  announcements: any[];
  onChanged: () => void;
  confirmDialog: ReturnType<typeof useConfirm>;
}) {
  const { t } = useT();
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annPriority, setAnnPriority] = useState("0");
  const [posting, setPosting] = useState(false);

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
    onChanged();
  };

  const deleteAnnouncement = async (id: string, title: string) => {
    const ok = await confirmDialog({
      title: t("delete"),
      description: title,
      confirmText: t("delete"),
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success(t("success")); onChanged(); }
  };

  return (
    <div className="space-y-4">
      {/* Compose */}
      <div className="space-y-2.5 rounded-2xl bg-muted/60 p-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("title")}</Label>
          <Input
            value={annTitle}
            onChange={(e) => setAnnTitle(e.target.value)}
            maxLength={120}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("content")}</Label>
          <Textarea
            value={annContent}
            onChange={(e) => setAnnContent(e.target.value)}
            maxLength={2000}
            rows={3}
            className="resize-none"
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1 w-20">
            <Label className="text-xs text-muted-foreground">{t("priority")}</Label>
            <Input
              type="number"
              value={annPriority}
              onChange={(e) => setAnnPriority(e.target.value)}
              className="h-9"
            />
          </div>
          <Button
            onClick={postAnnouncement}
            disabled={posting}
            className="flex-1 h-9 gradient-festive text-white border-0 rounded-xl font-bold"
          >
            {t("publish")}
          </Button>
        </div>
      </div>

      {/* List */}
      <div>
        <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
          {t("manageAnnouncements")}
        </h5>
        {announcements.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Megaphone className="h-6 w-6 opacity-50" />
            <span className="text-sm">{t("noAnnouncements")}</span>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {announcements.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-2 px-2.5 py-2 rounded-xl hover:bg-muted/60 transition-smooth"
              >
                <span className="shrink-0 mt-0.5 inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md bg-primary/15 text-primary text-[10px] font-bold">
                  #{a.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2 break-words">{a.content}</div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteAnnouncement(a.id, a.title)}
                  className="text-destructive shrink-0 h-8 w-8"
                  aria-label={t("delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function UsersTab({
  users,
  currentUserId,
  onChanged,
  confirmDialog,
}: {
  users: any[];
  currentUserId: string | undefined;
  onChanged: () => void;
  confirmDialog: ReturnType<typeof useConfirm>;
}) {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pointsEdit, setPointsEdit] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.name || ""} ${u.surname || ""}`.toLowerCase().includes(q)
    );
  }, [users, query]);

  const savePoints = async (id: string) => {
    const raw = pointsEdit[id];
    if (raw === undefined) return;
    const v = parseInt(raw, 10);
    if (isNaN(v)) return;
    const { error } = await supabase.from("profiles").update({ points: v }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(t("success")); onChanged(); }
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
    setExpandedId(null);
    onChanged();
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchUsers")}
          className="pl-9 h-9"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-6">
          {t("noPeople")}
        </div>
      ) : (
        <ul className="space-y-1">
          {filtered.map((u) => {
            const isMe = u.id === currentUserId;
            const isOpen = expandedId === u.id;
            return (
              <li
                key={u.id}
                className={`rounded-xl transition-smooth ${
                  isOpen ? "bg-muted" : "hover:bg-muted/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setExpandedId(isOpen ? null : u.id);
                    if (!isOpen) {
                      setPointsEdit((s) => ({ ...s, [u.id]: String(u.points) }));
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-2 py-2 text-left"
                >
                  <Avatar
                    name={u.name}
                    surname={u.surname}
                    url={u.avatar_url}
                    size={32}
                    className={isMe ? "ring-2 ring-primary" : ""}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {u.name} {u.surname}
                      {isMe && (
                        <span className="ml-1.5 text-[10px] text-primary font-bold">({t("youLabel")})</span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-primary">
                    <Trophy className="h-3 w-3" /> {u.points}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="px-2 pb-2.5 pt-0.5 space-y-2 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {t("editPoints")}
                        </Label>
                        <Input
                          type="number"
                          value={pointsEdit[u.id] ?? String(u.points)}
                          onChange={(e) => setPointsEdit({ ...pointsEdit, [u.id]: e.target.value })}
                          className="h-9"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => savePoints(u.id)}
                        className="h-9 mt-5 gradient-festive text-white border-0"
                      >
                        {t("save")}
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => deleteUser(u.id, `${u.name} ${u.surname}`)}
                      className="w-full h-9 text-destructive hover:bg-destructive/10 justify-center"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> {t("deleteUser")}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
