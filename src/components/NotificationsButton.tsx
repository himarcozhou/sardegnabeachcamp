import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useT } from "@/lib/i18n";
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
} from "@/lib/push";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export function NotificationsButton({ className }: Props) {
  const { t } = useT();
  const { user } = useApp();
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

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
  }, [user?.id]);

  if (!user) return null;

  const handleClick = async () => {
    if (!supported) {
      toast.error(t("notificationsUnsupported"));
      return;
    }
    if (permission === "denied") {
      toast.error(t("notificationsBlocked"));
      return;
    }
    if (subscribed && permission === "granted") {
      toast.success(t("notificationsEnabled"));
      return;
    }
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

  const active = supported && subscribed && permission === "granted";
  const blocked = !supported || permission === "denied";

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      aria-label={active ? t("notificationsEnabled") : t("enableNotifications")}
      title={active ? t("notificationsEnabled") : t("enableNotifications")}
      className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center ring-2 transition-smooth shadow-soft active:scale-95",
        active
          ? "ring-primary bg-primary text-primary-foreground hover:ring-primary"
          : blocked
          ? "ring-border bg-muted text-muted-foreground"
          : "ring-border bg-background text-foreground hover:ring-primary",
        className
      )}
    >
      {active ? (
        <BellRing className="h-4 w-4" />
      ) : blocked ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
    </button>
  );
}
