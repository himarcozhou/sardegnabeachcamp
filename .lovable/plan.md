## Goals

1. Reduce wasted vertical space in the top "header" (LangToggle row) on `Welcome`, `Onboarding`, and `Auth`.
2. Make these three pages fit inside the viewport without vertical scrolling on a typical phone screen.
3. Replace the `Sparkles` lucide icon with a new minimalistic app logo.

## New logo

Generate a fresh, more minimalistic version of the current branding (beach volley camp, sea/sun vibes) and save it as:

- `src/assets/logo.png` (transparent PNG, square, ~512×512, clean flat shapes, limited palette aligned with the festive gradient — e.g. coral/teal/sand)

It will be imported as a static asset and reused everywhere Sparkles was used.

## Header trim

Today the top bar uses oversized top padding to clear the safe area:
- `Welcome.tsx`: `paddingTop: calc(env(safe-area-inset-top) + 3rem)`
- `Onboarding.tsx`: `pt-10` + a separate large title row underneath
- `Auth.tsx`: `pt-12 safe-top`

Changes:
- Replace these with a tight `safe-top` + `pt-2` (just enough to clear the notch).
- Reduce `pb-2` to `pb-1`.
- Keep `LangToggle size="sm"` (already small); no other changes to the toggle.

## Replace Sparkles with the logo

- `src/pages/Onboarding.tsx`
  - Remove `Sparkles` import and the `<Sparkles … />` next to the step title.
  - Import `logo` from `@/assets/logo.png`.
  - Render it as a small square image (`h-7 w-7 rounded-md`) in place of the icon, keeping the existing title beside it.
  - Slightly reduce title row spacing: `mb-6` → `mb-4`.

- `src/pages/Auth.tsx`
  - Remove `Sparkles` import.
  - Replace the gradient square containing `<Sparkles />` with the same gradient square but containing `<img src={logo} />` filling it (e.g. `h-10 w-10` inside a `h-14 w-14` container, with `object-contain`).
  - Reduce the heading block spacing: `mb-8` → `mb-5`, `py-10` → `py-4` on the centered wrapper.

- `src/pages/Welcome.tsx`
  - No Sparkles here, but tighten layout to avoid scroll:
    - Top bar: `pt-2` (after safe-area) instead of `+ 3rem`.
    - Slide image: `max-h-[50vh]` → `max-h-[42vh]`.
    - Footer: reduce `space-y-8` → `space-y-4`, `pt-4` → `pt-2`, and bottom safe-area extra from `+ 3.5rem` to `+ 1rem`.
    - Title: `text-3xl mb-3` → `text-2xl mb-2`; description `text-base` → `text-sm`.

## Verification

- Eyeball the three pages at the current preview viewport (~375–414 wide, ~720–800 tall) to confirm no vertical scrollbar appears with the keyboard closed.
- Confirm the logo renders crisply at small sizes (no blurry edges) and respects dark/light backgrounds (transparent PNG).

## Files touched

- new: `src/assets/logo.png`
- edit: `src/pages/Welcome.tsx`, `src/pages/Onboarding.tsx`, `src/pages/Auth.tsx`
