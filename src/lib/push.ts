import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  return Notification.permission;
}

async function getVapidPublicKey(): Promise<string> {
  const { data, error } = await supabase.functions.invoke("get-vapid-public-key");
  if (error) throw error;
  if (!data?.key) throw new Error("VAPID public key not configured");
  return data.key as string;
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  const reg =
    (await navigator.serviceWorker.getRegistration("/sw.js")) ||
    (await navigator.serviceWorker.register("/sw.js"));

  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const vapidKey = await getVapidPublicKey();

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  const json: any = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "endpoint" }
  );
  if (error) {
    console.error(error);
    return false;
  }
  return true;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}
