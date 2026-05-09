## Goal
Allow admins to delete any ride post (passaggio) from the Passaggi list, not just their own.

## Changes

### `src/pages/Passaggi.tsx`
- Pull `isAdmin` from `useApp()` (already used elsewhere in the codebase).
- In the per-ride card header (~line 191), change the gate from `{isOwner && ...}` to `{(isOwner || isAdmin) && ...}` so admins also see the action buttons.
  - Keep the **Edit** (Pencil) button gated to `isOwner` only — admins shouldn't edit someone else's ride content from this UI.
  - Show the **Delete** (Trash) button when `isOwner || isAdmin`.
- Delete handler is unchanged — `supabase.from("ride_posts").delete().eq("id", p.id)` already works for admins thanks to the existing RLS policy `Admin manage ride posts`.

## Notes
- No DB / RLS changes needed.
- No i18n changes needed (reuses existing strings).
- Out of scope: admin-cancelling individual ride requests, or admin-editing rides — let me know if you want those too.
