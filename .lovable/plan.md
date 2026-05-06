## Goal
Clicking a ride-related notification in the bell popover should jump to that specific ride on `/passaggi` (highlight + open the relevant dialog), instead of just landing on the list.

## Context
`src/pages/Passaggi.tsx` already supports `location.state = { focusRideId, mode }`:
- Scrolls to + highlights the ride card.
- `mode: "manage"` opens the driver's request management dialog (if user is the driver).
- `mode: "request"` opens the requester's edit dialog (if they have a request).

Notifications carry `data.ride_post_id` (already referenced in `NotificationsButton.handleItemClick`) and a `type` such as `ride_request_new` (sent to drivers), `ride_request_accepted` / `ride_request_rejected` (sent to requesters).

## Change
Edit `src/components/NotificationsButton.tsx` `handleItemClick`:

- Determine the mode from `n.type`:
  - `ride_request_new` → `"manage"` (driver gets notified of incoming request).
  - `ride_request_accepted` / `ride_request_rejected` → `"request"` (requester views their request).
  - Other ride-prefixed types → no mode, just focus.
- If `n.data?.ride_post_id` exists, `navigate("/passaggi", { state: { focusRideId, mode } })`.
- Fallback to current behavior (plain `/passaggi`) when no ride id is present.
- Close the popover after navigation.

No DB or i18n changes needed.

## Files
- `src/components/NotificationsButton.tsx`
