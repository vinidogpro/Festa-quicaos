import { EventRole, UserRole, ViewerPermissions } from "@/lib/types";

export function buildPermissions(globalRole: UserRole, eventRole?: EventRole): ViewerPermissions {
  const isHost = globalRole === "host";
  const isEventHost = eventRole === "host";
  const isOrganizer = eventRole === "organizer";
  const isSeller = eventRole === "seller";

  return {
    eventRole,
    canCreateEvents: isHost,
    canManageEvent: isEventHost,
    canManageTeam: isEventHost || isOrganizer,
    canManageSales: isEventHost || isOrganizer || isSeller,
    canManageFinance: isEventHost || isOrganizer,
    canManageTasks: isEventHost || isOrganizer,
    canManageAnnouncements: isEventHost || isOrganizer,
    canManageOwnSalesOnly: isSeller,
    sellerUserId: isSeller ? undefined : undefined
  };
}
