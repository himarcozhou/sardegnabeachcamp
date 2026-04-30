import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Show a toast if the user's points increased between `prev` and `next`.
 * Use after a successful action that may grant points (DB triggers or RPCs).
 *
 * `template` should contain `{n}` which will be replaced by the delta.
 */
export function awardToast(
  prev: number | null | undefined,
  next: number | null | undefined,
  template: string,
) {
  const before = typeof prev === "number" ? prev : 0;
  const after = typeof next === "number" ? next : 0;
  const delta = after - before;
  if (delta > 0) {
    toast.success(template.replace("{n}", String(delta)));
  }
}
