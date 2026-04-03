"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className
}: {
  children: React.ReactNode;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button disabled={pending} className={className}>
      {pending ? "Salvando..." : children}
    </button>
  );
}
