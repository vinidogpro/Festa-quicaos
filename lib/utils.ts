import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { EventStatus } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(date));
}

export function getEventStatusLabel(status: EventStatus) {
  return {
    current: "Festa atual",
    upcoming: "Proxima festa",
    past: "Festa passada"
  }[status];
}
