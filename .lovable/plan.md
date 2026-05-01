# Open ride detail from Home

## Current behavior
Tapping a ride row in Home's "Passaggi" section (`RidesSection.tsx`) only navigates to `/passaggi`. The user lands at the top of the list and has to scroll/find the ride manually.

## Intended behavior
Tapping a ride row navigates to `/passaggi` AND opens the detail of that specific ride:
- If the user is the **driver** of that ride → opens the "Manage requests" dialog for it.
- If the user is a **passenger** with a request on that ride → opens the request edit dialog.
- In both cases the corresponding card is scrolled into view and briefly highlighted.

## Changes

### 1. `src/components/RidesSection.tsx`
Pass the ride context through `react-router` navigation state instead of a bare `nav("/passaggi")`:

- For driver rows: `nav("/passaggi", { state: { focusRideId: r.id, mode: "manage" } })`
- For passenger rows: `nav("/passaggi", { state: { focusRideId: r.ride_post_id, mode: "request" } })`
- "See all" links keep the plain `nav("/passaggi")` (no focus).

### 2. `src/pages/Passaggi.tsx`
- Read `useLocation().state` for `focusRideId` and `mode`.
- After `load()` resolves and `posts` is populated, in a `useEffect`:
  - Find the post by id.
  - If `mode === "manage"` and current user is the driver → `setOpenManageFor(post)`.
  - If `mode === "request"` and a `myRequests[post.id]` exists → `setOpenRequestFor(post)` + `setEditingRequest(myReq)`.
  - Scroll the corresponding article into view (`scrollIntoView({ behavior: "smooth", block: "center" })`) and add a temporary highlight class (e.g. ring + fade) for ~1.5s.
  - Clear the navigation state afterward (`window.history.replaceState({}, "")`) so refresh/back doesn't re-trigger.
- Add `id={`ride-${p.id}`}` and a conditional ring class to each `<article>` to support scroll + highlight.

## Notes
- No DB or schema changes.
- No new translations needed.
- Behavior preserved when navigating to `/passaggi` from the bottom tab bar (no state → nothing focused).
