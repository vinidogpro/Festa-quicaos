import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
        <LogOut className="h-4 w-4" />
        Sair
      </button>
    </form>
  );
}
