# Update Password Validation

Change the password rule from "minimum 4 characters" to "minimum 6 characters AND must contain at least one number".

## Files to change

### 1. `src/pages/Onboarding.tsx` (signup)
- Update `accountSchema.password` from `z.string().min(4)` to:
  ```ts
  z.string().min(6, ...).regex(/\d/, ...)
  ```
- Update the password `<Input>` `minLength={4}` → `minLength={6}`.
- Update the placeholder text:
  - IT: "Min. 6 caratteri, almeno 1 numero"
  - EN: "Min. 6 chars, at least 1 number"
- Use translated error messages via `t(...)` (added to i18n).

### 2. `src/pages/Auth.tsx` (login)
- Update `credSchema.password` from `min(4)` to `min(6)` and add `.regex(/\d/, ...)` so existing accounts with weaker passwords still get a clear client error if they mistype — but keep the actual auth check server-side. (Login validation can stay permissive; we'll just bump `min(4)` → `min(6)` to match. No regex on login to avoid blocking legacy accounts.)
- Update `<Input minLength={4}>` → `minLength={6}`.

### 3. `src/lib/i18n.ts`
- Add two new keys used by the validation messages:
  - `passwordTooShort`: "La password deve avere almeno 6 caratteri" / "Password must be at least 6 characters"
  - `passwordNeedsNumber`: "La password deve contenere almeno un numero" / "Password must contain at least one number"

## Notes
- No database/migration changes needed — Supabase Auth has no minimum password rule configured here, so this is purely client-side enforcement on signup.
- Existing users keep their current passwords; the new rule applies only to new signups.
