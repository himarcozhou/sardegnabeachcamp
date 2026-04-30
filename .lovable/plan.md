# Notifications Panel

Transform the bell icon in the header from a simple toggle into a popover panel that lists the user's ride-related notifications (new ride requests, accepted, rejected). Unread notifications are visually highlighted; clicking an item marks it as read.

## What changes

### `src/components/NotificationsButton.tsx` (rework)
- Wrap the bell in a `Popover` (shadcn) instead of triggering subscribe directly on click.
- Show an unread count badge (small red dot/number) on top of the bell when `unread > 0`.
- Inside the popover:
  - Header: title "Notifiche" / "Notifications" + a "Segna tutte come lette" / "Mark all read" link (only if there are unread).
  - Scrollable list (max-height ~ 70vh) of the user's notifications from `public.notifications`, newest first, limit 30.
  - Each item shows: icon based on `type` (Car / CheckCircle2 / XCircle), title, body, relative time.
  - Unread items: highlighted background (`bg-primary/10`) + a small dot on the left. Read items: plain background.
  - Empty state: "Nessuna notifica".
- Keep the push-subscription opt-in: if the browser supports push and permission is `default`, show a small "Attiva notifiche push" button at the bottom of the popover (calls existing `subscribeToPush`). If `denied`, show a muted hint. This preserves the existing push flow without making the bell itself a toggle.
- Data loading:
  - On mount and whenever popover opens, `select * from notifications where user_id = auth.uid() order by created_at desc limit 30`.
  - Subscribe to realtime `postgres_changes` on `public.notifications` filtered by `user_id=eq.${user.id}` to live-update the list and the unread badge.
- Mark as read:
  - Clicking an unread item updates `read = true` for that row.
  - "Mark all read" updates all unread rows for the user.
  - If the notification has `data.ride_post_id`, navigate to `/passaggi` on click (and close the popover).

### `supabase/migrations/...` (realtime + index)
- `ALTER TABLE public.notifications REPLICA IDENTITY FULL;`
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;` (guarded so it does not error if already added).
- Optional index: `CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications (user_id, created_at DESC);`

### `src/lib/i18n.ts`
Add keys (IT / EN):
- `notifications` — "Notifiche" / "Notifications"
- `noNotifications` — "Nessuna notifica" / "No notifications"
- `markAllRead` — "Segna tutte come lette" / "Mark all as read"
- `enablePushShort` — "Attiva notifiche push" / "Enable push notifications"
- `pushBlockedHint` — short hint when permission denied.

(Existing `notificationsEnabled`, `notificationsBlocked`, `notificationsUnsupported`, `enableNotifications` keys are kept.)

## Behavior recap
- Click bell → opens panel (no longer triggers subscribe immediately).
- Unread count badge on bell.
- Items:
  - Unread → highlighted background + dot.
  - Read → plain.
  - Click → mark read + (if ride-related) jump to `/passaggi`.
- Push opt-in lives inside the panel as a secondary action.

## Notes
- All existing ride flows already insert into `public.notifications` via `notify_user` (driver gets `ride_request_new`, requester gets `ride_request_accepted` / `ride_request_rejected`), so no backend logic changes are needed for content — only realtime exposure of the table.
- RLS already restricts SELECT/UPDATE on `notifications` to the owner, so the client queries are safe.
