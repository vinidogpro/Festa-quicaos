"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";

function ExportCsvButton({
  href,
  label,
  pendingLabel,
  successMessage,
  fallbackFileName,
  disabled = false
}: {
  href: string;
  label: string;
  pendingLabel: string;
  successMessage: string;
  fallbackFileName: string;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleExport() {
    try {
      setIsLoading(true);
      setStatus("idle");
      setMessage("");

      const response = await fetch(href, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        let errorMessage = "Nao foi possivel gerar o resumo agora.";

        try {
          const payload = await response.json();
          errorMessage = payload.error ?? errorMessage;
        } catch {
          errorMessage = await response.text();
        }

        setStatus("error");
        setMessage(errorMessage || "Nao foi possivel gerar o resumo agora.");
        return;
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const contentDisposition = response.headers.get("Content-Disposition");
      const fileNameMatch = contentDisposition?.match(/filename=\"?([^\"]+)\"?/i);
      const fileName = fileNameMatch?.[1] ?? fallbackFileName;

      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(downloadUrl);

      setStatus("success");
      setMessage(successMessage);
    } catch {
      setStatus("error");
      setMessage("Nao foi possivel baixar o arquivo agora. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleExport}
        disabled={disabled || isLoading}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {isLoading ? pendingLabel : label}
      </button>

      {message ? (
        <p
          className={`text-sm ${
            status === "success" ? "text-emerald-700" : status === "error" ? "text-rose-700" : "text-slate-500"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

function ExportSummaryActions({
  xlsxHref,
  csvHref,
  disabled
}: {
  xlsxHref: string;
  csvHref: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <ExportCsvButton
        href={xlsxHref}
        label="Exportar resumo (.xlsx)"
        pendingLabel="Gerando XLSX..."
        successMessage="Resumo gerencial exportado com sucesso."
        fallbackFileName="resumo-evento.xlsx"
        disabled={disabled}
      />
      <ExportCsvButton
        href={csvHref}
        label="Baixar CSV"
        pendingLabel="Gerando CSV..."
        successMessage="Resumo em CSV exportado com sucesso."
        fallbackFileName="resumo-evento.csv"
        disabled={disabled}
      />
    </div>
  );
}

export function ExportSummaryButton({
  eventId,
  disabled = false
}: {
  eventId: string;
  disabled?: boolean;
}) {
  return (
    <ExportSummaryActions
      xlsxHref={`/festas/${eventId}/export?format=xlsx`}
      csvHref={`/festas/${eventId}/export?format=csv`}
      disabled={disabled}
    />
  );
}

export function ExportGuestListButton({
  eventId,
  disabled = false
}: {
  eventId: string;
  disabled?: boolean;
}) {
  return (
    <ExportCsvButton
      href={`/festas/${eventId}/guest-list/export`}
      label="Exportar lista"
      pendingLabel="Gerando lista..."
      successMessage="Lista exportada com sucesso."
      fallbackFileName={`lista-evento-${eventId}.csv`}
      disabled={disabled}
    />
  );
}

export function ExportPortariaButton({
  eventId,
  disabled = false
}: {
  eventId: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <ExportCsvButton
        href={`/festas/${eventId}/guest-list/export?mode=portaria&format=xlsx`}
        label="Exportar lista da portaria"
        pendingLabel="Gerando lista..."
        successMessage="Lista da portaria exportada com sucesso."
        fallbackFileName={`lista-portaria-${eventId}.xlsx`}
        disabled={disabled}
      />
      <ExportCsvButton
        href={`/festas/${eventId}/guest-list/export?mode=portaria&format=csv`}
        label="CSV fallback"
        pendingLabel="Gerando CSV..."
        successMessage="CSV da portaria exportado com sucesso."
        fallbackFileName={`lista-portaria-${eventId}.csv`}
        disabled={disabled}
      />
    </div>
  );
}
