// Sends Web Push notifications to all subscriptions of a given user.
// Authenticated either by:
//   - a logged-in user calling for themselves (Authorization: Bearer <user JWT>), OR
//   - the database trigger passing x-internal-secret = app_secrets.push_internal_secret
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const RAW_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

function normalizeSubject(s: string): string {
  const trimmed = (s || "").trim();
  if (trimmed.startsWith("mailto:") || trimmed.startsWith("https:")) return trimmed;
  if (trimmed.startsWith("http://")) return "https://" + trimmed.slice("http://".length);
  if (trimmed.includes("@")) return "mailto:" + trimmed;
  return "mailto:admin@example.com";
}
const VAPID_SUBJECT = normalizeSubject(RAW_SUBJECT);

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getInternalSecret(): Promise<string | null> {
  const { data, error } = await admin
    .from("app_secrets")
    .select("value")
    .eq("key", "push_internal_secret")
    .maybeSingle();
  if (error || !data) return null;
  return data.value as string;
}

async function authorize(req: Request, targetUserId: string): Promise<boolean> {
  // 1) Internal secret path (DB trigger)
  const internal = req.headers.get("x-internal-secret");
  if (internal) {
    const expected = await getInternalSecret();
    if (expected && internal === expected) return true;
  }
  // 2) Authenticated user calling for themselves
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await userClient.auth.getClaims(token);
    if (!error && data?.claims?.sub === targetUserId) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, data } = await req.json();
    if (!user_id || !title || typeof user_id !== "string" || !UUID_RE.test(user_id)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ok = await authorize(req, user_id);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (error) throw error;

    const payload = JSON.stringify({ title, body, data: data ?? {} });
    const results = await Promise.allSettled(
      (subs || []).map((s: any) =>
        webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload,
        ),
      ),
    );

    // Cleanup expired/invalid subscriptions
    const toDelete: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const err: any = r.reason;
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          toDelete.push((subs as any)[i].endpoint);
        } else {
          console.error("push failed", err?.statusCode, err?.body);
        }
      }
    });
    if (toDelete.length) {
      await admin.from("push_subscriptions").delete().in("endpoint", toDelete);
    }

    return new Response(
      JSON.stringify({ sent: results.filter((r) => r.status === "fulfilled").length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
