import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { useT } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Megaphone, Trophy, Users, MessageSquareLock, Sparkles } from "lucide-react";

interface Announcement { id: string; title: string; content: string; }
interface TopUser { id: string; name: string; surname: string; avatar_url: string | null; points: number; }

export default function Home() {
  const { t } = useT();
  const nav = useNavigate();
  const { profile } = useApp();
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [top, setTop] = useState<TopUser[]>([]);
  const [participants, setParticipants] = useState(0);

  useEffect(() => {
    (async () => {
      const now = new Date().toISOString();

      const [annRes, topRes] = await Promise.all([
        supabase.from("announcements")
          .select("id,title,content,starts_at,ends_at")
          .lte("starts_at", now)
          .order("priority", { ascending: false })
          .limit(5),
        supabase.rpc("get_public_profiles"),
      ]);

      const filtered = (annRes.data || []).filter((a: any) => !a.ends_at || a.ends_at >= now);
      setAnns(filtered);

      const allProfiles = ((topRes.data as any[]) || []);
      const sorted = [...allProfiles].sort((a, b) => b.points - a.points).slice(0, 5);
      setTop(sorted as any);
      setParticipants(allProfiles.length);
    })();
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero */}
      <section className="rounded-3xl gradient-hero text-white p-5 shadow-glow">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs uppercase font-bold tracking-wider opacity-90">{t("welcome")}</span>
        </div>
        <h2 className="text-2xl font-extrabold mb-3">
          {profile?.name ? `${t("welcome")}, ${profile.name}!` : t("appName")}
        </h2>
        <Button onClick={() => nav("/secrets")} variant="secondary" className="rounded-full font-bold">
          <MessageSquareLock className="h-4 w-4 mr-2" />
          {t("addSecret")}
        </Button>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3">
        <StatCard icon={<Users className="h-5 w-5" />} label={t("participants")} value={participants} />
        <StatCard icon={<Trophy className="h-5 w-5" />} label={t("yourPoints")} value={profile?.points ?? 0} />
      </section>

      {/* Announcements */}
      {anns.length > 0 && (
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> {t("announcements")}
          </h3>
          <div className="space-y-2">
            {anns.map((a) => (
              <div key={a.id} className="rounded-2xl bg-card border border-border p-4 shadow-card">
                <div className="font-bold mb-1">{a.title}</div>
                <p className="text-sm text-muted-foreground">{a.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Leaderboard */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
          <Trophy className="h-4 w-4" /> {t("leaderboard")}
        </h3>
        <div className="rounded-2xl bg-card border border-border shadow-card divide-y divide-border overflow-hidden">
          {top.length === 0 && <div className="p-4 text-sm text-muted-foreground">{t("nothingHere")}</div>}
          {top.map((u, i) => (
            <div key={u.id} className="flex items-center gap-3 p-3">
              <span className={`w-7 text-center font-extrabold ${i === 0 ? "text-accent" : "text-muted-foreground"}`}>
                {i + 1}
              </span>
              <Avatar name={u.name} surname={u.surname} url={u.avatar_url} size={36} />
              <div className="flex-1 truncate">
                <div className="font-semibold truncate">{u.name} {u.surname}</div>
              </div>
              <div className="font-extrabold text-primary">{u.points} <span className="text-xs font-medium text-muted-foreground">{t("points")}</span></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-card">
      <div className="text-primary mb-1">{icon}</div>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
