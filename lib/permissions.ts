import { EventRole, UserRole, ViewerPermissions } from "@/lib/types";

export function buildPermissions(globalRole: UserRole, eventRole?: EventRole, viewerId?: string): ViewerPermissions {
  const isHost = globalRole === "host";
  const isEventHost = eventRole === "host";
  const isOrganizer = eventRole === "organizer";
  const isSeller = eventRole === "seller";

  return {
    eventRole,
    canCreateEvents: isHost,
    canManageEvent: isHost || isEventHost,
    canViewActivityLog: isHost || isEventHost,
    canManageTeam: isHost || isEventHost || isOrganizer,
    canManageSales: isHost || isEventHost || isOrganizer || isSeller,
    canManageFinance: isHost || isEventHost || isOrganizer,
    canManageTasks: isHost || isEventHost || isOrganizer,
    canManageAnnouncements: isHost || isEventHost || isOrganizer,
    canManageOwnSalesOnly: !isHost && isSeller,
    sellerUserId: !isHost && isSeller ? viewerId : undefined
  };
}
