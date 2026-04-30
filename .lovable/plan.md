## Goal

Fix visual issues in dark mode for the **Pubblica Passaggio** dialog (and similar custom overlays) so all text, inputs, and surfaces render with proper contrast.

## Findings

The codebase mostly uses semantic tokens (good). The issues are concentrated in custom-built overlays (not shadcn `Dialog`):

1. **`src/pages/Passaggi.tsx` → `ComposeRide`** (lines ~270–340): custom overlay using `bg-card`. In dark mode:
   - Native HTML `<input type="date">` and `<input type="time">` inherit browser styling — the calendar/clock icon is black on dark background, nearly invisible.
   - Border on the modal blends into the dark backdrop (no visible edge).
   - No explicit `text-foreground` / `border-border` on the container, so contrast can be inconsistent.

2. **`src/pages/Secrets.tsx`** (line 228): same custom overlay pattern — same date/time concerns where applicable.

3. **`src/pages/Profile.tsx` line 131**: hardcoded `bg-white text-primary` on the avatar edit badge — stays white in dark mode (acceptable but inconsistent with theme; should use `bg-card text-foreground` or keep but ensure ring contrast).

4. Native date/time pickers globally need a dark-mode `color-scheme: dark` hint so the browser renders the picker UI in dark.

## Changes

### `src/index.css`
- Add a `color-scheme` declaration so native inputs (date, time, scrollbars) follow theme:
  ```css
  :root { color-scheme: light; }
  .dark { color-scheme: dark; }
  ```
- Optionally add a small utility to invert the date/time picker indicator icon in dark mode:
  ```css
  .dark input[type="date"]::-webkit-calendar-picker-indicator,
  .dark input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(1); }
  ```

### `src/pages/Passaggi.tsx` (ComposeRide modal)
- Add `text-foreground border border-border` to the modal panel for explicit contrast and a visible edge:
  ```tsx
  <div className="w-full max-w-md bg-card text-foreground border border-border rounded-3xl ...">
  ```
- Ensure the close button has `text-muted-foreground hover:text-foreground`.

### `src/pages/Secrets.tsx` (compose modal)
- Apply the same `text-foreground border border-border` treatment to the panel for consistency.

### `src/pages/Profile.tsx`
- Change the avatar edit badge from `bg-white text-primary` to `bg-card text-foreground border border-border` so it adapts to dark mode.

## Out of scope

- shadcn `Dialog`, `Sheet`, `Drawer`, `AlertDialog` — already token-based and dark-friendly.
- Gradient buttons (`gradient-festive text-white`) — intentional and look correct in both themes.

## Verification

After changes, in dark mode open: Passaggi → "+", Secrets → "+", Profile avatar badge. Confirm:
- Modal panel has visible border and readable text.
- Date/time inputs show light icons and a dark-themed native picker.
- No white surfaces on dark backgrounds (except intentional gradients).
