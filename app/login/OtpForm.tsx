"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms";
import { sendOtp, verifyOtp } from "@/lib/actions";

type Labels = Record<"phone" | "send" | "code" | "verify" | "sent" | "bad_phone" | "bad_code" | "error", string>;

export function OtpForm({ labels }: { labels: Labels }) {
  const [sent, sendAction] = useFormState(sendOtp, null);
  const [verified, verifyAction] = useFormState(verifyOtp, null);
  const phone = sent?.ok ? sent.message ?? "" : "";
  const err = (code?: string) => (code ? labels[code as keyof Labels] ?? labels.error : null);

  if (!phone) {
    return (
      <form action={sendAction} className="flex flex-col gap-3">
        <label className="label">{labels.phone}<input className="input" name="phone" inputMode="tel" autoComplete="tel" placeholder="98765 43210" required /></label>
        <SubmitButton>{labels.send}</SubmitButton>
        <p aria-live="polite" className="text-sm text-warn">{err(sent?.error)}</p>
      </form>
    );
  }
  return (
    <form action={verifyAction} className="flex flex-col gap-3">
      <p className="text-sm text-good">{labels.sent.replace("{phone}", phone)}</p>
      <input type="hidden" name="phone" value={phone} />
      <label className="label">{labels.code}<input className="input tracking-[0.4em]" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required /></label>
      <SubmitButton>{labels.verify}</SubmitButton>
      <p aria-live="polite" className="text-sm text-warn">{err(verified?.error)}</p>
    </form>
  );
}
