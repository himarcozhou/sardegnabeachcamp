## Goal

Replace `src/assets/logo.png` with a simpler, minimalistic, black & white, beach-volley-themed logo, and swap the remaining `Sparkles` usages on the Home page with the new logo.

## New logo

Regenerate `src/assets/logo.png` (transparent PNG, 512×512) with these constraints:
- Strictly black & white (no color, no gradient)
- Minimalistic / iconic — flat shapes, thick clean strokes, no fine detail
- Beach volley themed: e.g. a simple volleyball silhouette with a single curved line suggesting sand/horizon, or a stylized ball + sun arc
- High contrast, clearly visible at small sizes (down to ~20px)
- Centered, generous padding, transparent background

## Replace Sparkles

`src/pages/Home.tsx`:
- Remove `Sparkles` from the lucide-react import
- Import `logo from "@/assets/logo.png"`
- In the hero section, replace `<Sparkles className="h-4 w-4" />` with `<img src={logo} alt="" className="h-4 w-4 object-contain" />` (kept inline with the welcome label)

`Auth.tsx`, `Onboarding.tsx`, `Welcome.tsx` already use the logo from the previous pass — no further changes needed there; the new image file will flow through automatically.

## Verification

- Visually inspect logo at 16px, 28px, 40px and confirm it stays legible
- Confirm Home hero shows the new mark instead of the sparkle
- `rg "Sparkles" src/` should return no results

## Files touched

- replace: `src/assets/logo.png`
- edit: `src/pages/Home.tsx`
