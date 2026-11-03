"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/actions";

export function SubmitButton({ children, className = "btn-primary", disabled }: { children: React.ReactNode; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending}>
      {pending ? "…" : children}
    </button>
  );
}

/** A form bound to a server action that returns ActionState; shows a success or error line. */
export function ActionForm({
  action, children, className = "flex flex-col gap-3", successText, messages, resetOnSuccess = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  successText?: string;
  messages: Record<string, string>; // error/message code -> translated text
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useFormState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  const text = state?.error ? messages[state.error] ?? messages.error : state?.ok ? (state.message && messages[state.message]) || successText : null;
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <p aria-live="polite" className={`min-h-[1.25rem] text-sm ${state?.error ? "text-warn" : "text-good"}`}>{text}</p>
    </form>
  );
}
