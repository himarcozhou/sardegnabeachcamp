import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { useT } from "@/lib/i18n";
import { Car, ArrowRight, Calendar, Clock, Users as UsersIcon, MapPin } from "lucide-react";

interface MyRide {
  id: string;
  ride_date: string;
  ride_time: string;
  origin: string;
  destination: string;
  slots: number;
  is_open: boolean;
  pending_count: number;
  accepted_count: number;
}

interface MyRequest {
  id: string;
  ride_post_id: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  seats: number;
  ride_date: string;
  ride_time: string;
  origin: string;
  destination: string;
}

export function RidesSection() {
  const { t, lang } = useT();
  const { user } = useApp();
  const nav = useNavigate();
  const [myRides, setMyRides] = useState<MyRide[]>([]);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Rides I posted
      const { data: rides } = await supabase
        .from("ride_posts")
        .select("id, ride_date, ride_time, origin, destination, slots, is_open")
        .eq("driver_id", user.id)
        .order("ride_date", { ascending: true })
        .limit(5);

      const rideIds = (rides || []).map((r: any) => r.id);
      let pendingByRide: Record<string, number> = {};
      let acceptedByRide: Record<string, number> = {};
      if (rideIds.length) {
        const { data: reqs } = await supabase
          .from("ride_requests")
          .select("ride_post_id, status, seats")
          .in("ride_post_id", rideIds);
        (reqs || []).forEach((r: any) => {
          if (r.status === "pending")
            pendingByRide[r.ride_post_id] = (pendingByRide[r.ride_post_id] || 0) + 1;
          if (r.status === "accepted")
            acceptedByRide[r.ride_post_id] = (acceptedByRide[r.ride_post_id] || 0) + (r.seats || 0);
        });
      }

      setMyRides(
        (rides || []).map((r: any) => ({
          ...r,
          pending_count: pendingByRide[r.id] || 0,
          accepted_count: acceptedByRide[r.id] || 0,
        })),
      );

      // Requests I made
      const { data: reqs } = await supabase
        .from("ride_requests")
        .select("id, ride_post_id, status, seats")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const postIds = (reqs || []).map((r: any) => r.ride_post_id);
      let postsMap: Record<string, any> = {};
      if (postIds.length) {
        const { data: posts } = await supabase
          .from("ride_posts")
          .select("id, ride_date, ride_time, origin, destination")
          .in("id", postIds);
        (posts || []).forEach((p: any) => {
          postsMap[p.id] = p;
        });
      }

      setMyRequests(
        (reqs || []).map((r: any) => ({
          ...r,
          ride_date: postsMap[r.ride_post_id]?.ride_date || "",
          ride_time: postsMap[r.ride_post_id]?.ride_time || "",
          origin: postsMap[r.ride_post_id]?.origin || "",
          destination: postsMap[r.ride_post_id]?.destination || "",
        })),
      );
    })();
  }, [user]);

  if (!user) return null;
  if (myRides.length === 0 && myRequests.length === 0) return null;

  const fmtDate = (d: string) =>
    d
      ? new Date(d).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", {
          weekday: "short",
          day: "2-digit",
          month: "short",
        })
      : "";

  const statusColor = (s: string) =>
    s === "accepted"
      ? "bg-accent/20 text-accent"
      : s === "pending"
        ? "bg-muted text-muted-foreground"
        : s === "rejected"
          ? "bg-destructive/15 text-destructive"
          : "bg-muted text-muted-foreground";

  const statusLabel = (s: string) =>
    s === "accepted"
      ? t("statusAccepted")
      : s === "pending"
        ? t("statusPending")
        : s === "rejected"
          ? t("statusRejected")
          : lang === "it" ? "Annullata" : "Cancelled";

  return (
    <section>
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
        <Car className="h-4 w-4" /> {t("passaggi")}
      </h3>

      <div className="space-y-3">
        {myRides.length > 0 && (
          <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
            <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border flex items-center justify-between">
              <span>{t("asDriver")}</span>
              <button
                onClick={() => nav("/passaggi")}
                className="text-primary hover:underline normal-case font-semibold"
              >
                {t("seeAll")}
              </button>
            </div>
            {myRides.map((r) => (
              <button
                key={r.id}
                onClick={() => nav("/passaggi", { state: { focusRideId: r.id, mode: "manage" } })}
                className="w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/40 transition-smooth"
              >
                <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{r.origin}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{r.destination}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {fmtDate(r.ride_date)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {r.ride_time.slice(0, 5)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UsersIcon className="h-3 w-3" /> {r.accepted_count}/{r.slots}
                  </span>
                  {r.pending_count > 0 && (
                    <span className="inline-flex items-center gap-1 text-accent font-bold">
                      • {t("pendingCount").replace("{n}", String(r.pending_count))}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {myRequests.length > 0 && (
          <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
            <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border flex items-center justify-between">
              <span>{t("asPassenger")}</span>
              <button
                onClick={() => nav("/passaggi")}
                className="text-primary hover:underline normal-case font-semibold"
              >
                {t("seeAll")}
              </button>
            </div>
            {myRequests.map((r) => (
              <button
                key={r.id}
                onClick={() => nav("/passaggi", { state: { focusRideId: r.ride_post_id, mode: "request" } })}
                className="w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/40 transition-smooth"
              >
                <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{r.origin}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{r.destination}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {fmtDate(r.ride_date)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {r.ride_time.slice(0, 5)}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${statusColor(r.status)}`}>
                    {statusLabel(r.status)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
