export type PermissionUserRole = "host" | "organizer" | "seller";
export type PermissionEventRole = "host" | "organizer" | "seller" | undefined;

export interface PermissionSnapshot {
  eventRole?: PermissionEventRole;
  canCreateEvents: boolean;
  canManageEvent: boolean;
  canViewActivityLog: boolean;
  canManageTeam: boolean;
  canManageSales: boolean;
  canManageFinance: boolean;
  canManageTasks: boolean;
  canManageAnnouncements: boolean;
  canManageOwnSalesOnly: boolean;
  sellerUserId?: string;
}

export function buildPermissionSnapshot(
  globalRole: PermissionUserRole,
  eventRole?: PermissionEventRole,
  viewerId?: string
): PermissionSnapshot {
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
