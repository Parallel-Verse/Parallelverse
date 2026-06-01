import type { AuditEvent, AuditLogEntry } from '../types';

const auditKey = 'az-dds-audit-log';

export function readAuditLog(): AuditLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(auditKey) ?? '[]') as AuditLogEntry[];
  } catch {
    return [];
  }
}

export function logAudit(event: AuditEvent, userId: string, details: string) {
  const entry: AuditLogEntry = {
    id: crypto.randomUUID(),
    event,
    userId,
    timestamp: new Date().toISOString(),
    details,
    userAgent: navigator.userAgent,
  };
  localStorage.setItem(auditKey, JSON.stringify([entry, ...readAuditLog()].slice(0, 500)));
  return entry;
}
