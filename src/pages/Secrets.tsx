import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/Avatar";
import { toast } from "sonner";
import { awardToast } from "@/lib/utils";
import { Heart, MessageCircle, Plus, Send, X, EyeOff, Eye, Trash2, User as UserIcon } from "lucide-react";
import { z } from "zod";

interface PublicSecret {
  id: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  hidden?: boolean;
}
interface Comment {
  id: string;
  secret_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
}

const secretSchema = z.string().trim().min(1).max(1000);
const commentSchema = z.string().trim().min(1).max(500);

export default function Secrets() {
  const { t } = useT();
  const { user, isAdmin, profile, refreshProfile } = useApp();
  const [items, setItems] = useState<PublicSecret[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [composing, setComposing] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [adminAuthors, setAdminAuthors] = useState<Record<string, { name: string; surname: string }>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_public_secrets");
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((data as any) || []);
    if (user) {
      const { data: liked } = await supabase.from("secret_likes").select("secret_id").eq("user_id", user.id);
      setLikedIds(new Set((liked || []).map((l: any) => l.secret_id)));
    }
    if (isAdmin) {
      const { data: raw } = await supabase.from("secrets").select("id,author_id");
      if (raw) {
        const ids = Array.from(new Set(raw.map((r: any) => r.author_id)));
        const { data: profs } = await supabase.from("profiles").select("id,name,surname").in("id", ids);
        const map: Record<string, any> = {};
        (profs || []).forEach((p: any) => {
          map[p.id] = p;
        });
        const authorMap: Record<string, any> = {};
        raw.forEach((r: any) => {
          authorMap[r.id] = map[r.author_id];
        });
        setAdminAuthors(authorMap);
      }
    }
  }, [user, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel("secrets-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "secrets" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "secret_comments" }, () => {
        load();
        if (openComments) loadComments(openComments);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "secret_likes" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openComments]);

  const post = async () => {
    if (!user) {
      toast.error("Login required");
      return;
    }
    const parsed = secretSchema.safeParse(newContent);
    if (!parsed.success) {
      toast.error(t("requiredField"));
      return;
    }
    const prevPoints = profile?.points ?? 0;
    const { error } = await supabase.from("secrets").insert({ author_id: user.id, content: parsed.data });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewContent("");
    setComposing(false);
    toast.success(t("secretPosted"));
    const fresh = await refreshProfile();
    awardToast(prevPoints, fresh?.points, t("pointsEarned"));
  };

  const toggleLike = async (id: string) => {
    if (!user) return;
    if (likedIds.has(id)) {
      await supabase.from("secret_likes").delete().eq("user_id", user.id).eq("secret_id", id);
      setLikedIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    } else {
      const { error } = await supabase.from("secret_likes").insert({ user_id: user.id, secret_id: id });
      if (!error) setLikedIds((s) => new Set(s).add(id));
    }
  };

  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const loadComments = async (sid: string) => {
    const { data } = await supabase.rpc("get_public_comments", { _secret_id: sid });
    setComments((c) => ({ ...c, [sid]: (data as any) || [] }));
  };

  const adminHide = async (id: string, hide: boolean) => {
    const { error } = await supabase.from("secrets").update({ hidden: hide }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(hide ? t("hidden") : t("unhide"));
      load();
    }
  };
  const adminDelete = async (id: string) => {
    const { error } = await supabase.from("secrets").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  return (
    <div className="space-y-3 animate-fade-in pb-20">
      {items.length === 0 && <div className="text-center py-12 text-muted-foreground">{t("noSecretsYet")}</div>}

      {items.map((s) => (
        <article
          key={s.id}
          className={`rounded-2xl bg-card border p-4 shadow-card ${s.hidden ? "border-destructive/60 opacity-70" : "border-border"}`}
        >
          {s.hidden && (
            <div className="text-xs text-destructive font-bold mb-2 flex items-center gap-1">
              <EyeOff className="h-3 w-3" /> {t("hidden")}
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap mb-3">{s.content}</p>
          {isAdmin && adminAuthors[s.id] && (
            <div className="text-xs text-accent font-bold mb-2 flex items-center gap-1">
              <UserIcon className="h-3 w-3" /> {t("author")}: {adminAuthors[s.id].name} {adminAuthors[s.id].surname}
            </div>
          )}
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => toggleLike(s.id)}
              className={`flex items-center gap-1 transition-smooth ${likedIds.has(s.id) ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="Like"
            >
              <Heart className="h-4 w-4" fill={likedIds.has(s.id) ? "currentColor" : "none"} />
              <span className="font-medium">{s.likes_count}</span>
            </button>
            <button
              onClick={() => {
                const next = openComments === s.id ? null : s.id;
                setOpenComments(next);
                if (next) loadComments(next);
              }}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-smooth"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="font-medium">{s.comments_count}</span>
            </button>
            <span className="text-xs text-muted-foreground ml-auto">{new Date(s.created_at).toLocaleDateString()}</span>
            {isAdmin && (
              <>
                <button
                  onClick={() => adminHide(s.id, !s.hidden)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={s.hidden ? "Unhide" : "Hide"}
                >
                  {s.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button onClick={() => adminDelete(s.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {openComments === s.id && (
            <CommentsThread secretId={s.id} comments={comments[s.id] || []} onPosted={() => loadComments(s.id)} />
          )}
        </article>
      ))}

      {/* FAB */}
      {user && !composing && (
        <button
          onClick={() => setComposing(true)}
          className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full gradient-festive text-white shadow-glow flex items-center justify-center hover:scale-105 transition-smooth"
          aria-label={t("addSecret")}
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Composer */}
      {composing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-3xl p-5 shadow-glow animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">{t("addSecret")}</h3>
              <button onClick={() => setComposing(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-smooth">
                <X className="h-5 w-5" />
              </button>
            </div>
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={t("writeSecret")}
              rows={5}
              maxLength={1000}
              className="mb-3"
              autoFocus
            />
            <div className="text-xs text-muted-foreground mb-3">{newContent.length}/1000</div>
            <Button onClick={post} className="w-full gradient-festive text-white border-0 rounded-xl font-bold">
              {t("post")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentsThread({
  secretId,
  comments,
  onPosted,
}: {
  secretId: string;
  comments: Comment[];
  onPosted: () => void;
}) {
  const { t } = useT();
  const { user, profile, refreshProfile } = useApp();
  const [text, setText] = useState("");
  const [likedC, setLikedC] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const ids = comments.map((c) => c.id);
    if (ids.length === 0) return;
    supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", user.id)
      .in("comment_id", ids)
      .then(({ data }) => setLikedC(new Set((data || []).map((l: any) => l.comment_id))));
  }, [comments, user]);

  const send = async () => {
    if (!user) return;
    const parsed = commentSchema.safeParse(text);
    if (!parsed.success) return;
    const prevPoints = profile?.points ?? 0;
    const { error } = await supabase.from("secret_comments").insert({
      secret_id: secretId,
      author_id: user.id,
      content: parsed.data,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    onPosted();
    const fresh = await refreshProfile();
    awardToast(prevPoints, fresh?.points, t("pointsEarned"));
  };

  const toggleC = async (cid: string) => {
    if (!user) return;
    if (likedC.has(cid)) {
      await supabase.from("comment_likes").delete().eq("user_id", user.id).eq("comment_id", cid);
      setLikedC((s) => {
        const n = new Set(s);
        n.delete(cid);
        return n;
      });
    } else {
      await supabase.from("comment_likes").insert({ user_id: user.id, comment_id: cid });
      setLikedC((s) => new Set(s).add(cid));
    }
    onPosted();
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="flex gap-2">
          <Avatar name={c.author_name || "?"} url={c.author_avatar} size={32} />
          <div className="flex-1">
            <div className="bg-muted rounded-2xl px-3 py-2">
              <div className="text-xs font-bold">{c.author_name}</div>
              <div className="text-sm">{c.content}</div>
            </div>
            <button
              onClick={() => toggleC(c.id)}
              className={`text-xs mt-1 px-2 font-medium ${likedC.has(c.id) ? "text-accent" : "text-muted-foreground"}`}
            >
              ❤ {c.likes_count}
            </button>
          </div>
        </div>
      ))}
      {user && (
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("addComment")}
            maxLength={500}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <Button onClick={send} size="icon" className="gradient-festive border-0 text-white shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
