import type { ProfileRole } from "@/lib/types/database";

export function canManageSettings(role: ProfileRole) {
  return role === "admin";
}

export function canOperateQueue(role: ProfileRole) {
  return role === "admin" || role === "employee";
}
