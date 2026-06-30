import prisma from './db';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuditLogParams {
  orgId: string;
  actorId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  previousState?: unknown;
  newState?: unknown;
  ipAddress?: string;
}

// ─── Audit Logger ───────────────────────────────────────────────────────────

export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        orgId: params.orgId,
        actorId: params.actorId ?? null,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        previousState: params.previousState
          ? JSON.stringify(params.previousState)
          : null,
        newState: params.newState
          ? JSON.stringify(params.newState)
          : null,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (error) {
    // Audit logging should never crash the main operation.
    // Log to stderr for server-side observability.
    console.error('[AUDIT] Failed to write audit log:', error);
  }
}
