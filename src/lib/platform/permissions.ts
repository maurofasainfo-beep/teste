import type { PlatformRole } from "@/lib/types/database";

export function canManageClientCompanies(role: PlatformRole) {
  return role === "owner" || role === "admin";
}

export function canManagePlatformUsers(role: PlatformRole) {
  return role === "owner";
}

export function canResetClientAccess(role: PlatformRole) {
  return role === "owner" || role === "admin";
}

export function canViewPlatformData(role: PlatformRole) {
  return role === "owner" || role === "admin" || role === "support";
}
