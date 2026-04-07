import { NextResponse } from "next/server";
import { getEventActivitySectionById, getEventTeamSectionById } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const url = new URL(request.url);
  const section = url.searchParams.get("section");

  try {
    if (section === "team") {
      const payload = await getEventTeamSectionById(params.id);

      if (!payload) {
        return NextResponse.json({ message: "Festa ou sessao nao encontrada." }, { status: 404 });
      }

      return NextResponse.json(payload);
    }

    if (section === "activity") {
      const payload = await getEventActivitySectionById(params.id);

      if (!payload) {
        return NextResponse.json({ message: "Festa ou sessao nao encontrada." }, { status: 404 });
      }

      return NextResponse.json(payload);
    }

    return NextResponse.json({ message: "Secao invalida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Nao foi possivel carregar a secao solicitada."
      },
      { status: 500 }
    );
  }
}
