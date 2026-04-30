# Passaggi — remove accepted passengers + re-request flow

## What changes

### 1. Driver can remove an accepted passenger
In the **Manage requests** dialog (`ManageDialog`), each accepted passenger row will get a small **"Remove"** button (Trash icon, destructive style) next to their status badge.

Clicking it:
- Asks for confirmation ("Remove this passenger? They'll be notified and can request again.")
- Sets the request `status` from `accepted` → `cancelled` (also adds an optional short reason field — skipped for now to keep UX simple)
- The seat count automatically frees up (the `accepted_seats` aggregation in `get_ride_posts_with_driver` only counts `accepted`)
- Triggers a push + in-app notification to the passenger

### 2. Notification to the removed passenger
Extend the existing `notify_on_ride_request_status` trigger so that when status changes to `cancelled` **by the driver** (not the requester themselves), it sends:
- Title: "Sei stato rimosso dal passaggio" / "You've been removed from a ride"
- Body: "Il guidatore ha annullato il tuo posto su {origin} → {destination}. Puoi richiederlo di nuovo."

To distinguish "driver removed me" from "I cancelled my own request", the trigger checks whether `auth.uid() = requester_id`. If yes → no notification. If no (driver or admin did it) → send the notification.

### 3. Removed passenger can re-request
Today there is a unique constraint `(ride_post_id, requester_id)` on `ride_requests` which blocks a second request (the `23505` error path in `RequestDialog`). Two options:

- **Option A (chosen):** Drop the unique constraint and instead, when the user opens the ride card and already has a `cancelled` or `rejected` request, the UI shows the "Ask for ride" button again (instead of the status badge). Submitting **updates** the existing row back to `pending` with the new seats/luggage, instead of inserting a new one.
- This keeps history clean (one row per user per ride) and avoids duplicates.

UI logic in `Passaggi.tsx`:
- If `myReq` exists AND `myReq.status` is `cancelled` or `rejected` → show **"Ask for ride again"** button instead of the status badge.
- The submit handler in `RequestDialog` already supports update mode via `editingRequest`; we'll pass the cancelled/rejected request as `editingRequest` and additionally reset its status to `pending` on save.

### 4. Clarify "Richieste aperte" label
Rename the toggle in the edit form from "Richieste aperte / Open requests" to **"Accetta nuove richieste" / "Accept new requests"** with a small helper text below: *"Disattiva per smettere di ricevere nuove richieste senza eliminare il passaggio."*

## Technical details

**Database migration:**
```sql
-- 1. Drop unique constraint so re-request via update is the only path,
--    but keep an index for performance
ALTER TABLE public.ride_requests
  DROP CONSTRAINT IF EXISTS ride_requests_ride_post_id_requester_id_key;

CREATE INDEX IF NOT EXISTS ride_requests_post_requester_idx
  ON public.ride_requests (ride_post_id, requester_id);

-- 2. Update notify trigger to handle driver-initiated cancellation
CREATE OR REPLACE FUNCTION public.notify_on_ride_request_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_origin text; v_destination text;
  v_title text; v_body text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  SELECT origin, destination INTO v_origin, v_destination
  FROM public.ride_posts WHERE id = NEW.ride_post_id;

  IF NEW.status = 'accepted' THEN
    v_title := 'Richiesta accettata ✅';
    v_body  := 'Il tuo passaggio ' || v_origin || ' → ' || v_destination || ' è stato accettato!';
  ELSIF NEW.status = 'rejected' THEN
    v_title := 'Richiesta rifiutata';
    v_body  := 'Il tuo passaggio ' || v_origin || ' → ' || v_destination || ' è stato rifiutato.';
  ELSIF NEW.status = 'cancelled' AND auth.uid() <> NEW.requester_id THEN
    v_title := 'Sei stato rimosso dal passaggio';
    v_body  := 'Il guidatore ha annullato il tuo posto su ' || v_origin || ' → ' || v_destination || '. Puoi richiederlo di nuovo.';
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.notify_user(
    NEW.requester_id,
    'ride_request_' || NEW.status,
    v_title, v_body,
    jsonb_build_object('ride_post_id', NEW.ride_post_id, 'request_id', NEW.id, 'status', NEW.status)
  );
  RETURN NEW;
END; $$;
```

**Frontend edits (`src/pages/Passaggi.tsx`):**
- `ManageDialog`: add a Remove button for rows where `status === 'accepted'` that calls `updateStatus(r.id, 'cancelled')` (extend the union type).
- Main list: when `myReq.status` is `cancelled` or `rejected`, render the "Ask for ride again" CTA which opens `RequestDialog` with `editingRequest = myReq`.
- `RequestDialog`: when submitting an update for a request whose status is not `pending`, also set `status: 'pending'` in the update payload.
- `ComposeRide`: change toggle label and add helper text.

**i18n keys to add (`src/lib/i18n.ts`):**
- `removePassenger` / `Rimuovi passeggero` / `Remove passenger`
- `removePassengerConfirm` / confirmation message
- `askAgain` / `Richiedi di nuovo` / `Ask again`
- `acceptNewRequests` / `Accetta nuove richieste` / `Accept new requests`
- `acceptNewRequestsHelp` / helper text

## Out of scope
- No reason field on removal (can be added later if needed).
- No history of past statuses — we just overwrite the request row.
