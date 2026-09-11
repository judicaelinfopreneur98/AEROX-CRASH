import { Role } from './types';

export const Permissions = {
  MANAGE_USERS: ['ADMIN', 'SUPER_ADMIN'],
  ADJUST_BALANCE: ['SUPER_ADMIN'],
  VIEW_AUDIT_LOGS: ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'],
  CONFIGURE_LIMITS: ['ADMIN', 'SUPER_ADMIN'],
  VIEW_ADMIN_DASHBOARD: ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'],
  SUSPEND_USER: ['ADMIN', 'SUPER_ADMIN'],
} as const;

export function hasPermission(role: Role, requiredRoles: readonly string[]): boolean {
  return requiredRoles.includes(role);
}

export function canAccessAdmin(role: Role): boolean {
  return hasPermission(role, Permissions.VIEW_ADMIN_DASHBOARD);
}

export function canManageUsers(role: Role): boolean {
  return hasPermission(role, Permissions.MANAGE_USERS);
}

export function canAdjustBalance(role: Role): boolean {
  return hasPermission(role, Permissions.ADJUST_BALANCE);
}

export function canConfigureLimits(role: Role): boolean {
  return hasPermission(role, Permissions.CONFIGURE_LIMITS);
}
