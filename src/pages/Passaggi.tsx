import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { awardToast } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, X, Car, Calendar, Clock, Users as UsersIcon, ArrowRight,
  Check, MapPin, Trash2, Luggage, Pencil, ArrowLeftRight, Phone,
} from "lucide-react";
import { z } from "zod";
import { useConfirm } from "@/components/ConfirmDialog";

interface RidePost {
  id: string;
  driver_id: string;
  driver_name: string | null;
  driver_surname: string | null;
  driver_avatar: string | null;
  ride_date: string;
  ride_time: string;
  origin: string;
  destination: string;
  slots: number;
  notes: string | null;
  is_open: boolean;
  created_at: string;
  accepted_seats: number;
}

interface RideRequest {
  id: string;
  ride_post_id: string;
  requester_id: string;
  requester_name: string | null;
  requester_surname: string | null;
  requester_avatar: string | null;
  seats: number;
  luggage: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  driver_note: string | null;
  created_at: string;
}

const ridePostSchema = z.object({
  ride_date: z.string().min(1),
  ride_time: z.string().min(1),
  slots: z.number().int().min(1).max(8),
  notes: z.string().trim().max(280).optional(),
});

const requestSchema = z.object({
  seats: z.number().int().min(1).max(8),
  luggage: z.string().trim().min(2).max(280),
});

export default function Passaggi() {
  const { t, lang } = useT();
  const { user } = useApp();
  const confirmDialog = useConfirm();
  const [posts, setPosts] = useState<RidePost[]>([]);
  const [myRequests, setMyRequests] = useState<Record<string, RideRequest>>({});
  const [composing, setComposing] = useState(false);
  const [editingPost, setEditingPost] = useState<RidePost | null>(null);
  const [openRequestFor, setOpenRequestFor] = useState<RidePost | null>(null);
  const [editingRequest, setEditingRequest] = useState<RideRequest | null>(null);
  const [openManageFor, setOpenManageFor] = useState<RidePost | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_ride_posts_with_driver");
    if (error) {
      toast.error(error.message);
      return;
    }
    setPosts((data as any) || []);
    if (user) {
      const { data: reqs } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("requester_id", user.id);
      const m: Record<string, RideRequest> = {};
      (reqs || []).forEach((r: any) => {
        m[r.ride_post_id] = r;
      });
      setMyRequests(m);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-3 animate-fade-in pb-20">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
        <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs">
          <div className="font-bold mb-0.5">{t("phoneTipTitle")}</div>
          <p className="text-muted-foreground leading-snug">{t("phoneTip")}</p>
        </div>
      </div>

      {posts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">{t("noRides")}</div>
      )}

      {posts.map((p) => {
        const seatsLeft = Math.max(0, p.slots - (p.accepted_seats || 0));
        const isOwner = user?.id === p.driver_id;
        const myReq = myRequests[p.id];
        return (
          <article
            key={p.id}
            className={`rounded-2xl bg-card border p-4 shadow-card ${p.is_open ? "border-border" : "border-muted opacity-70"}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                name={p.driver_name || "?"}
                surname={p.driver_surname || ""}
                url={p.driver_avatar}
                size={40}
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">
                  {p.driver_name} {p.driver_surname}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Car className="h-3 w-3" /> {lang === "it" ? "Guidatore" : "Driver"}
                </div>
              </div>
              {isOwner && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingPost(p)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={async () => {
                      const ok = await confirmDialog({
                        title: lang === "it" ? "Eliminare il passaggio?" : "Delete this ride?",
                        description:
                          lang === "it"
                            ? "Questa azione non può essere annullata."
                            : "This action cannot be undone.",
                        confirmText: t("delete"),
                        destructive: true,
                      });
                      if (!ok) return;
                      const { error } = await supabase.from("ride_posts").delete().eq("id", p.id);
                      if (error) toast.error(error.message);
                      else load();
                    }}
                    className="text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold mb-2">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{p.origin}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{p.destination}</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(p.ride_date).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                })}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {p.ride_time.slice(0, 5)}
              </span>
              <span className="inline-flex items-center gap-1">
                <UsersIcon className="h-3.5 w-3.5" />
                {seatsLeft > 0 ? `${seatsLeft} ${t("seatsLeft")}` : t("full")}
              </span>
            </div>

            {p.notes && <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{p.notes}</p>}

            <div className="flex items-center gap-2">
              {isOwner ? (
                <Button
                  onClick={() => setOpenManageFor(p)}
                  variant="secondary"
                  className="rounded-full font-bold flex-1"
                >
                  {t("pendingRequests")}
                </Button>
              ) : myReq ? (
                myReq.status === "cancelled" ? (
                  <Button
                    onClick={() => {
                      setOpenRequestFor(p);
                      setEditingRequest(myReq);
                    }}
                    disabled={!p.is_open || seatsLeft === 0}
                    className="gradient-festive text-white border-0 rounded-full font-bold flex-1"
                  >
                    {t("askAgain")}
                  </Button>
                ) : (
                  <div className="flex-1 flex flex-col gap-1">
                    <div className={`text-sm font-bold rounded-full px-4 py-2 text-center
                      ${myReq.status === "accepted" ? "bg-accent/20 text-accent" : ""}
                      ${myReq.status === "pending" ? "bg-muted text-muted-foreground" : ""}
                      ${myReq.status === "rejected" ? "bg-destructive/15 text-destructive" : ""}
                    `}>
                      {myReq.status === "accepted" && t("statusAccepted")}
                      {myReq.status === "pending" && t("statusPending")}
                      {myReq.status === "rejected" && t("statusRejected")}
                    </div>
                    {myReq.status === "pending" && (
                      <button
                        onClick={() => {
                          setOpenRequestFor(p);
                          setEditingRequest(myReq);
                        }}
                        className="text-[10px] text-center text-muted-foreground hover:text-foreground font-semibold"
                      >
                        {t("edit")}
                      </button>
                    )}
                  </div>
                )
              ) : (
                <Button
                  onClick={() => setOpenRequestFor(p)}
                  disabled={!p.is_open || seatsLeft === 0}
                  className="gradient-festive text-white border-0 rounded-full font-bold flex-1"
                >
                  {t("askForRide")}
                </Button>
              )}
            </div>
          </article>
        );
      })}

      {/* FAB */}
      {user && !composing && (
        <button
          onClick={() => setComposing(true)}
          className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full gradient-festive text-white shadow-glow flex items-center justify-center hover:scale-105 transition-smooth"
          aria-label={t("postRide")}
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {(composing || editingPost) && (
        <ComposeRide
          editingPost={editingPost}
          onClose={() => {
            setComposing(false);
            setEditingPost(null);
          }}
          onDone={() => {
            setComposing(false);
            setEditingPost(null);
            load();
          }}
        />
      )}

      <RequestDialog
        post={openRequestFor}
        editingRequest={editingRequest}
        onClose={() => {
          setOpenRequestFor(null);
          setEditingRequest(null);
        }}
        onSent={() => {
          setOpenRequestFor(null);
          setEditingRequest(null);
          load();
        }}
      />

      <ManageDialog
        post={openManageFor}
        onClose={() => setOpenManageFor(null)}
        onChanged={() => load()}
      />
    </div>
  );
}

function ComposeRide({ 
  onClose, 
  onDone, 
  editingPost 
}: { 
  onClose: () => void; 
  onDone: () => void;
  editingPost: RidePost | null;
}) {
  const { t, lang } = useT();
  const { user, profile, refreshProfile } = useApp();
  const [date, setDate] = useState(editingPost?.ride_date || "");
  const [time, setTime] = useState(editingPost?.ride_time || "");
  const [slots, setSlots] = useState<string>(editingPost?.slots ? String(editingPost.slots) : "3");
  const [notes, setNotes] = useState(editingPost?.notes || "");
  const [origin, setOrigin] = useState(editingPost?.origin || "Resort Perdepera");
  const [destination, setDestination] = useState(editingPost?.destination || "Aeroporto Cagliari");
  const [isOpen, setIsOpen] = useState(editingPost?.is_open ?? true);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user) return;
    const slotsNum = parseInt(slots, 10);
    if (!slots.trim() || isNaN(slotsNum) || slotsNum < 1 || slotsNum > 8) {
      toast.error(lang === "it" ? "Inserisci un numero di posti valido (1-8)" : "Enter a valid number of seats (1-8)");
      return;
    }
    const parsed = ridePostSchema.safeParse({ ride_date: date, ride_time: time, slots: slotsNum, notes });
    if (!parsed.success) {
      toast.error(t("requiredField"));
      return;
    }

    if (editingPost && slotsNum < editingPost.accepted_seats) {
      toast.error(t("slotsBelowAcceptedError"));
      return;
    }

    setSaving(true);
    const data = {
      driver_id: user.id,
      ride_date: date,
      ride_time: time,
      slots: slotsNum,
      notes: notes.trim() || null,
      origin: origin.trim() || "Resort Perdepera",
      destination: destination.trim() || "Aeroporto Cagliari",
      is_open: isOpen,
    };

    const { error } = editingPost 
      ? await supabase.from("ride_posts").update(data).eq("id", editingPost.id)
      : await supabase.from("ride_posts").insert(data);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingPost ? t("success") : t("rideCreated"));
    if (!editingPost) {
      const prev = profile?.points ?? 0;
      const fresh = await refreshProfile();
      awardToast(prev, fresh?.points, t("pointsEarned"));
    }
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-3xl p-5 shadow-glow animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">{editingPost ? t("editRide") : t("postRide")}</h3>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-smooth">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label>{t("rideFrom")}</Label>
              <Input value={origin} onChange={(e) => setOrigin(e.target.value)} maxLength={60} />
            </div>
            <button
              type="button"
              onClick={() => { const o = origin; setOrigin(destination); setDestination(o); }}
              aria-label="Swap"
              className="h-10 w-10 shrink-0 rounded-xl bg-muted hover:bg-muted/70 flex items-center justify-center transition-smooth"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
            <div className="flex-1">
              <Label>{t("rideTo")}</Label>
              <Input value={destination} onChange={(e) => setDestination(e.target.value)} maxLength={60} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("rideDay")}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>{t("rideTime")}</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>{t("rideSlots")}</Label>
            <Input
              type="number"
              min={1}
              max={8}
              value={slots}
              onChange={(e) => setSlots(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("rideNotes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={280}
              rows={3}
              placeholder={lang === "it" ? "Es. partenza puntuale, bagagliaio piccolo..." : "E.g. on time, small trunk..."}
            />
          </div>
          {editingPost && (
            <div className="py-2">
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">{t("acceptNewRequests")}</Label>
                <input 
                  type="checkbox" 
                  checked={isOpen} 
                  onChange={(e) => setIsOpen(e.target.checked)}
                  className="w-5 h-5 accent-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t("acceptNewRequestsHelp")}</p>
            </div>
          )}
          <Button
            onClick={submit}
            disabled={saving}
            className="w-full gradient-festive text-white border-0 rounded-xl font-bold"
          >
            {saving ? t("loading") : editingPost ? t("saveChanges") : t("post")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RequestDialog({
  post,
  editingRequest,
  onClose,
  onSent,
}: {
  post: RidePost | null;
  editingRequest: RideRequest | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const { t, lang } = useT();
  const { user } = useApp();
  const [seats, setSeats] = useState(editingRequest?.seats || 1);
  const [luggage, setLuggage] = useState(editingRequest?.luggage || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (post) {
      setSeats(editingRequest?.seats || 1);
      setLuggage(editingRequest?.luggage || "");
    }
  }, [post, editingRequest]);

  const submit = async () => {
    if (!post || !user) return;
    if (post.driver_id === user.id) {
      toast.error(t("cantRequestOwn"));
      return;
    }
    const parsed = requestSchema.safeParse({ seats, luggage });
    if (!parsed.success) {
      toast.error(t("requiredField"));
      return;
    }
    setSaving(true);
    const data = {
      ride_post_id: post.id,
      requester_id: user.id,
      seats,
      luggage: luggage.trim(),
    };

    const isReRequest = !!editingRequest && editingRequest.status !== "pending";
    const updatePayload: any = { seats, luggage: luggage.trim() };
    if (isReRequest) updatePayload.status = "pending";

    const { error } = editingRequest
      ? await supabase.from("ride_requests").update(updatePayload).eq("id", editingRequest.id)
      : await supabase.from("ride_requests").insert(data);
    setSaving(false);
    if (error) {
      if (error.code === "23505") toast.error(t("requestExists"));
      else toast.error(error.message);
      return;
    }
    toast.success(isReRequest ? t("requestSent") : editingRequest ? t("success") : t("requestSent"));
    onSent();
  };

  return (
    <Dialog open={!!post} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>{editingRequest ? t("editRequest") : t("askForRide")}</DialogTitle>
        </DialogHeader>
        {post && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {post.origin} <ArrowRight className="h-3 w-3" /> {post.destination}
            </div>
            <div>
              <Label>{t("seatsRequested")}</Label>
              <Input
                type="number"
                min={1}
                max={Math.max(1, post.slots - post.accepted_seats)}
                value={seats}
                onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <Luggage className="h-3.5 w-3.5" /> {t("luggageInfo")}
              </Label>
              <Textarea
                value={luggage}
                onChange={(e) => setLuggage(e.target.value)}
                maxLength={280}
                rows={3}
                placeholder={
                  lang === "it"
                    ? "Es. 1 trolley grande + 1 zaino"
                    : "E.g. 1 large suitcase + 1 backpack"
                }
              />
            </div>
            <Button
              onClick={submit}
              disabled={saving}
              className="w-full gradient-festive text-white border-0 rounded-xl font-bold"
            >
              {saving ? t("loading") : editingRequest ? t("saveChanges") : t("sendRequest")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ManageDialog({
  post,
  onClose,
  onChanged,
}: {
  post: RidePost | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t, lang } = useT();
  const confirmDialog = useConfirm();
  const [reqs, setReqs] = useState<RideRequest[]>([]);

  const load = useCallback(async () => {
    if (!post) return;
    const { data, error } = await supabase.rpc("get_ride_requests_for_post", { _post_id: post.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    setReqs((data as any) || []);
  }, [post]);

  useEffect(() => {
    if (post) load();
    else setReqs([]);
  }, [post, load]);

  const updateStatus = async (id: string, status: "accepted" | "rejected" | "cancelled") => {
    const { error } = await supabase.from("ride_requests").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("requestUpdated"));
    load();
    onChanged();
  };

  const removePassenger = async (id: string) => {
    const ok = await confirmDialog({
      title: t("removePassenger"),
      description: t("removePassengerConfirm"),
      confirmText: t("removePassenger"),
      destructive: true,
    });
    if (!ok) return;
    await updateStatus(id, "cancelled");
  };

  return (
    <Dialog open={!!post} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("pendingRequests")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {reqs.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">{t("nothingHere")}</div>
          )}
          {reqs.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border p-3">
              <div className="flex items-center gap-3 mb-2">
                <Avatar
                  name={r.requester_name || "?"}
                  surname={r.requester_surname || ""}
                  url={r.requester_avatar}
                  size={36}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate text-sm">
                    {r.requester_name} {r.requester_surname}
                  </div>
                  <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <UsersIcon className="h-3 w-3" /> {r.seats} {t("seatsRequested").toLowerCase()}
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    r.status === "accepted"
                      ? "bg-accent/20 text-accent"
                      : r.status === "rejected"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {r.status === "pending" && t("statusPending")}
                  {r.status === "accepted" && t("statusAccepted")}
                  {r.status === "rejected" && t("statusRejected")}
                  {r.status === "cancelled" && t("statusCancelled")}
                </span>
              </div>
              <div className="text-sm bg-muted rounded-xl p-2 mb-2 inline-flex items-start gap-2">
                <Luggage className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span className="whitespace-pre-wrap">{r.luggage}</span>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateStatus(r.id, "accepted")}
                    className="flex-1 gradient-festive text-white border-0 rounded-full font-bold"
                  >
                    <Check className="h-4 w-4 mr-1" /> {t("accept")}
                  </Button>
                  <Button
                    onClick={() => updateStatus(r.id, "rejected")}
                    variant="outline"
                    className="flex-1 rounded-full font-bold"
                  >
                    <X className="h-4 w-4 mr-1" /> {t("reject")}
                  </Button>
                </div>
              )}
              {r.status === "accepted" && (
                <Button
                  onClick={() => removePassenger(r.id)}
                  variant="outline"
                  className="w-full rounded-full font-bold text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-1" /> {t("removePassenger")}
                </Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
