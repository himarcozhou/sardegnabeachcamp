## Goal
Let users cancel their own ride join requests (both `pending` and `accepted`) directly from the Passaggi list. Once cancelled, the existing "Richiedi di nuovo" (ask again) button already handles re-requesting.

## Changes

### `src/pages/Passaggi.tsx`
In the per-ride card (the `myReq` block, ~lines 254–276), when `myReq.status` is `pending` or `accepted`, add a small "Annulla richiesta" link/button under the status badge:

- For `pending`: keep the existing "Modifica" link, and add a second "Annulla richiesta" link in destructive color.
- For `accepted`: add an "Annulla posto" link in destructive color (the user is giving up their confirmed seat).
- Both call a new `cancelMyRequest(myReq.id)` handler that:
  1. Opens a `confirmDialog` ("Annullare la richiesta?" / "Cancel your request?", destructive).
  2. Updates the row: `supabase.from("ride_requests").update({ status: "cancelled" }).eq("id", myReq.id)`.
  3. On success, toast + `load()`.

The existing RLS policy `Requester update own ride request` already permits this (status != rejected), and the existing `cancelled`-branch UI in the card will then show the "Richiedi di nuovo" button.

### `src/lib/i18n.ts`
Add new keys:
- `cancelRequest` → IT: "Annulla richiesta", EN: "Cancel request"
- `cancelSeat` → IT: "Annulla posto", EN: "Cancel seat"
- `cancelRequestConfirmTitle` → IT: "Annullare la richiesta?", EN: "Cancel this request?"
- `cancelRequestConfirmDesc` → IT: "Potrai richiederla di nuovo in seguito.", EN: "You can request again later."
- `requestCancelled` → IT: "Richiesta annullata", EN: "Request cancelled"

## Notes
- No DB or RLS changes needed.
- No notification trigger fires for requester-initiated cancellations on their own rows (the existing `notify_on_ride_request_status` only notifies the requester, not the driver). If you want the driver to also get notified when a passenger cancels, that's a separate follow-up — let me know and I'll add it.
