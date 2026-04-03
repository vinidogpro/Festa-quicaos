import { eventComparison, eventDetails, eventSummaries } from "@/lib/mock-data";
import { EventComparisonSnapshot, EventSummary, PartyEventDetail } from "@/lib/types";

export async function getEvents(): Promise<EventSummary[]> {
  return Promise.resolve(eventSummaries);
}

export async function getEventById(id: string): Promise<PartyEventDetail | undefined> {
  return Promise.resolve(eventDetails.find((event) => event.id === id));
}

export async function getEventComparison(): Promise<EventComparisonSnapshot> {
  return Promise.resolve(eventComparison);
}
