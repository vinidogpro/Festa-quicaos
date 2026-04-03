import { UserRole, ViewerPermissions } from "@/lib/types";

export function buildPermissions(role: UserRole, sellerId?: string): ViewerPermissions {
  return {
    canCreateEvents: role === "admin",
    canManageEvent: role === "admin",
    canManageSales: role === "admin" || role === "organizer" || Boolean(sellerId),
    canManageFinance: role === "admin",
    canManageTasks: role === "admin" || role === "organizer",
    canManageAnnouncements: role === "admin" || role === "organizer",
    sellerId
  };
}
