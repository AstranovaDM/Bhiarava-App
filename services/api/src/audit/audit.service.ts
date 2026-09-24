import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    organizationId?: string | null;
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metaJson?: Prisma.InputJsonValue;
    ip?: string | null;
  }) {
    if (!input.organizationId) return;
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: input.organizationId,
          actorId: input.actorId ?? undefined,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? undefined,
          metaJson: input.metaJson ?? undefined,
          ip: input.ip ?? undefined,
        },
      });
    } catch {
      // never fail the primary request due to audit
    }
  }
}
