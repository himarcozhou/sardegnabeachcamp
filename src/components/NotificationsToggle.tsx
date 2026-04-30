import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { useT } from "@/lib/i18n";
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
} from "@/lib/push";
import { toast } from "sonner";

export function NotificationsToggle() {
  const { t } = useT();
  const { user } = useApp();
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setSupported(false);
      return;
    }
    getPushPermission().then(setPermission);
    navigator.serviceWorker
      .getRegistration("/sw.js")
      .then(async (reg) => {
        if (!reg) return;
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      })
      .catch(() => {});
  }, []);

  if (!user) return null;
  if (!supported) {
    return (
      <div className="rounded-2xl bg-muted border border-border p-3 text-xs text-muted-foreground flex items-center gap-2">
        <BellOff className="h-4 w-4" /> {t("notificationsUnsupported")}
      </div>
    );
  }
  if (subscribed && permission === "granted") return null;

  const enable = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const ok = await subscribeToPush(user.id);
      if (ok) {
        setSubscribed(true);
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

  if (permission === "denied") {
    return (
      <div className="rounded-2xl bg-muted border border-border p-3 text-xs text-muted-foreground flex items-center gap-2">
        <BellOff className="h-4 w-4" /> {t("notificationsBlocked")}
      </div>
    );
  }

  return (
    <button
      onClick={enable}
      disabled={busy}
      className="w-full rounded-2xl bg-card border border-border p-3 shadow-card flex items-center gap-3 hover:bg-muted/40 transition-smooth text-left"
    >
      <div className="h-9 w-9 rounded-full gradient-festive text-white flex items-center justify-center">
        <Bell className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{t("enableNotifications")}</div>
        <div className="text-xs text-muted-foreground truncate">{t("notifyRides")}</div>
      </div>
    </button>
  );
}
