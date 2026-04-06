import { buildPermissionSnapshot } from "@/lib/permission-rules";
import { EventRole, UserRole, ViewerPermissions } from "@/lib/types";

export function buildPermissions(globalRole: UserRole, eventRole?: EventRole, viewerId?: string): ViewerPermissions {
  return buildPermissionSnapshot(globalRole, eventRole, viewerId) as ViewerPermissions;
}
