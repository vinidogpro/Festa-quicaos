"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className,
  pendingLabel = "Salvando..."
}: {
  children: React.ReactNode;
  className: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
