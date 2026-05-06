import { useEffect, useState, useCallback } from "react";
import { Bell, BellOff, Car, CheckCircle2, XCircle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useT } from "@/lib/i18n";
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
} from "@/lib/push";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface Props {
  className?: string;
}

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: any;
  read: boolean;
  created_at: string;
}

function timeAgo(iso: string, lang: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return lang === "it" ? "ora" : "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}g`;
}

function iconForType(type: string) {
  if (type === "ride_request_new") return Car;
  if (type === "ride_request_accepted") return CheckCircle2;
  if (type === "ride_request_rejected") return XCircle;
  return Info;
}

export function NotificationsButton({ className }: Props) {
  const { t, lang } = useT();
  const { user } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);

  const unread = items.filter((i) => !i.read).length;

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, body, data, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (!error && data) setItems(data as NotificationRow[]);
  }, [user]);

  useEffect(() => {
    if (!isPushSupported()) setSupported(false);
    else getPushPermission().then(setPermission);
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  if (!user) return null;

  const handleItemClick = async (n: NotificationRow) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    }
    const rideId = n.data?.ride_post_id;
    if (rideId || n.type.startsWith("ride_")) {
      setOpen(false);
      let mode: "manage" | "request" | undefined;
      if (n.type === "ride_request_new") mode = "manage";
      else if (n.type === "ride_request_accepted" || n.type === "ride_request_rejected") mode = "request";
      navigate("/passaggi", rideId ? { state: { focusRideId: rideId, mode } } : undefined);
    }
  };

  const handleMarkAll = async () => {
    if (!user || unread === 0) return;
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  };

  const handleEnablePush = async () => {
    if (!supported) {
      toast.error(t("notificationsUnsupported"));
      return;
    }
    setBusy(true);
    try {
      const ok = await subscribeToPush(user.id);
      if (ok) {
        setPermission("granted");
        toast.success(t("notificationsEnabled"));
      } else {
        const p = await getPushPermission();
        setPermission(p);
        if (p === "denied") toast.error(t("notificationsBlocked"));
      }
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={t("notifications")}
          className={cn(
            "relative h-8 w-8 rounded-full flex items-center justify-center ring-2 ring-border bg-background text-foreground hover:ring-primary transition-smooth shadow-soft active:scale-95",
            className
          )}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <h3 className="text-sm font-semibold">{t("notifications")}</h3>
          {unread > 0 && (
            <button
              onClick={handleMarkAll}
              className="text-xs text-primary hover:underline"
            >
              {t("markAllRead")}
            </button>
          )}
        </div>

        <ScrollArea className="max-h-[60vh]">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {t("noNotifications")}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const Icon = iconForType(n.type);
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleItemClick(n)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 flex gap-2 items-start hover:bg-accent transition-colors",
                        !n.read && "bg-primary/10"
                      )}
                    >
                      <span className="relative mt-0.5">
                        <Icon className="h-4 w-4 text-primary" />
                        {!n.read && (
                          <span className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-destructive" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={cn("text-sm truncate", !n.read ? "font-semibold" : "font-medium")}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {timeAgo(n.created_at, lang)}
                          </span>
                        </div>
                        {n.body && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {n.body}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {supported && permission !== "granted" && (
          <div className="px-3 py-2 border-t border-border">
            {permission === "denied" ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <BellOff className="h-3 w-3" />
                {t("pushBlockedHint")}
              </p>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs"
                onClick={handleEnablePush}
                disabled={busy}
              >
                <Bell className="h-3 w-3 mr-1.5" />
                {t("enablePushShort")}
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
