## Make the "3 facts" step skippable

### Onboarding (`src/pages/Onboarding.tsx`, step 1)
- Add a small ghost-style "Salta" / "Skip" button under the main "Completa profilo" CTA.
- Clicking it sets `three_facts = null` and `onboarded = true`, then navigates home (same flow as `saveFacts`, just without validation and with `null` facts).

### Profile card (`src/pages/Profile.tsx`)
- Wrap the "My Facts" section (lines 222–235) so it only renders when `profile.three_facts` is a non-empty array. If skipped, the section is hidden entirely.
- The existing "Edit profile" dialog already initializes empty facts when none exist, so users can still add their 3 facts later from there.

### i18n (`src/lib/i18n.ts`)
- Add `skip` key: `"Salta"` (it) / `"Skip"` (en).

### Notes
- `People.tsx` already guards on `open.three_facts && open.three_facts.length > 0`, so skipped users won't show facts to others.
- No DB / schema changes needed (column already nullable).
