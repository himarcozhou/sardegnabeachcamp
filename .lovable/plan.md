# Passaggi — remove accepted passengers + re-request flow

## What changes

### 1. Driver can remove an accepted passenger
In the **Manage requests** dialog (`ManageDialog`), each row with `status === 'accepted'` gets a small **Remove** icon button (Trash, destructive style) next to the status badge.

Clicking it:
- Asks for confirmation ("Rimuovi questo passeggero? Riceverà una notifica e potrà richiedere di nuovo il passaggio.")
- Sets the request `status` from `accepted` → `cancelled`
- The seat count automatically frees up (the `accepted_seats` aggregation in `get_ride_posts_with_driver` only counts `accepted`)
- Triggers a push + in-app notification to the passenger

### 2. Notification to the removed passenger
Extend `notify_on_ride_request_status` so that when a request transitions to `cancelled` **by someone other than the requester** (i.e. driver or admin), the passenger gets:
- IT: "Sei stato rimosso dal passaggio" — "Il guidatore ha annullato il tuo posto su {origin} → {destination}. Puoi richiederlo di nuovo."
- EN: "You've been removed from a ride" — "The driver cancelled your seat on {origin} → {destination}. You can request it again."

The trigger uses `auth.uid() IS DISTINCT FROM NEW.requester_id` to skip notifying users who cancel their own request.

### 3. Re-request rules — only `cancelled` can re-request
**Rejected passengers stay locked out.** Only passengers whose request was `cancelled` (i.e. removed by the driver) can ask again.

UI logic in `Passaggi.tsx` for the ride card when the user already has a `myReq`:
- `pending` → show pending badge + edit link (current behavior)
- `accepted` → show accepted badge (current behavior)
- `rejected` → show rejected badge, **no re-request button** (final state)
- `cancelled` → show **"Richiedi di nuovo" / "Ask again"** button that opens `RequestDialog` with the existing request

When that re-request is submitted, `RequestDialog` updates the existing row, also setting `status: 'pending'`, so the row count stays at one per (ride, user).

### 4. Database: drop unique constraint, enforce rule via RLS
Today `(ride_post_id, requester_id)` is unique on `ride_requests`, which blocks the update path needed for re-requesting. We:

- Drop the unique constraint and add a non-unique index for performance.
- Add a partial unique index that prevents duplicate **active** rows: at most one row per (ride, user) where status is `pending` or `accepted`. This still allows a `cancelled` row to coexist while we transition it back to `pending` via update (single row, no duplicate).
- Update the `Requester update own ride request` RLS policy with a `WITH CHECK` that blocks transitioning out of `rejected`. This makes the "rejected = final" rule enforced server-side, not just in the UI.

### 5. Clarify "Richieste aperte" label
In the edit form (`ComposeRide`), rename the toggle from "Richieste aperte / Open requests" to **"Accetta nuove richieste" / "Accept new requests"** with helper text: *"Disattiva per smettere di ricevere nuove richieste senza eliminare il passaggio."* / *"Turn off to stop accepting new requests without deleting the ride."*

## Technical details

**Migration:**
```sql
-- 1. Drop old unique constraint, add lookup index
ALTER TABLE public.ride_requests
  DROP CONSTRAINT IF EXISTS ride_requests_ride_post_id_requester_id_key;

CREATE INDEX IF NOT EXISTS ride_requests_post_requester_idx
  ON public.ride_requests (ride_post_id, requester_id);

-- 2. Prevent duplicate ACTIVE requests per (ride, user)
CREATE UNIQUE INDEX IF NOT EXISTS ride_requests_active_unique_idx
  ON public.ride_requests (ride_post_id, requester_id)
  WHERE status IN ('pending', 'accepted');

-- 3. Enforce "rejected is final" server-side
DROP POLICY IF EXISTS "Requester update own ride request" ON public.ride_requests;
CREATE POLICY "Requester update own ride request"
  ON public.ride_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id)
  WITH CHECK (
    auth.uid() = requester_id
    AND NOT EXISTS (
      SELECT 1 FROM public.ride_requests old
      WHERE old.id = ride_requests.id AND old.status = 'rejected'
    )
  );

-- 4. Update notify trigger
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
  ELSIF NEW.status = 'cancelled' AND auth.uid() IS DISTINCT FROM NEW.requester_id THEN
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

> Note: the `WITH CHECK` subquery on UPDATE references the row being updated by id. Postgres evaluates the subquery against current table state which is the OLD row at that moment, so this correctly blocks transitioning a row that is currently `rejected`. Driver/admin UPDATE paths use their own policies so they remain unaffected.

**Frontend edits (`src/pages/Passaggi.tsx`):**
- Extend `updateStatus` union in `ManageDialog` to include `'cancelled'`. Add a Trash icon button on rows where `status === 'accepted'` that confirms then calls `updateStatus(r.id, 'cancelled')`.
- In the main list, change the `myReq` rendering branch:
  - `cancelled` → render an "Ask again" button (`gradient-festive`) that opens `RequestDialog` with `editingRequest = myReq`.
  - `rejected` → keep status badge, no action.
- `RequestDialog.submit`: when `editingRequest` is provided and its current `status !== 'pending'`, include `status: 'pending'` in the update payload.
- `ComposeRide`: rename toggle label and add helper text below it.

**i18n keys to add (`src/lib/i18n.ts`):**
- `removePassenger` — "Rimuovi" / "Remove"
- `removePassengerConfirm` — confirm message
- `askAgain` — "Richiedi di nuovo" / "Ask again"
- `acceptNewRequests` — "Accetta nuove richieste" / "Accept new requests"
- `acceptNewRequestsHelp` — helper text

## Out of scope
- No reason field on removal.
- No history of past statuses kept — the row is reused.
- Rejected passengers cannot ask again (by design, your rule).
