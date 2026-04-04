import { EventRole, UserRole, ViewerPermissions } from "@/lib/types";

export function buildPermissions(globalRole: UserRole, eventRole?: EventRole): ViewerPermissions {
  const isHost = globalRole === "host";
  const isOrganizer = eventRole === "organizer";
  const isSeller = eventRole === "seller";

  return {
    eventRole,
    canCreateEvents: isHost,
    canManageEvent: isHost || eventRole === "host",
    canManageTeam: isHost || eventRole === "host" || isOrganizer,
    canManageSales: isHost || eventRole === "host" || isOrganizer || isSeller,
    canManageFinance: isHost || eventRole === "host",
    canManageTasks: isHost || eventRole === "host" || isOrganizer,
    canManageAnnouncements: isHost || eventRole === "host" || isOrganizer,
    canManageOwnSalesOnly: isSeller && !isHost,
    sellerUserId: isSeller ? undefined : undefined
  };
}
