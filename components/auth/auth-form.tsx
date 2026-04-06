"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Feedback = {
  type: "error" | "success";
  message: string;
};

function getFriendlyErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos. Se a conta foi criada manualmente agora, confirme se o usuario ja existe no Supabase Auth.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Este usuario ainda nao confirmou o e-mail. Confirme pelo painel do Supabase ou desative essa exigencia para seu fluxo interno.";
  }

  if (normalized.includes("over_request_rate_limit") || normalized.includes("request rate limit reached")) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns instantes antes de tentar entrar novamente.";
  }

  return message;
}

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const nextPath = useMemo(() => searchParams.get("next") || "/", [searchParams]);
  const safeNextPath = useMemo(() => (nextPath.startsWith("/") ? nextPath : "/"), [nextPath]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFeedback(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setFeedback({
          type: "error",
          message: getFriendlyErrorMessage(error.message)
        });
        return;
      }

      setFeedback({
        type: "success",
        message: "Login realizado com sucesso. Redirecionando..."
      });

      startTransition(() => {
        router.replace(safeNextPath as any);
        router.refresh();
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">E-mail</span>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Mail className="h-4 w-4 text-slate-400" />
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="voce@grupo.com"
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Senha</span>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <LockKeyhole className="h-4 w-4 text-slate-400" />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="Sua senha"
          />
        </div>
      </label>

      {feedback ? (
        <p
          className={`rounded-2xl px-4 py-3 text-sm ${
            feedback.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      <button
        disabled={isSubmitting || isPending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting || isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        Entrar
      </button>
    </form>
  );
}
