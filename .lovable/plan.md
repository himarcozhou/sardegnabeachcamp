## Goals

1. Declutter the homepage — show your points in only one place.
2. Show a toast (e.g. "+2 points 🎉") for every action that earns points, not just guessing the lie.
3. Fix stale "Your points" UI by refreshing the profile after point-earning actions, so it updates as quickly as the leaderboard.

---

## 1. Homepage cleanup (`src/pages/Home.tsx`)

Currently your points appear in 3 places: a stat card, a big gradient strip, and a highlighted row in the leaderboard.

- **Keep**: the big gradient "Your points" strip above the leaderboard (most visible, on-brand).
- **Remove**: the "Your points" stat card from the 3-card stats grid.
- **Remove**: the highlighted-row treatment in the leaderboard list (your row will look like everyone else's).

The stats grid becomes 2 cards (Participants + Secrets), centered on a 2-column grid.

---

## 2. Toasts for every point-earning action

Today only `guess_lie` shows a toast. Points are also granted by:


| Action                     | Where                                                                 | Points         |
| -------------------------- | --------------------------------------------------------------------- | -------------- |
| Guess the lie correctly    | `People.tsx` (already toasted)                                        | +2             |
| Post a secret              | `Secrets.tsx` (DB trigger `points_on_secret`)                         | +1             |
| Post a comment on a secret | `Secrets.tsx` (DB trigger `points_on_comment`)                        | +1             |
| Complete the 3 facts       | `Profile.tsx` / `Onboarding.tsx` (trigger `points_on_profile_update`) | +5 (one-time)  |
| Add an avatar              | same                                                                  | +10 (one-time) |
| Add Instagram tag          | same                                                                  | +10 (one-time) |


Approach: after each successful action above, call `refreshProfile()` and **diff** the new `profile.points` against the previous value. If it increased, show `toast.success("+N punti 🎉")`. This works perfectly for DB-trigger-granted points because we don't have to know the rules client-side — we just observe the delta.

A small helper `awardToast(prevPoints, newPoints)` will be added (in `src/lib/utils.ts` or inline) and used in the relevant handlers.

New i18n keys:

- `pointsEarned`: `"+{n} punti 🎉"` / `"+{n} points 🎉"`

---

## 3. Faster updates for "Your points"

Root cause of slowness: the leaderboard row uses freshly-fetched RPC data, while the gradient strip reads `profile.points` from `AppContext`, which is only refreshed on auth events / manual calls. After a point-earning action we currently never call `refreshProfile()`.

Fixes:

- Call `refreshProfile()` from `AppContext` after each point-earning action listed above (this also enables the toast diff in step 2).
- On the Home page, call `refreshProfile()` once on mount, so navigating back to Home always shows fresh points.

Optional enhancement (low-cost): subscribe to realtime updates on the user's own row in `profiles` so points stay in sync even without a manual refresh. Will only add this if the simple refresh approach feels insufficient.

---

## Files to change

- `src/pages/Home.tsx` — remove points stat card; remove "isMe" leaderboard highlight; call `refreshProfile()` on mount.
- `src/pages/People.tsx` — keep existing toast; also call `refreshProfile()` after a correct guess.
- `src/pages/Secrets.tsx` — after posting a secret or a comment, refresh profile and show point-earned toast via diff.
- `src/pages/Profile.tsx` — after saving profile changes (facts/avatar/instagram), refresh and toast the diff.
- `src/pages/Onboarding.tsx` — same diff-toast at the end of onboarding.
- `src/lib/i18n.ts` — add `pointsEarned` (IT + EN).
- `src/lib/utils.ts` — small `awardToast(prev, next, t)` helper.

No DB / RLS / edge function changes needed.