import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth.types';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Soft-void only — never hard-delete financial rows. */
  async voidPayment(actor: AuthPrincipal, paymentId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('void reason required');
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, organizationId: actor.organizationId },
    });
    if (!payment) throw new BadRequestException('payment not found');
    if (payment.voidedAt) throw new BadRequestException('already voided');
    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        voidedAt: new Date(),
        voidReason: reason.trim(),
        reconciliationStatus: 'REVERSED',
      },
    });
    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'payment.void',
      entityType: 'Payment',
      entityId: paymentId,
      metaJson: { reason: reason.trim() },
    });
    return updated;
  }

  async adjustPayment(actor: AuthPrincipal, paymentId: string, input: { reason: string; notes?: string }) {
    if (!input.reason?.trim()) throw new BadRequestException('adjustment reason required');
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, organizationId: actor.organizationId },
    });
    if (!payment) throw new BadRequestException('payment not found');
    if (payment.voidedAt) throw new BadRequestException('cannot adjust voided payment');
    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        reconciliationStatus: 'ADJUSTED',
        notes: [payment.notes, `ADJUST: ${input.reason}`, input.notes].filter(Boolean).join(' | '),
      },
    });
    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'payment.adjust',
      entityType: 'Payment',
      entityId: paymentId,
      metaJson: { reason: input.reason },
    });
    return updated;
  }
}
